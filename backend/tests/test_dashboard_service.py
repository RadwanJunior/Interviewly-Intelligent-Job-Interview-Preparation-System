import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone
import json
from app.services.dashboard_service import DashboardService

class TestDashboardService:
    """Test suite for the DashboardService class."""
    
    @pytest.fixture
    def mock_supabase_service(self):
        """Create a mock Supabase service."""
        mock = MagicMock()
        
        # Setup common mock responses for interview history
        mock.get_interview_history.return_value = [
            {
                "id": "interview-1",
                "job_description_id": "job-1",
                "created_at": "2023-05-15T10:30:00Z",
                "duration": "25 minutes",
                "score": 85,
                "status": "completed",
                "type": "text"
            },
            {
                "id": "interview-2",
                "job_description_id": "job-2",
                "created_at": "2023-06-10T14:45:00Z",
                "duration": "30 minutes",
                "score": 92,
                "status": "completed",
                "type": "text"
            }
        ]
        
        # Setup job description details
        mock.get_job_description_details.side_effect = lambda job_id: {
            "job-1": {"title": "Software Engineer", "company": "Tech Corp"},
            "job-2": {"title": "Data Scientist", "company": "Data Inc"}
        }.get(job_id, {})
        
        # Setup active preparation plan
        mock.get_active_preparation_plan.return_value = {
            "id": "plan-1",
            "job_title": "Software Engineer",
            "company": "Tech Corp",
            "interview_date": "2023-07-15",
            "readiness_level": 3,
            "steps": json.dumps(["Research company", "Practice questions"]),
            "completed_steps": 1
        }
        
        # Setup preparation plan creation
        mock.create_preparation_plan.return_value = {
            "id": "new-plan-id",
            "job_title": "Product Manager",
            "company": "Product Co"
        }
        
        # Setup plan ownership check
        mock.check_plan_ownership.return_value = True
        
        # Setup plan update
        mock.update_preparation_plan.return_value = {
            "id": "plan-1",
            "job_title": "Updated Job Title",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        return mock
    
    @pytest.fixture
    def service(self, mock_supabase_service):
        """Create a DashboardService instance with mock dependencies."""
        return DashboardService(supabase_service=mock_supabase_service)
    
    def test_get_interview_history_success(self, service, mock_supabase_service):
        """Test successful retrieval of interview history."""
        # Setup
        user_id = "test-user-id"
        
        # Execute
        result = service.get_interview_history(user_id)
        
        # Verify
        assert len(result) == 2
        assert result[0]["id"] == "interview-1"
        assert result[0]["jobTitle"] == "Software Engineer"
        assert result[0]["company"] == "Tech Corp"
        assert result[0]["date"] == "2023-05-15"
        assert result[0]["score"] == 85
        
        assert result[1]["id"] == "interview-2"
        assert result[1]["jobTitle"] == "Data Scientist"
        assert result[1]["company"] == "Data Inc"
        
        mock_supabase_service.get_interview_history.assert_called_once_with(user_id)
        assert mock_supabase_service.get_job_description_details.call_count == 2
    
    def test_get_interview_history_empty(self, service, mock_supabase_service):
        """Test retrieval of empty interview history."""
        # Setup
        user_id = "test-user-id"
        mock_supabase_service.get_interview_history.return_value = []
        
        # Execute
        result = service.get_interview_history(user_id)
        
        # Verify
        assert result == []
        mock_supabase_service.get_interview_history.assert_called_once_with(user_id)
        mock_supabase_service.get_job_description_details.assert_not_called()
    
    def test_get_interview_history_error(self, service, mock_supabase_service):
        """Test interview history retrieval with an error."""
        # Setup
        user_id = "test-user-id"
        mock_supabase_service.get_interview_history.return_value = {"error": "Database error"}
        
        # Execute
        result = service.get_interview_history(user_id)
        
        # Verify
        assert "error" in result
        assert result["error"] == "Database error"
        mock_supabase_service.get_interview_history.assert_called_once_with(user_id)
    
    def test_get_dashboard_stats_success(self, service, mock_supabase_service):
        """Test successful retrieval of dashboard statistics."""
        # Setup
        user_id = "test-user-id"
        
        # Patch the get_interview_history method to return a controlled result
        with patch.object(service, 'get_interview_history', return_value=[
            {
                "id": "interview-1",
                "jobTitle": "Software Engineer",
                "company": "Tech Corp",
                "date": datetime.now().strftime("%Y-%m-%d"),  # Current month
                "score": 85
            },
            {
                "id": "interview-2",
                "jobTitle": "Data Scientist",
                "company": "Data Inc",
                "date": "2023-01-10",  # Different month
                "score": 92
            }
        ]):
            # Execute
            result = service.get_dashboard_stats(user_id)
            
            # Verify
            assert "totalInterviews" in result
            assert result["totalInterviews"] == 2
            assert "averageScore" in result
            assert result["averageScore"] == 88  # (85 + 92) / 2 = 88.5, rounded to 88
            assert "completedThisMonth" in result
            assert result["completedThisMonth"] == 1
    
    def test_get_dashboard_stats_no_scores(self, service, mock_supabase_service):
        """Test dashboard stats with interviews that have no scores."""
        # Setup
        user_id = "test-user-id"
        
        # Patch the get_interview_history method to return interviews without scores
        with patch.object(service, 'get_interview_history', return_value=[
            {
                "id": "interview-1",
                "jobTitle": "Software Engineer",
                "company": "Tech Corp",
                "date": datetime.now().strftime("%Y-%m-%d"),
                "score": None
            },
            {
                "id": "interview-2",
                "jobTitle": "Data Scientist",
                "company": "Data Inc",
                "date": "2023-01-10",
                "score": None
            }
        ]):
            # Execute
            result = service.get_dashboard_stats(user_id)
            
            # Verify
            assert result["totalInterviews"] == 2
            assert result["averageScore"] == 0  # No scores to average
            assert result["completedThisMonth"] == 1
    
    def test_get_dashboard_stats_error(self, service, mock_supabase_service):
        """Test dashboard stats retrieval with an error."""
        # Setup
        user_id = "test-user-id"
        
        # Patch the get_interview_history method to return an error
        with patch.object(service, 'get_interview_history', return_value={"error": "Failed to retrieve interviews"}):
            # Execute
            result = service.get_dashboard_stats(user_id)
            
            # Verify
            assert "error" in result
            assert result["error"] == "Failed to retrieve interviews"
    
    def test_get_active_plan_success(self, service, mock_supabase_service):
        """Test successful retrieval of active preparation plan."""
        # Setup
        user_id = "test-user-id"
        
        # Execute
        result = service.get_active_plan(user_id)
        
        # Verify
        assert result["id"] == "plan-1"
        assert result["jobTitle"] == "Software Engineer"
        assert result["company"] == "Tech Corp"
        assert result["interviewDate"] == "2023-07-15"
        assert result["readinessLevel"] == 3
        assert "steps" in result
        assert result["completedSteps"] == 1
        
        mock_supabase_service.get_active_preparation_plan.assert_called_once_with(user_id)
    
    def test_get_active_plan_none(self, service, mock_supabase_service):
        """Test retrieval of active plan when none exists."""
        # Setup
        user_id = "test-user-id"
        mock_supabase_service.get_active_preparation_plan.return_value = None
        
        # Execute
        result = service.get_active_plan(user_id)
        
        # Verify
        assert result is None
        mock_supabase_service.get_active_preparation_plan.assert_called_once_with(user_id)
    
    def test_get_active_plan_error(self, service, mock_supabase_service):
        """Test active plan retrieval with an error."""
        # Setup
        user_id = "test-user-id"
        mock_supabase_service.get_active_preparation_plan.return_value = {"error": "Database error"}
        
        # Execute
        result = service.get_active_plan(user_id)
        
        # Verify
        assert "error" in result
        assert result["error"] == "Database error"
        mock_supabase_service.get_active_preparation_plan.assert_called_once_with(user_id)
    
    def test_create_preparation_plan_success(self, service, mock_supabase_service):
        """Test successful creation of preparation plan."""
        # Setup
        user_id = "test-user-id"
        plan_data = {
            "jobTitle": "Product Manager",
            "company": "Product Co",
            "interviewDate": "2023-08-20",
            "steps": ["Research company", "Practice questions"]
        }
        
        # Execute
        result = service.create_preparation_plan(user_id, plan_data)
        
        # Verify
        assert result["id"] == "new-plan-id"
        assert result["job_title"] == "Product Manager"
        assert result["company"] == "Product Co"
        
        mock_supabase_service.update_preparation_plan_status_by_user.assert_called_once_with(user_id, "inactive")
        mock_supabase_service.create_preparation_plan.assert_called_once()
    
    def test_update_preparation_plan_success(self, service, mock_supabase_service):
        """Test successful update of preparation plan."""
        # Setup
        user_id = "test-user-id"
        plan_id = "plan-1"
        update_data = {
            "jobTitle": "Updated Job Title",
            "completedSteps": 2
        }
        
        # Execute
        result = service.update_preparation_plan(user_id, plan_id, update_data)
        
        # Verify
        assert result["id"] == "plan-1"
        assert result["job_title"] == "Updated Job Title"
        
        mock_supabase_service.check_plan_ownership.assert_called_once_with(plan_id, user_id)
        mock_supabase_service.update_preparation_plan.assert_called_once()
    
    def test_update_preparation_plan_unauthorized(self, service, mock_supabase_service):
        """Test update preparation plan with unauthorized user."""
        # Setup
        user_id = "test-user-id"
        plan_id = "plan-1"
        update_data = {"jobTitle": "Updated Job Title"}
        
        # Configure mock for unauthorized scenario
        mock_supabase_service.check_plan_ownership.return_value = False
        
        # Execute
        result = service.update_preparation_plan(user_id, plan_id, update_data)
        
        # Verify
        assert "error" in result
        assert result["error"] == "Plan not found or not authorized"
        
        mock_supabase_service.check_plan_ownership.assert_called_once_with(plan_id, user_id)
        mock_supabase_service.update_preparation_plan.assert_not_called()
