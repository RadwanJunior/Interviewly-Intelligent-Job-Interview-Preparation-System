from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.services.dashboard_service import DashboardService
from app.services.supabase_service import SupabaseService

router = APIRouter()

class PlanStep(BaseModel):
    title: str
    description: Optional[str] = None
    completed: bool = False

class PreparationPlanModel(BaseModel):
    jobTitle: str
    company: Optional[str] = None
    interviewDate: Optional[str] = None
    steps: Optional[List[Dict[str, Any]]] = []

class UpdatePlanModel(BaseModel):
    jobTitle: Optional[str] = None
    company: Optional[str] = None
    interviewDate: Optional[str] = None
    readinessLevel: Optional[int] = None
    steps: Optional[List[Dict[str, Any]]] = None
    completedSteps: Optional[int] = None
    status: Optional[str] = None

@router.get("/stats")
async def get_dashboard_stats(current_user: dict = Depends(SupabaseService.get_current_user)):
    """Get dashboard statistics"""
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    stats = DashboardService.get_dashboard_stats(current_user.id)
    
    if isinstance(stats, dict) and "error" in stats:
        raise HTTPException(status_code=500, detail=stats["error"])
        
    return stats

@router.get("/history")
async def get_interview_history(current_user: dict = Depends(SupabaseService.get_current_user)):
    """Get interview history"""
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    history = DashboardService.get_interview_history(current_user.id)
    
    if isinstance(history, dict) and "error" in history:
        raise HTTPException(status_code=500, detail=history["error"])
        
    return history

@router.get("/active-plan")
async def get_active_plan(response: Response, current_user: dict = Depends(SupabaseService.get_current_user)):
    """Get active preparation plan"""
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    plan = DashboardService.get_active_plan(current_user.id)
    
    if plan is None:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {"message": "No active plan found"}
        
    if isinstance(plan, dict) and "error" in plan:
        raise HTTPException(status_code=500, detail=plan["error"])
        
    return plan

@router.post("/preparation-plan", status_code=status.HTTP_201_CREATED)
async def create_preparation_plan(
    plan: PreparationPlanModel, 
    current_user: dict = Depends(SupabaseService.get_current_user)
):
    """Create a new preparation plan"""
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    result = DashboardService.create_preparation_plan(current_user.id, plan.dict())
    
    if isinstance(result, dict) and "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
        
    return result

@router.put("/preparation-plan/{plan_id}")
async def update_preparation_plan(
    plan_id: str,
    update_data: UpdatePlanModel,
    current_user: dict = Depends(SupabaseService.get_current_user)
):
    """Update a preparation plan"""
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Use the service to update the plan (which now handles ownership verification)
    result = DashboardService.update_preparation_plan(
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