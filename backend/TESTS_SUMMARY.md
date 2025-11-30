# Backend Tests Summary

This file provides a concise summary of the tests under `backend/tests/`.

## conftest.py
- Purpose: Provides a reusable `client` pytest fixture that yields a FastAPI `TestClient` for endpoint testing.
- Fixtures/Helpers: `client` (FastAPI TestClient wrapping `app.main.app`).

## test_auth.py
- Purpose: Integration tests for `/auth` endpoints (signup, login).
- Key cases:
  - `test_signup_success`: sign up with a generated unique email; expects 200/201 and a message.
  - `test_signup_invalid_email`: invalid email returns 400/422.
  - `test_login_success`: sign up then login; expects 200/201 and a message.
  - `test_login_invalid_credentials`: invalid login returns 400/401.
- Notes: Uses `client` fixture and `uuid` to avoid email collisions. Tests are integration-style and hit the FastAPI app routes.

## test_auth_service.py
- Purpose: Unit tests for the authentication layer in `SupabaseService` using a mock Supabase auth client.
- Key cases:
  - `test_create_user_success`: signup returns a user object.
  - `test_create_user_invalid_email`: invalid email raises and maps to an error dict.
  - `test_login_user_success`: login returns access token and user info.
  - `test_login_user_invalid`: wrong password returns an error dict.
- Fixtures/Mocks: `MockClient`, `MockAuth`, `MockSignUpResponse` used to simulate Supabase auth behavior.

## test_supabase_service.py
- Purpose: Unit tests for `SupabaseService` methods (auth wrappers, storage, CRUD for resumes/interviews/jobs/etc.).
- Key cases:
  - `test_create_user_success`, `test_login_user_success`, `test_login_user_failure` for auth flows.
  - `test_get_file_url`, `test_upload_file_and_delete` for storage handling (including async upload).
  - CRUD tests for resumes, job descriptions, interviews, feedback, questions, profiles, preparation plans.
  - `test_upload_recording_file_and_get_interview_data` simulates storage upload and chained DB selects to assemble interview data.
  - Token refresh/logout/profile and token-based `get_current_user` variants.
- Fixtures/Mocks: `mock_client` (MagicMock) injected into `SupabaseService` to control `.auth`, `.storage`, `.table` behavior.

## test_parser_service.py
- Purpose: Unit tests for `ResumeParserService` (PDF/DOCX parsing and generic `parse_resume`).
- Key cases:
  - `test_parse_pdf`: ensure `extract_text` is called and returns expected text.
 - `test_parse_docx`: ensure `Document` paragraphs join correctly.
 - `test_parse_resume_pdf` / `test_parse_resume_docx`: async tests that check `parse_resume` writes temp file, calls proper parser, and returns parsed content.
  - `test_parse_resume_unsupported`: unsupported formats return an error and cleanup is called.
- Fixtures/Mocks: patches for file operations (`open`, `shutil.copyfileobj`, `os.remove`) and parser methods.

## test_workflow_service.py
- Purpose: Unit tests for `WorkflowService` resume upload, extraction, and job description management.
- Key cases:
  - `test_upload_resume_pdf`, `test_upload_resume_docx`: async tests that mock supabase upload/get_url/create_resume and parser methods, asserting correct parser call and resume creation.
  - `test_upload_resume_unsupported_format`: returns `Unsupported file format` for unknown extensions.
  - `test_update_extracted_text_success` / `test_update_extracted_text_no_resume`: test update flow and absence handling.
  - `test_get_resume_text`, `test_create_job_description`: simple retrieval and create flows.
- Fixtures/Mocks: patches for `supabase_service` and `resume_parser_service` to avoid external IO.

## test_interview_service.py
- Purpose: Unit tests for `InterviewService` question-generation behavior (integration with GenAI client mocked).
- Key cases:
  - `test_generate_questions_valid_json`: client returns JSON text -> parsed into list of questions.
  - `test_generate_questions_markdown_json`: response wrapped in markdown code fences still parsed.
  - `test_generate_questions_exception`: API exception handled by returning empty list.
- Mocks: `client` (AI SDK) patched to simulate `.models.generate_content` responses.

## test_health.py
- Purpose: Sanity/integration test for FastAPI root endpoint health check.
- Key cases: `test_health_check` asserts GET `/` returns 200 and the expected JSON message.
- Notes: Uses `client` fixture; quick smoke test for app availability.

## test_feedback_service.py
- Purpose: Tests for `FeedbackService` including JSON repair logic, feedback generation, and (commented) audio upload flow.
- Key cases:
  - `test_repair_json_basic`: strips fences and parses JSON embedded in text.
  - `test_repair_json_malformed`: malformed JSON raises an exception.
  - `test_generate_feedback_success`: end-to-end generate feedback flow with mocked supabase data and AI client returning structured JSON; asserts save/update calls and success status.
  - `test_generate_feedback_api_error`: AI API error forces exception path.
- Mocks/Fixtures: patches for `client` (AI SDK), `datetime`, `supabase` methods; several audio upload tests are present but commented out.

## test_dashboard_service.py
- Purpose: Unit tests for `DashboardService` data shaping and preparation plan flows.
- Key cases:
  - `test_get_interview_history_completed`: formats interviews and enriches with job details.
  - `test_get_interview_history_error`: propagates supabase error.
  - `test_get_dashboard_stats`: computes totals, average scores, completedThisMonth.
  - Preparation plan create/update/ownership flows and error handling.
- Mocks: `mock_supabase` MagicMock injected; test uses `service.get_interview_history` override in one test to focus on stats calculation.

---

Notes and next steps:
- The tests mix integration-style (using FastAPI `TestClient`) and unit-style (heavy mocking of services); this is fine but consider separating pure unit tests from integration tests for clearer CI signals.
- Several audio/upload-related tests are commented out; if you want, I can help un-comment and mock the remaining external calls to make them runnable.

File created: `backend/TESTS_SUMMARY.md` — a concise per-file summary for quick reference.
