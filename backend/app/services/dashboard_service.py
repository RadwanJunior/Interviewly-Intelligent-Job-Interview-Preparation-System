from datetime import datetime, timezone
import json
import logging
from app.services.supabase_service import SupabaseService

# Constants for status and field names (must be defined at module level)
INTERVIEW_STATUS_COMPLETED = "completed"
PLAN_STATUS_ACTIVE = "active"
PLAN_STATUS_INACTIVE = "inactive"


"""
DashboardService aggregates and presents dashboard data for users, including interview history,
statistics, and preparation plans. It interacts with SupabaseService for data retrieval and updates.
"""

class DashboardService:
    def __init__(self, supabase_service: SupabaseService):
        self.supabase_service = supabase_service

    def get_interview_history(self, user_id: str) -> list:
        """
        Retrieve a list of completed interviews for the user, enriched with job data.
        NOW USES OPTIMIZED SINGLE-QUERY METHOD - NO MORE N+1 PROBLEM!

        Args:
            user_id (str): The user's unique identifier.

        Returns:
            list: List of interview records, or an error dict if retrieval fails.
        """
        try:
            logging.info(f"📊 Fetching interview history for user: {user_id}")
            
            # ✅ Use the new optimized method that fetches everything in ONE query
            interview_data = self.supabase_service.get_interview_history_with_job_details(user_id)
            
            if isinstance(interview_data, dict) and "error" in interview_data:
                logging.error(f"❌ Error from supabase: {interview_data['error']}")
                return interview_data

            if not interview_data:
                logging.info(f"📭 No interviews found for user {user_id}")
                return []

            # Transform and filter the data
            enriched_interviews = []
            for interview in interview_data:
                # Only include completed interviews
                if interview.get("status") != INTERVIEW_STATUS_COMPLETED:
                    continue

                # Format the date (YYYY-MM-DD)
                created_at = interview.get("created_at")
                date = created_at.split("T")[0] if created_at else None

                # Build the simplified interview record
                enriched_interview = {
                    "id": interview["id"],
                    "jobTitle": interview.get("job_title", "Untitled Interview"),
                    "company": interview.get("company", ""),
                    "date": date,
                    "duration": interview.get("duration", "Unknown"),
                    "score": interview.get("score"),
                    "status": interview.get("status", INTERVIEW_STATUS_COMPLETED),
                    "type": interview.get("type", "text"),
                }

                enriched_interviews.append(enriched_interview)

            logging.info(f"✅ Returning {len(enriched_interviews)} completed interviews")
            return enriched_interviews

        except Exception as e:
            logging.error(f"❌ Error getting interview history: {str(e)}", exc_info=True)
            return {"error": str(e)}

    def get_dashboard_stats(self, user_id: str) -> dict:
        """
        Get dashboard statistics for the user.
        Uses the interview history method which is now optimized.

        Args:
            user_id (str): The user's unique identifier.

        Returns:
            dict: Dashboard statistics or error dict.
        """
        try:
            logging.info(f"📊 Calculating dashboard stats for user: {user_id}")
            
            # Get interview history (now uses optimized query)
            interviews = self.get_interview_history(user_id)

            if isinstance(interviews, dict) and "error" in interviews:
                return {"error": interviews["error"]}

            total_interviews = len(interviews)

            # Filter for interviews with scores
            interviews_with_scores = [i for i in interviews if i.get("score") is not None]

            # Calculate average score
            if interviews_with_scores:
                total_score = sum(i["score"] for i in interviews_with_scores)
                average_score = round(total_score / len(interviews_with_scores))
            else:
                average_score = 0

            # Count interviews completed this month
            current_month = datetime.now().month
            current_year = datetime.now().year

            this_month_count = 0
            for interview in interviews:
                if interview.get("date"):
                    try:
                        interview_date = datetime.strptime(interview["date"], "%Y-%m-%d")
                        if interview_date.month == current_month and interview_date.year == current_year:
                            this_month_count += 1
                    except (ValueError, TypeError):
                        pass

            stats = {
                "totalInterviews": total_interviews,
                "averageScore": average_score,
                "completedThisMonth": this_month_count
            }
            
            logging.info(f"✅ Stats calculated: {stats}")
            return stats

        except Exception as e:
            logging.error(f"❌ Error getting dashboard stats: {str(e)}", exc_info=True)
            return {"error": str(e)}

    def get_active_plan(self, user_id: str) -> dict:
        """
        Get the user's active preparation plan, if any.

        Args:
            user_id (str): The user's unique identifier.

        Returns:
            dict or None: Active plan details, or None if not found, or error dict.
        """
        try:
            logging.info(f"📊 Fetching active plan for user: {user_id}")
            
            plan = self.supabase_service.get_active_preparation_plan(user_id)

            if isinstance(plan, dict) and "error" in plan:
                return plan

            if plan:
                # Map interview_plans table fields back to frontend format
                result = {
                    "id": plan["id"],
                    "jobTitle": plan.get("role"),  # role → jobTitle
                    "company": plan.get("company"),
                    "interviewDate": plan.get("interview_date"),
                    "focusAreas": plan.get("focus_areas", []),
                    "researchNotes": plan.get("job_description"),  # job_description → researchNotes
                    "resumeNotes": plan.get("resume_notes"),
                    "otherNotes": plan.get("other_notes"),
                    "steps": json.loads(plan.get("steps", "[]")) if isinstance(plan.get("steps"), str) else plan.get("steps", []),
                    "status": plan.get("status", "pending")
                }
                logging.info(f"✅ Found active plan: {plan['id']}")
                return result
            
            logging.info(f"📭 No active plan found for user {user_id}")
            return None

        except Exception as e:
            logging.error(f"❌ Error getting active plan: {str(e)}", exc_info=True)
            return {"error": str(e)}

    def get_all_user_plans(self, user_id: str) -> list:
        """
        Get all preparation plans for a user, sorted by most recent.

        Args:
            user_id (str): The user's unique identifier.

        Returns:
            list: List of preparation plans or error dict.
        """
        try:
            logging.info(f"📚 Fetching all plans for user: {user_id}")

            plans = self.supabase_service.get_all_user_plans(user_id)

            if isinstance(plans, dict) and "error" in plans:
                return plans

            # Map each plan to frontend format
            formatted_plans = []
            for plan in plans:
                formatted_plan = {
                    "id": plan["id"],
                    "jobTitle": plan.get("role"),
                    "company": plan.get("company"),
                    "interviewDate": plan.get("interview_date"),
                    "status": plan.get("status", "pending"),
                    "createdAt": plan.get("created_at"),
                    "hasSteps": bool(plan.get("steps") and plan.get("steps") != "[]")
                }
                formatted_plans.append(formatted_plan)

            logging.info(f"✅ Found {len(formatted_plans)} plans for user {user_id}")
            return formatted_plans

        except Exception as e:
            logging.error(f"❌ Error getting all plans: {str(e)}", exc_info=True)
            return {"error": str(e)}

    def create_preparation_plan(self, user_id: str, plan_data: dict) -> dict:
        """
        Create a new preparation plan for the user, marking any existing active plans as inactive.

        Args:
            user_id (str): The user's unique identifier.
            plan_data (dict): Data for the new plan.

        Returns:
            dict: The created plan record or error dict.
        """
        try:
            # Mark any existing active plans as inactive
            self.supabase_service.update_preparation_plan_status_by_user(user_id, PLAN_STATUS_INACTIVE)

            # Create new plan record - map to interview_plans table schema
            plan_record = {
                "user_id": user_id,
                "role": plan_data.get("jobTitle"),  # jobTitle → role
                "company": plan_data.get("company"),
                "interview_date": plan_data.get("interviewDate"),
                "focus_areas": plan_data.get("focusAreas", []),  # Array of strings
                "job_description": plan_data.get("researchNotes", ""),  # researchNotes → job_description
                "resume_notes": plan_data.get("resumeNotes"),  # New field
                "other_notes": plan_data.get("otherNotes"),
                "steps": json.dumps(plan_data.get("steps", [])),  # New field
                "status": PLAN_STATUS_ACTIVE,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }

            result = self.supabase_service.create_preparation_plan(plan_record)

            if isinstance(result, dict) and "error" in result:
                return result

            return result

        except Exception as e:
            logging.error(f"❌ Error creating preparation plan: {str(e)}", exc_info=True)
            return {"error": str(e)}

    def update_preparation_plan(self, user_id: str, plan_id: str, update_data: dict) -> dict:
        """
        Update a preparation plan after verifying ownership.

        Args:
            user_id (str): The user's unique identifier.
            plan_id (str): The plan's unique identifier.
            update_data (dict): Fields to update.

        Returns:
            dict: The updated plan record or error dict.
        """
        try:
            # First check if the plan belongs to the user
            if not self.supabase_service.check_plan_ownership(plan_id, user_id):
                return {"error": "Plan not found or not authorized"}

            # Continue with update if ownership is verified
            # Convert camelCase to snake_case for database
            db_update = {}
            if "jobTitle" in update_data:
                db_update["job_title"] = update_data["jobTitle"]
            if "company" in update_data:
                db_update["company"] = update_data["company"]
            if "interviewDate" in update_data:
                db_update["interview_date"] = update_data["interviewDate"]
            if "readinessLevel" in update_data:
                db_update["readiness_level"] = update_data["readinessLevel"]
            if "steps" in update_data:
                db_update["steps"] = json.dumps(update_data["steps"])
            if "completedSteps" in update_data:
                db_update["completed_steps"] = update_data["completedSteps"]
            if "status" in update_data:
                db_update["status"] = update_data["status"]

            db_update["updated_at"] = datetime.now(timezone.utc).isoformat()

            result = self.supabase_service.update_preparation_plan(plan_id, db_update)

            if isinstance(result, dict) and "error" in result:
                return result

            return result

        except Exception as e:
            logging.error(f"❌ Error updating preparation plan: {str(e)}", exc_info=True)
            return {"error": "Internal server error"}