# Import google for using google gemini API
from google import genai
# import os to get environment variables
import os
# import json library to handle JSON data
import json
import logging
from datetime import datetime, timedelta

# Use a helper function to get the client to avoid global initialization issues
def get_gemini_client():
    """Initializes and returns the Gemini client."""
    return genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Define the model to use for generating preparation plans
MODEL = "gemini-2.0-flash"

# Define the prompt template for generating interview preparation plans
PROMPT_TEMPLATE = """You are an expert career coach and interview preparation specialist. Based on the candidate's information and interview details, generate a **comprehensive, personalized interview preparation plan**.

**CRITICAL TIMING INFORMATION:**
- Current Date: {current_date}
- Interview Date: {interview_date}
- Days Available: {days_until_interview} days
- Time Frame: {time_description}

**Interview Details:**
- Role: {role}
- Company: {company}
- Focus Areas: {focus_areas}
- Job Description: {job_description}
- Additional Notes: {other_notes}

**IMPORTANT REQUIREMENTS:**
1. **YOU MUST create a plan that fits within {days_until_interview} days** - Do NOT suggest preparation that extends beyond the interview date
2. **Divide the preparation into realistic phases** based on the actual time available:
   - If 1-3 days: Use "Day 1", "Day 2", "Day of Interview"
   - If 4-7 days: Use "Days 1-2", "Days 3-4", "Days 5-6", "Day of Interview"
   - If 1-2 weeks: Use "Week 1: Days 1-3", "Week 1: Days 4-7", "Days Before", "Day of Interview"
   - If 2-4 weeks: Use "Week 1", "Week 2", "Final Week", "Days Before", "Day of Interview"
   - If 4+ weeks: Use "Weeks 1-2", "Weeks 3-4", "Final Week", "Days Before", "Day of Interview"
3. **For each phase, provide 3-5 specific action items** with:
   - Clear task description
   - Estimated time to complete
   - Priority level (High/Medium/Low)
   - Specific resources or tips
4. **Cover all focus areas** mentioned by the candidate
5. **Include practical advice** for the day of the interview
6. **Be realistic** about time commitments - if there's limited time, prioritize HIGH-IMPACT activities only

**Output Format:**
Return the plan as a **valid JSON array** of step objects. Each step should have:
- `"title"`: Brief title for the preparation phase
- `"description"`: What this phase focuses on
- `"timeframe"`: When to do this (e.g., "Week 1", "2-3 days before")
- `"tasks"`: Array of task objects, each with:
  - `"task"`: The specific action to take
  - `"estimatedTime"`: How long it takes (e.g., "2 hours", "30 minutes")
  - `"priority"`: "High", "Medium", or "Low"
  - `"resources"`: Helpful tips or resources

**Example structure:**
```json
[
  {{
    "title": "Technical Skills Review",
    "description": "Deep dive into key technical skills required for the role",
    "timeframe": "Week 1-2",
    "tasks": [
      {{
        "task": "Review Python fundamentals and practice 5 LeetCode problems daily",
        "estimatedTime": "1-2 hours/day",
        "priority": "High",
        "resources": "Focus on arrays, strings, and hash tables. Use LeetCode's top interview questions list."
      }}
    ]
  }}
]
```

**Important:** Output ONLY the JSON array. Do not include explanations, markdown formatting, or additional text.
"""

class PlanGenerationService:
    """Service for generating AI-powered interview preparation plans."""

    def generate_plan(
        self,
        role: str,
        company: str,
        interview_date: str,
        focus_areas: list,
        job_description: str,
        other_notes: str = ""
    ) -> list:
        """
        Generates a personalized interview preparation plan using Google's Gemini model.

        Args:
            role: The job title/role
            company: Company name
            interview_date: Date of the interview (YYYY-MM-DD format)
            focus_areas: List of areas to focus on (e.g., ["System Design", "Algorithms"])
            job_description: Full job description
            other_notes: Any additional notes from the user

        Returns:
            List of preparation steps as dictionaries
        """
        try:
            # Format focus areas as a comma-separated string
            focus_areas_str = ", ".join(focus_areas) if focus_areas else "General interview preparation"

            # Calculate days until interview
            current_date = datetime.now()
            current_date_str = current_date.strftime("%B %d, %Y")  # e.g., "November 29, 2025"

            # Parse interview date
            try:
                if interview_date:
                    interview_dt = datetime.strptime(interview_date, "%Y-%m-%d")
                    interview_date_str = interview_dt.strftime("%B %d, %Y")
                    days_until = (interview_dt - current_date).days

                    # Create time description
                    if days_until < 0:
                        time_description = "Interview has already passed - creating retrospective plan"
                        days_until = 1  # Set to 1 to avoid errors
                    elif days_until == 0:
                        time_description = "Interview is TODAY"
                    elif days_until == 1:
                        time_description = "Interview is TOMORROW"
                    elif days_until <= 3:
                        time_description = f"Very short time frame - {days_until} days"
                    elif days_until <= 7:
                        time_description = f"Short time frame - about {days_until} days (1 week)"
                    elif days_until <= 14:
                        time_description = f"Moderate time frame - about {days_until} days (2 weeks)"
                    elif days_until <= 30:
                        time_description = f"Good time frame - about {days_until} days ({days_until // 7} weeks)"
                    else:
                        time_description = f"Extended time frame - {days_until} days ({days_until // 7} weeks)"
                else:
                    interview_date_str = "Not specified"
                    days_until = 14  # Default to 2 weeks if not provided
                    time_description = "Assuming 2 weeks for preparation"
            except ValueError:
                logging.warning(f"Could not parse interview date: {interview_date}, using defaults")
                interview_date_str = interview_date or "Not specified"
                days_until = 14
                time_description = "Assuming 2 weeks for preparation"

            # Format the prompt with user's data
            final_prompt = PROMPT_TEMPLATE.format(
                current_date=current_date_str,
                interview_date=interview_date_str,
                days_until_interview=days_until,
                time_description=time_description,
                role=role or "Software Engineer",
                company=company or "the company",
                focus_areas=focus_areas_str,
                job_description=job_description or "Not provided",
                other_notes=other_notes or "None"
            )

            logging.info(f"🤖 Generating plan for {role} at {company}")
            logging.info(f"📅 Interview in {days_until} days ({current_date_str} to {interview_date_str})")

            # Get Gemini client
            client = get_gemini_client()

            # Generate plan using Gemini API
            response = client.models.generate_content(
                model=MODEL,
                contents=[{"role": "user", "parts": [{"text": final_prompt}]}],
            )

            # Extract text response
            if response and response.candidates:
                raw_text = response.candidates[0].content.parts[0].text

                # Remove code block markers if present
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]

                # Parse JSON
                plan_steps = json.loads(raw_text.strip())

                logging.info(f"✅ Successfully generated {len(plan_steps)} preparation steps")
                return plan_steps

            logging.error("❌ No response from Gemini API")
            return []

        except json.JSONDecodeError as e:
            logging.error(f"❌ Failed to parse Gemini response as JSON: {str(e)}")
            logging.error(f"Raw response: {raw_text if 'raw_text' in locals() else 'N/A'}")
            return []

        except Exception as e:
            logging.error(f"❌ Error generating preparation plan: {str(e)}", exc_info=True)
            return []
