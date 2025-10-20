import runpy
from unittest.mock import patch


def test_main_module_runs_uvicorn_when_executed():
    """Ensure __main__ guard invokes uvicorn.run with expected arguments."""
    with patch("uvicorn.run") as mock_run:
        runpy.run_module("app.main", run_name="__main__")

    mock_run.assert_called_once()
    args, kwargs = mock_run.call_args
    assert args and args[0] is not None
    assert kwargs["host"] == "0.0.0.0"
    assert kwargs["port"] == 8000
