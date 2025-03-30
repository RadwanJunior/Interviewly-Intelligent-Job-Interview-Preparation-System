from google import genai 
import os
import json

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

MODEL = "gemini-2.0-flash"

PROMPT_TEMPLATE = """You are an expert HR interviewer and career coach with a knack for asking insightful, human-sounding questions. Based on the candidate's resume, job details, and company context, generate a **concise and structured** list of **10-12** interview questions designed for a **30-45 minute** interview. Ensure the questions sound natural and engaging, as if you were speaking directly to the candidate. Also that each question is complete, clear, and written in a single sentence without any placeholders, bracketed text, or multiple parts.

The interview should be structured as follows:
- **Behavioral & General Fit Questions (3-4 questions, 10-15 minutes)-First**  
  - Start with “Tell me about yourself” and other core behavioral questions.  
  - Assess teamwork, leadership, problem-solving, and career motivation.  
  - Ensure relevance to company culture and work environment.  

- **Technical Questions (4-5 questions, 15-20 minutes)-second**  
  - Cover key technical skills related to the job description.  
  - Avoid redundant questions; prioritize depth over breadth.  
  - If the job is highly technical, include at least one coding or debugging question.  

- **Situational & Case-Based Questions (3-4 questions, 10-15 minutes)-last**  
  - Focus on real-world scenarios and decision-making.  
  - Use hypothetical challenges related to the role and industry.  
  - Ensure practical application of skills.  

Please **strictly** output the questions in **valid JSON format** as an array, where each element is an object with a `"question"` field. **Do not include additional text, explanations, or formatting.** 

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

