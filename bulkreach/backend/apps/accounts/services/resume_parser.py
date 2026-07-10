import re

def parse_resume_text_locally(text: str) -> dict:
    """
    Parses raw resume text using heuristics and regex to extract structured sections:
    name, email, phone, summary, skills, experience, and education.
    Runs locally without making any external API calls.
    """
    # Clean text lines
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    # Try to extract contact details
    email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)
    email = email_match.group(0) if email_match else ""
    
    phone_match = re.search(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
    phone = phone_match.group(0) if phone_match else ""

    github_match = re.search(r'(?:https?://)?(?:www\.)?github\.com/[a-zA-Z0-9_.-]+', text, re.IGNORECASE)
    github = github_match.group(0) if github_match else ""

    linkedin_match = re.search(r'(?:https?://)?(?:www\.)?linkedin\.com/in/[a-zA-Z0-9_.-]+', text, re.IGNORECASE)
    linkedin = linkedin_match.group(0) if linkedin_match else ""

    portfolio_match = re.search(r'(?:https?://)?(?:www\.)?([a-zA-Z0-9_.-]+\.(?:netlify\.app|vercel\.app|github\.io|me|com|org|net|dev))', text, re.IGNORECASE)
    portfolio = portfolio_match.group(0) if portfolio_match else ""
    if portfolio and any(noise in portfolio.lower() for noise in ["github.com", "linkedin.com", "email", "tel"]):
        portfolio = ""
    
    # Simple name extraction (first line of resume usually)
    name = lines[0] if lines else ""
    if len(name) > 50: # fallback
        name = ""

    # Section header patterns (case-insensitive)
    sections = {
        "summary": ["summary", "objective", "profile", "professional summary", "about me", "executive summary"],
        "skills": ["skills", "technical skills", "key skills", "core competencies", "technologies", "expertise"],
        "experience": ["experience", "work experience", "employment history", "work history", "professional experience", "career history"],
        "education": ["education", "academic history", "academic background", "education & credentials", "qualifications"]
    }
    
    # Identify which line corresponds to which section
    section_bounds = []
    for idx, line in enumerate(lines):
        # Remove trailing/leading punctuation/spaces
        line_clean = re.sub(r'[^a-zA-Z\s&]', '', line).strip().lower()
        for sec_name, keywords in sections.items():
            if line_clean in keywords:
                section_bounds.append((idx, sec_name))
                break
                
    # Sort section bounds by index
    section_bounds.sort()
    
    # Extract content between section headers
    extracted = {
        "name": name,
        "email": email,
        "phone": phone,
        "github": github,
        "linkedin": linkedin,
        "portfolio": portfolio,
        "summary": "",
        "skills": [],
        "experience": [],
        "education": [],
        "projects": []
    }
    
    # If no headers detected, put everything in summary as fallback
    if not section_bounds:
        extracted["summary"] = "\n".join(lines[:15]) # first 15 lines
        return extracted
        
    for i in range(len(section_bounds)):
        start_idx, sec_name = section_bounds[i]
        end_idx = section_bounds[i+1][0] if i+1 < len(section_bounds) else len(lines)
        
        section_lines = lines[start_idx+1 : end_idx]
        section_text = "\n".join(section_lines).strip()
        
        if sec_name == "summary":
            extracted["summary"] = section_text
        elif sec_name == "skills":
            # Split by commas, semicolons, bullets or newlines
            raw_skills = re.split(r'[,;•▪◦|]|\s-\s', section_text)
            parsed_skills = []
            for skill in raw_skills:
                for sub_skill in skill.split('\n'):
                    s = sub_skill.strip()
                    if s and len(s) < 40 and not any(header in s.lower() for header in ["experience", "education", "summary"]):
                        parsed_skills.append(s)
            extracted["skills"] = sorted(list(set(parsed_skills)))
        elif sec_name == "experience":
            entries = []
            current_entry = {"role": "", "company": "", "duration": "", "description": ""}
            
            for exp_line in section_lines:
                # If the line starts with a bullet point or hyphen, append to current description
                if exp_line.strip().startswith(("-", "•", "▪", "◦", "*")):
                    if current_entry["description"]:
                        current_entry["description"] += "\n" + exp_line
                    else:
                        current_entry["description"] = exp_line
                # If the line is short and has a date pattern, treat as new job entry header
                elif len(exp_line) < 100 and any(yr in exp_line for yr in ["20", "19", "Present"]):
                    if current_entry["role"] or current_entry["company"] or current_entry["description"]:
                        entries.append(current_entry)
                        current_entry = {"role": "", "company": "", "duration": "", "description": ""}
                    
                    parts = re.split(r'\s*[-\–|@,]\s*|\s+at\s+', exp_line)
                    if len(parts) >= 2:
                        current_entry["role"] = parts[0].strip()
                        current_entry["company"] = parts[1].strip()
                        if len(parts) > 2:
                            current_entry["duration"] = parts[-1].strip()
                    else:
                        current_entry["role"] = exp_line
                else:
                    if current_entry["description"]:
                        current_entry["description"] += "\n" + exp_line
                    else:
                        current_entry["description"] = exp_line
                        
            if current_entry["role"] or current_entry["company"] or current_entry["description"]:
                entries.append(current_entry)
                
            if not entries:
                entries.append({
                    "role": "Position Title",
                    "company": "Company Name",
                    "duration": "Dates",
                    "description": section_text
                })
            extracted["experience"] = entries
        elif sec_name == "education":
            edu_entries = []
            for edu_line in section_lines:
                if len(edu_line) < 150:
                    gpa_match = re.search(r'\b(CGPA:\s*\d+(?:\.\d+)?|Grade\s*-\s*[IVX\d]+|GPA\s*\d+(?:\.\d+)?)\b', edu_line, re.IGNORECASE)
                    gpa_val = ""
                    if gpa_match:
                        gpa_val = gpa_match.group(0).strip()
                        edu_line = edu_line.replace(gpa_match.group(0), "").strip()

                    parts = re.split(r'\s*[-\–|@,]\s*|\s+at\s+', edu_line)
                    if len(parts) >= 2:
                        edu_entries.append({
                            "degree": parts[0].strip(),
                            "school": parts[1].strip(),
                            "duration": parts[-1].strip() if len(parts) > 2 else "",
                            "gpa": gpa_val
                        })
                    else:
                        edu_entries.append({
                            "degree": edu_line,
                            "school": "",
                            "duration": "",
                            "gpa": gpa_val
                        })
            if not edu_entries:
                edu_entries.append({
                    "degree": "Degree",
                    "school": "School Name",
                    "duration": "Dates"
                })
            extracted["education"] = edu_entries
            
    return extracted

def compile_structured_data_to_text(data: dict) -> str:
    """
    Compiles structured resume data (summary, skills, experience, education) 
    back into a single plain text string for search indexing and AI matching.
    """
    if not data:
        return ""
    text_parts = []
    if data.get("name"):
        text_parts.append(f"Name: {data['name']}")
    if data.get("email"):
        text_parts.append(f"Email: {data['email']}")
    if data.get("phone"):
        text_parts.append(f"Phone: {data['phone']}")
    if data.get("github"):
        text_parts.append(f"GitHub: {data['github']}")
    if data.get("linkedin"):
        text_parts.append(f"LinkedIn: {data['linkedin']}")
    if data.get("portfolio"):
        text_parts.append(f"Portfolio: {data['portfolio']}")
    if data.get("summary"):
        text_parts.append(f"\nSummary:\n{data['summary']}")
    if data.get("skills"):
        skills_data = data["skills"]
        if isinstance(skills_data, dict):
            skills_lines = []
            for category, items in skills_data.items():
                if isinstance(items, list):
                    skills_lines.append(f"{category}: {', '.join(items)}")
            text_parts.append(f"\nSkills:\n" + "\n".join(skills_lines))
        elif isinstance(skills_data, list):
            text_parts.append(f"\nSkills:\n{', '.join(skills_data)}")
    if data.get("experience"):
        text_parts.append("\nExperience:")
        for exp in data["experience"]:
            text_parts.append(f"- {exp.get('role')} at {exp.get('company')} ({exp.get('duration')})\n  {exp.get('description')}")
    if data.get("education"):
        text_parts.append("\nEducation:")
        for edu in data["education"]:
            gpa_part = f", {edu.get('gpa')}" if edu.get('gpa') else ""
            text_parts.append(f"- {edu.get('degree')}, {edu.get('school')} ({edu.get('duration')}){gpa_part}")
    if data.get("projects"):
        text_parts.append("\nProjects:")
        for proj in data["projects"]:
            text_parts.append(f"- {proj.get('name')} ({proj.get('technologies')})\n  {proj.get('description')}")
    return "\n".join(text_parts)

def parse_resume_text_with_gemini(text: str, api_key: str, model: str = "gemini-3.5-flash") -> dict:
    """
    Calls Gemini API to parse raw resume text into structured JSON format.
    """
    if not api_key or not text.strip():
        return {}
        
    try:
        from google import genai
        from google.genai import types
        import json
        
        client = genai.Client(api_key=api_key)
        prompt = f"""
You are an expert resume parser. Analyze the following raw resume text and extract the candidate's structured profile.
Output EXACTLY a JSON object with this schema:
{{
  "name": "Full Name",
  "email": "Email Address",
  "phone": "Phone Number",
  "github": "GitHub profile URL or username (e.g. Itz-Abhishek-Tiwari)",
  "linkedin": "LinkedIn profile URL or username (e.g. itz-abhishek-tiwari)",
  "portfolio": "Portfolio website URL (e.g. https://itz-abhishek-tiwari.netlify.app/)",
  "summary": "Professional Summary / Executive summary",
  "skills": {{
    "Languages": ["JavaScript", "Python", ...],
    "Framework & Library": ["React Native", "Redux", ...],
    "Miscellaneous Technology": ["Git", "Docker", ...]
  }},
  "experience": [
    {{
      "role": "Job Title / Role",
      "company": "Company Name",
      "duration": "Duration (e.g. Jan 2022 - Present)",
      "description": "Key achievements and responsibilities (bullet points or text)"
    }}
  ],
  "education": [
    {{
      "degree": "Degree / Field of study",
      "school": "Institution Name",
      "duration": "Duration (e.g. 2018 - 2022)",
      "gpa": "GPA, Grade, or CGPA (optional, e.g. CGPA: 8.07 or Grade - XII)"
    }}
  ],
  "projects": [
    {{
      "name": "Project Name",
      "technologies": "Technologies used (e.g. React Native, Redux, JavaScript)",
      "link": "Project URL (optional, e.g. https://play.google.com/store/apps/details?id=com.mtp.organiser)",
      "description": "Project achievements/details (bullet points or text)"
    }}
  ]
}}

Ensure the output is clean, valid JSON. Do not wrap it in markdown code blocks like ```json. Just return the raw JSON object.

Resume Text:
{text}
"""
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        
        return json.loads(response.text)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error("Gemini API error during resume parsing: %s", e)
        raise e
