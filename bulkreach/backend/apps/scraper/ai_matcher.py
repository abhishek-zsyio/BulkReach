import json
import logging
import time
from typing import List, Dict, Tuple
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

def evaluate_jobs_batch(
    api_key: str,
    resume_text: str,
    jobs: List[Dict],
    campaign_variables: List[str],
    company_size_filter: str = "any",
    gemini_model: str = "gemini-3.5-flash"
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
- 500+: large enterprise, corporate, major global brand

If you believe the company does not fit this size constraint (e.g., if the company size is requested as 1-10 but the company is a well-known multinational corporate like Google or JPMorgan, or vice-versa), you MUST mark "is_match" as false.
If you do not know the company's size, default to assuming it matches the requested size unless there is a clear contradiction.
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

Respond ONLY with a valid JSON object where the keys are the job IDs (as strings) and values are the evaluation results.
Format:
{{
    "0": {{
        "is_match": true,
        "variables": {{ "var_name": "value" }}
    }},
    "1": {{
        "is_match": false,
        "variables": {{}}
    }}
}}
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
                )
            )
            
            result = json.loads(response.text)
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
                
            raise e

    if last_exc:
        raise last_exc
    return {}

def generate_search_keyword(api_key: str, resume_text: str, gemini_model: str = "gemini-3.5-flash") -> str:
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
        raise e
