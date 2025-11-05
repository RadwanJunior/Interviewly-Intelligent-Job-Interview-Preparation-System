import json
import pytest
from unittest.mock import MagicMock
from app.services.dashboard_service import DashboardService

@pytest.fixture
def mock_supabase():
    return MagicMock()

@pytest.fixture
def service(mock_supabase):
    return DashboardService(mock_supabase)

def test_get_interview_history_completed(service, mock_supabase):
    mock_supabase.get_interview_history.return_value = [
        {
            "id": "1",
            "status": "completed",
            "job_description_id": "job1",
            "created_at": "2025-10-14T10:00:00Z",
            "duration": "30m",
            "score": 90,
            "type": "text"
        }
    ]
    mock_supabase.get_job_description_details.return_value = {
        "title": "Software Engineer",
        "company": "Acme Corp"
    }
    result = service.get_interview_history("user_id")
    assert isinstance(result, list)
    assert result[0]["jobTitle"] == "Software Engineer"
    assert result[0]["company"] == "Acme Corp"
    assert result[0]["score"] == 90

def test_get_interview_history_error(service, mock_supabase):
    mock_supabase.get_interview_history.return_value = {"error": "fail"}
    result = service.get_interview_history("user_id")
    assert result["error"] == "fail"

def test_get_interview_history_skips_incomplete(service, mock_supabase):
    mock_supabase.get_interview_history.return_value = [
        {"id": "1", "status": "in_progress"},
        {"id": "2", "status": "completed", "job_description_id": None, "created_at": None}
    ]
    mock_supabase.get_job_description_details.return_value = {}
    result = service.get_interview_history("user_id")
    assert len(result) == 1
    assert result[0]["id"] == "2"

def test_get_interview_history_empty(service, mock_supabase):
    mock_supabase.get_interview_history.return_value = []
    assert service.get_interview_history("user_id") == []

def test_get_interview_history_job_error(service, mock_supabase):
    mock_supabase.get_interview_history.return_value = [
        {
            "id": "1",
            "status": "completed",
            "job_description_id": "job1",
            "created_at": "2025-10-14T10:00:00Z",
            "duration": "30m",
            "score": 90,
            "type": "text"
        }
    ]
    mock_supabase.get_job_description_details.return_value = {"error": "missing"}
    result = service.get_interview_history("user_id")
    assert result[0]["jobTitle"] == "Untitled Interview"
    assert result[0]["company"] == ""

def test_get_interview_history_exception(service, mock_supabase):
    mock_supabase.get_interview_history.side_effect = Exception("boom")
    result = service.get_interview_history("user_id")
    assert result["error"] == "boom"

def test_get_dashboard_stats(service, mock_supabase):
    # Mock get_interview_history to return two completed interviews with scores
    service.get_interview_history = MagicMock(return_value=[
        {"score": 80, "date": "2025-10-01"},
        {"score": 100, "date": "2025-10-14"}
    ])
    result = service.get_dashboard_stats("user_id")
    assert result["totalInterviews"] == 2
    assert result["averageScore"] == 90
    assert "completedThisMonth" in result


def test_get_dashboard_stats_skips_bad_dates(service, mock_supabase):
    service.get_interview_history = MagicMock(return_value=[
        {"score": 80, "date": "bad-date"},
        {"score": None, "date": None},
    ])
    result = service.get_dashboard_stats("user_id")
    assert result["totalInterviews"] == 2
    assert result["averageScore"] == 80

def test_get_dashboard_stats_no_scores(service, mock_supabase):
    service.get_interview_history = MagicMock(return_value=[{"score": None}])
    result = service.get_dashboard_stats("user_id")
    assert result["averageScore"] == 0

def test_get_dashboard_stats_error(service):
    service.get_interview_history = MagicMock(return_value={"error": "fail"})
    result = service.get_dashboard_stats("user_id")
    assert result["error"] == "fail"

def test_get_dashboard_stats_exception(service):
    service.get_interview_history = MagicMock(side_effect=Exception("boom"))
    result = service.get_dashboard_stats("user_id")
    assert result["error"] == "boom"

def test_get_active_plan_found(service, mock_supabase):
    mock_supabase.get_active_preparation_plan.return_value = {
        "id": "plan1",
        "job_title": "Engineer",
        "company": "Acme",
        "interview_date": "2025-10-20",
        "readiness_level": "High",
        "steps": ["Step1"],
        "completed_steps": 1
    }
    result = service.get_active_plan("user_id")
    assert result["id"] == "plan1"
    assert result["jobTitle"] == "Engineer"
    assert result["company"] == "Acme"
    assert result["completedSteps"] == 1

def test_get_active_plan_none(service, mock_supabase):
    mock_supabase.get_active_preparation_plan.return_value = None
    result = service.get_active_plan("user_id")
    assert result is None

def test_get_active_plan_error(service, mock_supabase):
    mock_supabase.get_active_preparation_plan.return_value = {"error": "db"}
    result = service.get_active_plan("user_id")
    assert result["error"] == "db"

def test_get_active_plan_exception(service, mock_supabase):
    mock_supabase.get_active_preparation_plan.side_effect = Exception("boom")
    result = service.get_active_plan("user_id")
    assert result["error"] == "boom"

def test_create_preparation_plan_success(service, mock_supabase):
    mock_supabase.update_preparation_plan_status_by_user.return_value = None
    mock_supabase.create_preparation_plan.return_value = {"id": "plan2"}
    plan_data = {
        "jobTitle": "Engineer",
        "company": "Acme",
        "interviewDate": "2025-10-21",
        "steps": ["Step1", "Step2"]
    }
    result = service.create_preparation_plan("user_id", plan_data)
    assert result["id"] == "plan2"

def test_create_preparation_plan_error(service, mock_supabase):
    mock_supabase.update_preparation_plan_status_by_user.return_value = None
    mock_supabase.create_preparation_plan.return_value = {"error": "fail"}
    plan_data = {"jobTitle": "Engineer"}
    result = service.create_preparation_plan("user_id", plan_data)
    assert result["error"] == "fail"

def test_create_preparation_plan_exception(service, mock_supabase):
    mock_supabase.update_preparation_plan_status_by_user.side_effect = Exception("boom")
    result = service.create_preparation_plan("user_id", {"jobTitle": "Engineer"})
    assert result["error"] == "boom"

def test_update_preparation_plan_success(service, mock_supabase):
    mock_supabase.check_plan_ownership.return_value = True
    mock_supabase.update_preparation_plan.return_value = {"id": "plan3"}
    update_data = {"jobTitle": "Engineer", "company": "Acme", "steps": ["Step1"], "completedSteps": 1}
    result = service.update_preparation_plan("user_id", "plan3", update_data)
    assert result["id"] == "plan3"

def test_update_preparation_plan_not_owner(service, mock_supabase):
    mock_supabase.check_plan_ownership.return_value = False
    result = service.update_preparation_plan("user_id", "plan4", {})
    assert result["error"] == "Plan not found or not authorized"

def test_update_preparation_plan_error(service, mock_supabase):
    mock_supabase.check_plan_ownership.return_value = True
    mock_supabase.update_preparation_plan.return_value = {"error": "fail"}
    result = service.update_preparation_plan("user_id", "plan5", {})
    assert result["error"] == "fail"

def test_update_preparation_plan_field_mapping(service, mock_supabase):
    mock_supabase.check_plan_ownership.return_value = True
    mock_supabase.update_preparation_plan.return_value = {"id": "planX"}
    update_data = {
        "jobTitle": "Engineer",
        "company": "Acme",
        "interviewDate": "2025-11-01",
        "readinessLevel": 80,
        "steps": [{"title": "Prep"}],
        "completedSteps": 3,
        "status": "active"
    }
    result = service.update_preparation_plan("user_id", "planX", update_data)
    assert result["id"] == "planX"
    args, _ = mock_supabase.update_preparation_plan.call_args
    db_update = args[1]
    assert db_update["job_title"] == "Engineer"
    assert db_update["company"] == "Acme"
    assert db_update["interview_date"] == "2025-11-01"
    assert db_update["readiness_level"] == 80
    assert json.loads(db_update["steps"]) == [{"title": "Prep"}]
    assert db_update["completed_steps"] == 3
    assert db_update["status"] == "active"
    assert "updated_at" in db_update

def test_update_preparation_plan_exception(service, mock_supabase):
    mock_supabase.check_plan_ownership.return_value = True
    mock_supabase.update_preparation_plan.side_effect = Exception("boom")
    result = service.update_preparation_plan("user_id", "plan6", {})
    assert result["error"] == "boom"
