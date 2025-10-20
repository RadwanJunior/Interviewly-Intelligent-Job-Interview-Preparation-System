import pytest
from types import SimpleNamespace
from unittest.mock import MagicMock

from app.main import app
from app.services.supabase_service import supabase_service as real_supabase_service


@pytest.fixture
def dashboard_service_mock():
    from app.routes import dashboard

    original_service = dashboard.dashboard_service
    mock_service = MagicMock()
    dashboard.dashboard_service = mock_service
    try:
        yield mock_service
    finally:
        dashboard.dashboard_service = original_service


@pytest.fixture
def set_current_user():
    def _set(user):
        def dependency(request=None):
            return user
        app.dependency_overrides[real_supabase_service.get_current_user] = dependency

    yield _set
    app.dependency_overrides.pop(real_supabase_service.get_current_user, None)


def _user(user_id="test-user-123"):
    return SimpleNamespace(id=user_id)


@pytest.fixture
def sample_stats():
    return {"totalInterviews": 5, "averageScore": 87}


@pytest.fixture
def sample_history():
    return [{"id": "int-1"}, {"id": "int-2"}]


@pytest.fixture
def sample_plan():
    return {"id": "plan-1"}


def test_get_dashboard_stats_success(client, dashboard_service_mock, set_current_user, sample_stats):
    set_current_user(_user())
    dashboard_service_mock.get_dashboard_stats.return_value = sample_stats

    resp = client.get("/dashboard/stats")

    assert resp.status_code == 200
    assert resp.json() == sample_stats
    dashboard_service_mock.get_dashboard_stats.assert_called_once_with("test-user-123")


def test_get_dashboard_stats_no_user(client, dashboard_service_mock, set_current_user):
    set_current_user(None)

    resp = client.get("/dashboard/stats")

    assert resp.status_code == 401
    assert resp.json()["detail"] == "Unauthorized"
    dashboard_service_mock.get_dashboard_stats.assert_not_called()


def test_get_dashboard_stats_user_without_id(client, dashboard_service_mock, set_current_user):
    set_current_user(_user(user_id=None))

    resp = client.get("/dashboard/stats")

    assert resp.status_code == 401
    dashboard_service_mock.get_dashboard_stats.assert_not_called()


def test_get_dashboard_stats_error(client, dashboard_service_mock, set_current_user):
    set_current_user(_user())
    dashboard_service_mock.get_dashboard_stats.return_value = {"error": "boom"}

    resp = client.get("/dashboard/stats")

    assert resp.status_code == 500
    assert resp.json()["detail"] == "boom"


def test_get_interview_history_success(client, dashboard_service_mock, set_current_user, sample_history):
    set_current_user(_user())
    dashboard_service_mock.get_interview_history.return_value = sample_history

    resp = client.get("/dashboard/history")

    assert resp.status_code == 200
    assert resp.json() == sample_history
    dashboard_service_mock.get_interview_history.assert_called_once_with("test-user-123")


def test_get_interview_history_error(client, dashboard_service_mock, set_current_user):
    set_current_user(_user())
    dashboard_service_mock.get_interview_history.return_value = {"error": "fail"}

    resp = client.get("/dashboard/history")

    assert resp.status_code == 500
    assert resp.json()["detail"] == "fail"


def test_get_interview_history_unauthorized(client, dashboard_service_mock, set_current_user):
    set_current_user(None)

    resp = client.get("/dashboard/history")

    assert resp.status_code == 401
    dashboard_service_mock.get_interview_history.assert_not_called()


def test_get_active_plan_success(client, dashboard_service_mock, set_current_user, sample_plan):
    set_current_user(_user())
    dashboard_service_mock.get_active_plan.return_value = sample_plan

    resp = client.get("/dashboard/active-plan")

    assert resp.status_code == 200
    assert resp.json() == sample_plan


def test_get_active_plan_not_found(client, dashboard_service_mock, set_current_user):
    set_current_user(_user())
    dashboard_service_mock.get_active_plan.return_value = None

    resp = client.get("/dashboard/active-plan")

    assert resp.status_code == 404
    assert resp.json() == {"message": "No active plan found"}


def test_get_active_plan_error(client, dashboard_service_mock, set_current_user):
    set_current_user(_user())
    dashboard_service_mock.get_active_plan.return_value = {"error": "db down"}

    resp = client.get("/dashboard/active-plan")

    assert resp.status_code == 500
    assert resp.json()["detail"] == "db down"


def test_get_active_plan_unauthorized(client, dashboard_service_mock, set_current_user):
    set_current_user(_user(user_id=None))

    resp = client.get("/dashboard/active-plan")

    assert resp.status_code == 401
    dashboard_service_mock.get_active_plan.assert_not_called()


def test_create_preparation_plan_success(client, dashboard_service_mock, set_current_user):
    set_current_user(_user())
    dashboard_service_mock.create_preparation_plan.return_value = {"id": "plan-2"}

    payload = {"jobTitle": "Engineer", "company": "Acme"}
    resp = client.post("/dashboard/preparation-plan", json=payload)

    assert resp.status_code == 201
    assert resp.json() == {"id": "plan-2"}

    user_id, plan_data = dashboard_service_mock.create_preparation_plan.call_args[0]
    assert user_id == "test-user-123"
    assert plan_data == {
        "jobTitle": "Engineer",
        "company": "Acme",
        "interviewDate": None,
        "steps": [],
    }


def test_create_preparation_plan_error(client, dashboard_service_mock, set_current_user):
    set_current_user(_user())
    dashboard_service_mock.create_preparation_plan.return_value = {"error": "bad"}

    resp = client.post("/dashboard/preparation-plan", json={"jobTitle": "Engineer"})

    assert resp.status_code == 500
    assert resp.json()["detail"] == "bad"


def test_create_preparation_plan_unauthorized(client, dashboard_service_mock, set_current_user):
    set_current_user(None)

    resp = client.post("/dashboard/preparation-plan", json={"jobTitle": "Engineer"})

    assert resp.status_code == 401
    dashboard_service_mock.create_preparation_plan.assert_not_called()


def test_update_preparation_plan_success(client, dashboard_service_mock, set_current_user):
    set_current_user(_user())
    dashboard_service_mock.update_preparation_plan.return_value = {"id": "plan-3"}

    resp = client.put("/dashboard/preparation-plan/plan-3", json={"company": "Acme"})

    assert resp.status_code == 200
    assert resp.json() == {"id": "plan-3"}
    dashboard_service_mock.update_preparation_plan.assert_called_once_with(
        "test-user-123",
        "plan-3",
        {"company": "Acme"},
    )


def test_update_preparation_plan_not_found(client, dashboard_service_mock, set_current_user):
    set_current_user(_user())
    dashboard_service_mock.update_preparation_plan.return_value = {
        "error": "Plan not found or not authorized"
    }

    resp = client.put("/dashboard/preparation-plan/missing", json={"company": "Acme"})

    assert resp.status_code == 404
    assert resp.json()["detail"] == "Plan not found or not authorized"


def test_update_preparation_plan_error(client, dashboard_service_mock, set_current_user):
    set_current_user(_user())
    dashboard_service_mock.update_preparation_plan.return_value = {"error": "db fail"}

    resp = client.put("/dashboard/preparation-plan/plan-x", json={"company": "Acme"})

    assert resp.status_code == 500
    assert resp.json()["detail"] == "db fail"


def test_update_preparation_plan_unauthorized(client, dashboard_service_mock, set_current_user):
    set_current_user(None)

    resp = client.put("/dashboard/preparation-plan/plan-1", json={"company": "Acme"})

    assert resp.status_code == 401
    dashboard_service_mock.update_preparation_plan.assert_not_called()
