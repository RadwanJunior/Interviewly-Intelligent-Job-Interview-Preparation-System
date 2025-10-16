# Import google for using google gemini API
from google import genai 
# import os to get environment variables. OS library allows us to interact with underlying operating system
import os
# import json library to handle JSON data
import json

# Use a helper function to get the client to avoid global initialization issues
def get_gemini_client():
    """Initializes and returns the Gemini client."""
    return genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Define the model to use for generating interview questions. In this case the gemini-2.0-flash model.
# This model is optimized for generating high speed, high quality, cost effective text completions.
MODEL = "gemini-2.0-flash"

# Define the prompt template for generating interview questions.
# The prompt acheives a variety of goals:
# 1. Role specification: The model is told to act as an expert HR interviewer and career coach
# 2. Tone and style: The questions should sound natural and meaningful
# 3. Structure and content: The interview should be divided into three sections - behavioral, technical, situational
# 4. Output format: The questions should be output in strictly valid JSON format as an array. With a question field.
# 5. Contextual information: The prompt includes placeholders for a resume, job title, job description, company name, and location
PROMPT_TEMPLATE = """You are an expert HR interviewer and career coach with a knack for asking insightful, human-sounding questions. Based on the candidate's resume, job details, and company context, generate a **concise and structured** list of **10-12** interview questions designed for a **30-45 minute** interview. Ensure the questions sound natural and engaging, as if you were speaking directly to the candidate. Also that each question is complete, clear, and written in a single sentence without any placeholders, bracketed text, or multiple parts.
When generating technical questions, do not use generic phrases such as "based on their skills" or "depending on their experience." Instead, incorporate specific details from the resume and job description—such as programming languages, frameworks, or project examples—to create tailored questions.
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
# Defines an InterviewService class to encapsulate the interview question generation logic
class InterviewService:
    # Method to generate interview questions based on resume and job details
    def generate_questions(self, resume_text: str, job_title: str, job_description: str, company_name: str, location: str, enhanced_prompt: str = None) -> list:
        """
        Generates interview questions using Google's Gemini model.
        Can be enhanced with a RAG-generated prompt.
        """
        # First, format the base prompt with the required variables
        final_prompt = PROMPT_TEMPLATE.format(
            resume=resume_text,
            job_title=job_title,
            job_description=job_description,
            company_name=company_name,
            location=location
        )

        # If an enhanced prompt exists, prepend it. This avoids the KeyError.
        if enhanced_prompt:
            final_prompt = f"Enhanced Context:\n{enhanced_prompt}\n\n{final_prompt}"

        # # Count tokens using the new client method.
        # # Can be printed if neeeded for debugging or monitoring token usage
        # total_tokens = client.models.count_tokens(
        #     model="gemini-2.0-flash", contents=prompt
        # )

        try:
            # Get client using helper function to avoid initialization issues
            client = get_gemini_client()
            
            # Generate questions using gemini API
            # The model will return a JSON array of questions as a string
            response = client.models.generate_content(
                model=MODEL,
                contents=[{"role": "user", "parts": [{"text": final_prompt}]}],
            )

            # Extract text response from the first candidate
            if response and response.candidates:
                raw_text = response.candidates[0].content.parts[0].text
                # Remove code block markers if present (sometimes Gemini wraps JSON in markdown)
                if raw_text.startswith("```json"):
                    # Remove the opening code block marker
                    raw_text = raw_text[7:]
                if raw_text.endswith("```"):
                    # Remove the closing code block marker
                    raw_text = raw_text[:-3]
                # Parse the JSON string into a Python list of questions
                questions = json.loads(raw_text)
                return questions
        except Exception as e:
            # Log the error and return an empty list if anything goes wrong
            print("Error generating questions:", str(e))
            return []

