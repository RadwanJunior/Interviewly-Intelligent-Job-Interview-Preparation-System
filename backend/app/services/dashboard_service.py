from datetime import datetime, timezone
import json
from app.services.supabase_service import SupabaseService

class DashboardService:
    def __init__(self, supabase_service: SupabaseService):
        self.supabase_service = supabase_service

    def get_interview_history(self, user_id: str):
        """Get interview history with joined feedback data"""
        try:
            # Get all interviews for the user using SupabaseService
            interview_data = self.supabase_service.get_interview_history(user_id)
            if isinstance(interview_data, dict) and "error" in interview_data:
                return interview_data
                
            if not interview_data:
                return []
                
            # Enrich interview data with job and feedback information
            enriched_interviews = []
            for interview in interview_data:
                # Skip interviews that aren't completed
                if interview.get("status") != "completed":
                    continue
                
                # Get job description details
                job_id = interview.get("job_description_id")
                job_data = self.supabase_service.get_job_description_details(job_id)
                
                if isinstance(job_data, dict) and "error" in job_data:
                    job_data = {}
                
                # Format the date
                created_at = interview.get("created_at")
                date = created_at.split("T")[0] if created_at else None
                
                # Build the simplified interview record for the dashboard
                enriched_interview = {
                    "id": interview["id"],
                    "jobTitle": job_data.get("title", "Untitled Interview"),
                    "company": job_data.get("company", ""),
                    "date": date,
                    "duration": interview.get("duration", "Unknown"),
                    "score": interview.get("score"),
                    "status": interview.get("status", "completed"),
                    "type": interview.get("type", "text"),
                }
                
                enriched_interviews.append(enriched_interview)
                
            return enriched_interviews
                
        except Exception as e:
            print(f"Error getting interview history: {str(e)}")
            return {"error": str(e)}

    def get_dashboard_stats(self, user_id: str):
        """Get dashboard statistics"""
        try:
            interviews = self.get_interview_history(user_id)
            
            if isinstance(interviews, dict) and "error" in interviews:
                return {"error": interviews["error"]}
                
            total_interviews = len(interviews)
            
            # Filter for interviews that actually have a score to calculate the average correctly
            interviews_with_scores = [i for i in interviews if i.get("score") is not None]
            
            # Calculate average score based only on interviews that have a score
            if interviews_with_scores:
                total_score = sum(i["score"] for i in interviews_with_scores)
                average_score = round(total_score / len(interviews_with_scores))
            else:
                average_score = 0
                
            # Count interviews this month
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
                        # Skip if date parsing fails
                        pass
            
            return {
                "totalInterviews": total_interviews,
                "averageScore": average_score,
                "completedThisMonth": this_month_count
            }
            
        except Exception as e:
            print(f"Error getting dashboard stats: {str(e)}")
            return {"error": str(e)}

    def get_active_plan(self, user_id: str):
        """Get active preparation plan"""
        try:
            plan = self.supabase_service.get_active_preparation_plan(user_id)
            
            if isinstance(plan, dict) and "error" in plan:
                return plan
                
            if plan:
                return {
                    "id": plan["id"],
                    "jobTitle": plan["job_title"],
                    "company": plan["company"],
                    "interviewDate": plan["interview_date"],
                    "readinessLevel": plan["readiness_level"],
                    "steps": plan.get("steps", []),
                    "completedSteps": plan.get("completed_steps", 0)
                }
            return None
            
        except Exception as e:
            print(f"Error getting active plan: {str(e)}")
            return {"error": str(e)}

    def create_preparation_plan(self, user_id: str, plan_data: dict):
        """Create a new preparation plan"""
        try:
            # Mark any existing active plans as inactive
            self.supabase_service.update_preparation_plan_status_by_user(user_id, "inactive")
            
            # Create new plan
            plan_record = {
                "user_id": user_id,
                "job_title": plan_data.get("jobTitle"),
                "company": plan_data.get("company"),
                "interview_date": plan_data.get("interviewDate"),
                "steps": json.dumps(plan_data.get("steps", [])),
                "status": "active",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            result = self.supabase_service.create_preparation_plan(plan_record)
            
            if isinstance(result, dict) and "error" in result:
                return result
                
            return result
            
        except Exception as e:
            print(f"Error creating preparation plan: {str(e)}")
            return {"error": str(e)}

    def update_preparation_plan(self, user_id: str, plan_id: str, update_data: dict):
        """Update a preparation plan after verifying ownership"""
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
            print(f"Error updating preparation plan: {str(e)}")
            return {"error": str(e)}