import json
import logging
import time
from typing import List, Dict, Tuple
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

class VariableEntry(BaseModel):
    name: str = Field(description="The name of the campaign variable, e.g. recipient_first_name, company_custom_fact")
    value: str = Field(description="The extracted or generated value for this variable")

class JobEvaluation(BaseModel):
    job_id: str = Field(description="The index/ID of the job card evaluated, matching the job ID from the list, e.g. '0', '1'")
    is_match: bool = Field(description="True if the job is a reasonable match for the candidate based on their resume and constraints")
    variables: list[VariableEntry] = Field(description="Extracted variables for the outreach email")

class BatchEvaluationResult(BaseModel):
    evaluations: list[JobEvaluation]

def evaluate_jobs_batch(
    api_key: str,
    resume_text: str,
    jobs: List[Dict],
    campaign_variables: List[str],
    company_size_filter: str = "any",
    gemini_model: str = "gemini-2.5-flash"
) -> Dict[str, Dict]:
    """
    Evaluates a list of jobs against a resume using a single Gemini API call.
    Returns a dictionary mapping job index (as string) to {"is_match": bool, "variables": dict}.
    """
    if not api_key:
        logger.warning("No Gemini API key provided.")
        return {}

    if not resume_text or not jobs:
        return {}

    client = genai.Client(api_key=api_key)
    
    # Format jobs for the prompt
    jobs_list_text = ""
    for idx, job in enumerate(jobs):
        jobs_list_text += f"[{idx}] Title: {job.get('job_title', 'Unknown')} | Company: {job.get('company', 'Unknown')}\n"

    company_size_instruction = ""
    if company_size_filter and company_size_filter != "any":
        company_size_instruction = f"""
CRITICAL CONSTRAINT: You MUST only match jobs where the company size falls within the requested size: "{company_size_filter}".
Choose from these sizes:
- 1-10: tiny startup, seed-stage, founder-led
- 11-50: early stage, post-series A, small team
- 51-200: mid-size growing startup or small enterprise
- 201-500: medium enterprise, scale-up
- 501-1000: large scale-up or mid-size corporate
- 1000+: very large corporate, multinational, major global brand

If you believe the company does not fit this size constraint (e.g., if the company size is requested as 1-10 but the company is a well-known multinational corporate like Google or JPMorgan, or vice-versa), you MUST mark "is_match" as false.
If you do not know the company's size, default to assuming it matches the requested size unless there is a contradiction.
"""

    prompt = f"""
You are an expert AI recruiter matching a candidate to jobs.

Candidate Resume:
{resume_text}

Here is a list of jobs (ID] Title | Company):
{jobs_list_text}

{company_size_instruction}

Task 1: Evaluate Match
For each job ID, determine if the job is a reasonable match for the candidate based on their resume. It doesn't have to be a perfect 100% match, just a reasonable fit.

Task 2: Extract Variables
If it is a match, extract or generate the following variables for an outreach email: {', '.join(campaign_variables)}
"""

    max_retries = 3
    base_delay = 5  # seconds
    
    last_exc = None
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=BatchEvaluationResult,
                )
            )
            
            parsed = json.loads(response.text)
            result = {}
            for item in parsed.get("evaluations", []):
                # Convert the variables list of entries back to a flat dictionary
                var_dict = {}
                for v in item.get("variables", []):
                    var_dict[v.get("name")] = v.get("value", "")
                result[item.get("job_id")] = {
                    "is_match": item.get("is_match", False),
                    "variables": var_dict
                }
            return result

        except Exception as e:
            logger.error(f"Gemini API error during job evaluation: {e}")
            last_exc = e
            err_str = str(e).lower()
            if "429" in err_str or "resource_exhausted" in err_str or "quota" in err_str:
                wait_time = base_delay * (2 ** attempt)
                logger.warning(f"Gemini API rate limit hit (Attempt {attempt + 1}/{max_retries}). Waiting {wait_time}s...")
                time.sleep(wait_time)
                continue
                
            if "key" in err_str or "invalid" in err_str or "400" in err_str or "403" in err_str:
                raise ValueError("Invalid Gemini API Key or project configuration. Please check your settings.")
            elif "503" in err_str or "unavailable" in err_str:
                raise ValueError("Gemini API is temporarily experiencing high demand. Please try again.")
            raise ValueError(f"Gemini API error during job evaluation: {e}")

    if last_exc:
        err_str = str(last_exc).lower()
        if "429" in err_str or "resource_exhausted" in err_str or "quota" in err_str:
            raise ValueError("Gemini API quota exceeded or rate limit reached. Please wait a moment or check your billing settings.")
        raise ValueError(f"Gemini API error during job evaluation: {last_exc}")
    return {}

def generate_search_keyword(api_key: str, resume_text: str, gemini_model: str = "gemini-2.5-flash") -> str:
    """
    Generates a single broad search keyword (e.g. 'Frontend Developer') from a resume.
    """
    if not api_key or not resume_text:
        return "Software Engineer" # fallback
        
    try:
        client = genai.Client(api_key=api_key)
        prompt = f"""
        Based on the following resume, generate a SINGLE short job search keyword/title that best fits the candidate.
        For example: "Frontend Developer", "Data Scientist", "Marketing Manager".
        DO NOT include any other text, punctuation, or explanation. Just the keyword.

        Resume:
        {resume_text}
        """
        response = client.models.generate_content(
            model=gemini_model,
            contents=prompt,
        )
        return response.text.strip().strip('"').strip("'")
    except Exception as e:
        logger.error(f"Gemini API error generating keyword: {e}")
        err_str = str(e).lower()
        if "429" in err_str or "resource_exhausted" in err_str or "quota" in err_str:
            raise ValueError("Gemini API quota exceeded or rate limit reached. Please wait a moment or check your billing settings.")
        elif "503" in err_str or "unavailable" in err_str:
            raise ValueError("Gemini API is temporarily experiencing high demand. Please try again.")
        elif "key" in err_str or "invalid" in err_str or "400" in err_str or "403" in err_str:
            raise ValueError("Invalid Gemini API Key or project configuration. Please check your settings.")
        raise ValueError(f"Gemini API error generating search keyword: {e}")

