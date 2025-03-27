from google import genai 
import os
import json

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

MODEL = "gemini-2.0-flash"

PROMPT_TEMPLATE = """You are an expert HR interviewer and career coach. Based on the candidate's resume, job details, and company context, generate a structured list of interview questions that assess:

1. **Behavioral and General Fit Questions** (first): 
   - Start with common behavioral interview questions such as "Tell me about yourself."
   - Include questions about teamwork, leadership, problem-solving, and career motivation.
   - Ensure questions assess soft skills, communication, and company culture fit.

2. **Technical Questions** (second): 
   - Ask in-depth technical questions based on the job description and candidate’s experience.
   - Include problem-solving and debugging questions related to key technologies or skills.

3. **Situational & Case-Based Questions** (last): 
   - Ask scenario-based questions that evaluate decision-making and real-world problem-solving.
   - Present hypothetical challenges related to the job role and industry.

Please output the questions in **JSON format** as an array, where each element is an object with a `"question"` field. Do **not** include additional text, explanations, or code block formatting. **Strictly return only valid JSON.**

{{
  "resume": "{resume}",
  "job_title": "{job_title}",
  "job_description": "{job_description}",
  "company_name": "{company_name}",
  "location": "{location}"
}}

"""

class InterviewService:
    @staticmethod
    def generate_questions(resume_text: str, job_title: str, job_description: str, company_name: str, location: str) -> list:
        """
        Generates interview questions based on the resume text, job title, job description, company name, and location.
        """
        # Format the prompt with the provided variables
        prompt = PROMPT_TEMPLATE.format(
            resume=resume_text,
            job_title=job_title,
            job_description=job_description,
            company_name=company_name,
            location=location
        )

        # Count tokens using the new client method.
        total_tokens = client.models.count_tokens(
            model="gemini-2.0-flash", contents=prompt
        )

        try:
            # Generate questions
            response = client.models.generate_content(
                model=MODEL,
                contents=[{"role": "user", "parts": [{"text": prompt}]}],
                # config={"max_tokens": 700, "top_p": 0.90, "temperature": 0.8},
            )

            # Extract text response
            if response and response.candidates:
                raw_text = response.candidates[0].content.parts[0].text
                # remove code bloack markers
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]
                
                questions = json.loads(raw_text)
                return questions
        except Exception as e:
            print("Error generating questions:", str(e))
            return []

