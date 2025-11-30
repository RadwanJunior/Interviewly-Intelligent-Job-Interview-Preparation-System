# =============================
# dashboard.py - FastAPI router for dashboard-related endpoints
# Handles statistics, interview history, and preparation plans for users.
# =============================

from fastapi import APIRouter, Depends, HTTPException, Response, status, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import json
import logging
from app.services.dashboard_service import DashboardService
from app.services.supabase_service import supabase_service
from app.services.plan_generation_service import PlanGenerationService


# Create a router for all dashboard-related endpoints
router = APIRouter()

# Instantiate the dashboard service, passing in the supabase service for DB operations
dashboard_service = DashboardService(supabase_service)

# Instantiate the plan generation service
plan_generation_service = PlanGenerationService()

class PreparationPlanModel(BaseModel):
    """Pydantic model for creating a new preparation plan."""
    jobTitle: str
    company: Optional[str] = None
    interviewDate: Optional[str] = None
    steps: Optional[List[Dict[str, Any]]] = []
    focusAreas: Optional[List[str]] = []
    researchNotes: Optional[str] = None
    resumeNotes: Optional[str] = None
    otherNotes: Optional[str] = None

class UpdatePlanModel(BaseModel):
    """Pydantic model for updating an existing preparation plan."""
    jobTitle: Optional[str] = None
    company: Optional[str] = None
    interviewDate: Optional[str] = None
    readinessLevel: Optional[int] = None
    steps: Optional[List[Dict[str, Any]]] = None
    completedSteps: Optional[int] = None
    status: Optional[str] = None

@router.get("/stats")
async def get_dashboard_stats(current_user: dict = Depends(supabase_service.get_current_user)):
    """Get dashboard statistics"""
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    stats = dashboard_service.get_dashboard_stats(current_user.id)
    
    if isinstance(stats, dict) and "error" in stats:
        raise HTTPException(status_code=500, detail=stats["error"])
        
    return stats

@router.get("/history")
async def get_interview_history(current_user: dict = Depends(supabase_service.get_current_user)):
    """Get interview history"""
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    history = dashboard_service.get_interview_history(current_user.id)
    
    if isinstance(history, dict) and "error" in history:
        raise HTTPException(status_code=500, detail=history["error"])
        
    return history

@router.get("/active-plan")
async def get_active_plan(response: Response, current_user: dict = Depends(supabase_service.get_current_user)):
    """Get active preparation plan"""
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="Unauthorized")

    plan = dashboard_service.get_active_plan(current_user.id)

    if plan is None:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {"message": "No active plan found"}

    if isinstance(plan, dict) and "error" in plan:
        raise HTTPException(status_code=500, detail=plan["error"])

    return plan

@router.get("/plans")
async def get_all_plans(current_user: dict = Depends(supabase_service.get_current_user)):
    """Get all preparation plans for the current user"""
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="Unauthorized")

    plans = dashboard_service.get_all_user_plans(current_user.id)

    if isinstance(plans, dict) and "error" in plans:
        raise HTTPException(status_code=500, detail=plans["error"])

    return plans

@router.post("/preparation-plan", status_code=status.HTTP_201_CREATED)
async def create_preparation_plan(
    plan: PreparationPlanModel, 
    current_user: dict = Depends(supabase_service.get_current_user)
):
    """Create a new preparation plan"""
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    result = dashboard_service.create_preparation_plan(current_user.id, plan.dict())
    
    if isinstance(result, dict) and "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
        
    return result

@router.put("/preparation-plan/{plan_id}")
async def update_preparation_plan(
    plan_id: str,
    update_data: UpdatePlanModel,
    current_user: dict = Depends(supabase_service.get_current_user)
):
    """Update a preparation plan"""
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Use the service to update the plan (which now handles ownership verification)
    result = dashboard_service.update_preparation_plan(
        current_user.id, 
        plan_id, 
        update_data.dict(exclude_unset=True)
    )
    
    if isinstance(result, dict) and "error" in result:
        if result["error"] == "Plan not found or not authorized":
            raise HTTPException(status_code=404, detail=result["error"])
        else:
            raise HTTPException(status_code=500, detail=result["error"])

    return result


# Background task to generate the preparation plan
async def generate_plan_task(plan_id: str):
    """Background task to generate AI-powered preparation plan steps."""
    try:
        logging.info(f"🚀 Starting plan generation for plan_id: {plan_id}")

        # Update status to "generating"
        supabase_service.update_preparation_plan(plan_id, {"status": "generating"})

        # Fetch the plan data from database
        plan_response = supabase_service.client.table("interview_plans").select("*").eq("id", plan_id).single().execute()

        if not plan_response.data:
            logging.error(f"❌ Plan {plan_id} not found in database")
            supabase_service.update_preparation_plan(plan_id, {"status": "error"})
            return

        plan_data = plan_response.data

        # Generate the plan using AI
        steps = plan_generation_service.generate_plan(
            role=plan_data.get("role", ""),
            company=plan_data.get("company", ""),
            interview_date=plan_data.get("interview_date", ""),
            focus_areas=plan_data.get("focus_areas", []),
            job_description=plan_data.get("job_description", ""),
            other_notes=plan_data.get("other_notes", "")
        )

        if not steps:
            logging.error(f"❌ Failed to generate steps for plan {plan_id}")
            supabase_service.update_preparation_plan(plan_id, {"status": "error"})
            return

        # Save the generated steps to database
        update_result = supabase_service.update_preparation_plan(
            plan_id,
            {
                "steps": json.dumps(steps),
                "status": "ready"
            }
        )

        if isinstance(update_result, dict) and "error" in update_result:
            logging.error(f"❌ Failed to save generated steps: {update_result['error']}")
            supabase_service.update_preparation_plan(plan_id, {"status": "error"})
        else:
            logging.info(f"✅ Successfully generated and saved {len(steps)} steps for plan {plan_id}")

    except Exception as e:
        logging.error(f"❌ Error in generate_plan_task: {str(e)}", exc_info=True)
        supabase_service.update_preparation_plan(plan_id, {"status": "error"})


@router.post("/preparation-plan/{plan_id}/generate")
async def trigger_plan_generation(
    plan_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(supabase_service.get_current_user)
):
    """Trigger AI generation of preparation plan steps."""
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Verify plan ownership
    if not supabase_service.check_plan_ownership(plan_id, current_user.id):
        raise HTTPException(status_code=404, detail="Plan not found or not authorized")

    # Add background task to generate the plan
    background_tasks.add_task(generate_plan_task, plan_id)

    logging.info(f"📝 Plan generation queued for plan_id: {plan_id}")

    return {
        "message": "Plan generation started",
        "plan_id": plan_id,
        "status": "generating"
    }


@router.get("/preparation-plan/{plan_id}/status")
async def get_plan_status(
    plan_id: str,
    current_user: dict = Depends(supabase_service.get_current_user)
):
    """Get the current status of a preparation plan."""
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Verify plan ownership
    if not supabase_service.check_plan_ownership(plan_id, current_user.id):
        raise HTTPException(status_code=404, detail="Plan not found or not authorized")

    # Get plan status from database
    plan_response = supabase_service.client.table("interview_plans").select("status").eq("id", plan_id).single().execute()

    if not plan_response.data:
        raise HTTPException(status_code=404, detail="Plan not found")

    return {
        "plan_id": plan_id,
        "status": plan_response.data.get("status", "unknown")
    }


@router.get("/preparation-plan/{plan_id}")
async def get_preparation_plan(
    plan_id: str,
    current_user: dict = Depends(supabase_service.get_current_user)
):
    """Get a preparation plan by ID with all details including generated steps."""
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Verify plan ownership
    if not supabase_service.check_plan_ownership(plan_id, current_user.id):
        raise HTTPException(status_code=404, detail="Plan not found or not authorized")

    # Fetch full plan data
    plan_response = supabase_service.client.table("interview_plans").select("*").eq("id", plan_id).single().execute()

    if not plan_response.data:
        raise HTTPException(status_code=404, detail="Plan not found")

    plan_data = plan_response.data

    # Map database fields to frontend format
    result = {
        "id": plan_data["id"],
        "jobTitle": plan_data.get("role"),
        "company": plan_data.get("company"),
        "interviewDate": plan_data.get("interview_date"),
        "focusAreas": plan_data.get("focus_areas", []),
        "researchNotes": plan_data.get("job_description"),
        "resumeNotes": plan_data.get("resume_notes"),
        "otherNotes": plan_data.get("other_notes"),
        "steps": json.loads(plan_data.get("steps", "[]")) if isinstance(plan_data.get("steps"), str) else plan_data.get("steps", []),
        "status": plan_data.get("status", "pending"),
        "createdAt": plan_data.get("created_at")
    }

    return result


@router.delete("/preparation-plan/{plan_id}")
async def delete_preparation_plan(
    plan_id: str,
    current_user: dict = Depends(supabase_service.get_current_user)
):
    """Delete a preparation plan by ID."""
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Verify plan ownership
    if not supabase_service.check_plan_ownership(plan_id, current_user.id):
        raise HTTPException(status_code=404, detail="Plan not found or not authorized")

    try:
        # Delete the plan
        response = supabase_service.client.table("interview_plans").delete().eq("id", plan_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Plan not found")

        logging.info(f"✅ Deleted plan {plan_id} for user {current_user.id}")

        return {"message": "Plan deleted successfully", "id": plan_id}

    except Exception as e:
        logging.error(f"❌ Error deleting plan: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete plan")


@router.patch("/preparation-plan/{plan_id}/task-completion")
async def update_task_completion(
    plan_id: str,
    task_update: dict,
    current_user: dict = Depends(supabase_service.get_current_user)
):
    """Update the completion status of a specific task in a preparation plan."""
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Verify plan ownership
    if not supabase_service.check_plan_ownership(plan_id, current_user.id):
        raise HTTPException(status_code=404, detail="Plan not found or not authorized")

    try:
        step_index = task_update.get("stepIndex")
        task_index = task_update.get("taskIndex")
        completed = task_update.get("completed", False)

        if step_index is None or task_index is None:
            raise HTTPException(status_code=400, detail="stepIndex and taskIndex are required")

        # Fetch the current plan
        plan_response = supabase_service.client.table("interview_plans").select("steps").eq("id", plan_id).single().execute()

        if not plan_response.data:
            raise HTTPException(status_code=404, detail="Plan not found")

        # Parse steps
        steps = json.loads(plan_response.data.get("steps", "[]")) if isinstance(plan_response.data.get("steps"), str) else plan_response.data.get("steps", [])

        # Update the specific task
        if step_index < len(steps) and task_index < len(steps[step_index].get("tasks", [])):
            steps[step_index]["tasks"][task_index]["completed"] = completed
        else:
            raise HTTPException(status_code=400, detail="Invalid step or task index")

        # Save back to database
        update_result = supabase_service.update_preparation_plan(
            plan_id,
            {"steps": json.dumps(steps)}
        )

        if isinstance(update_result, dict) and "error" in update_result:
            raise HTTPException(status_code=500, detail=update_result["error"])

        logging.info(f"✅ Updated task completion for plan {plan_id}, step {step_index}, task {task_index}")

        return {"message": "Task completion updated", "completed": completed}

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"❌ Error updating task completion: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update task completion")