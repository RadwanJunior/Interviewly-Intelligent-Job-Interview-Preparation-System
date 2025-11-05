import json
from datetime import datetime, timezone, timedelta
import pytest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch, AsyncMock

from app.services.feedback_service import FeedbackService

@pytest.fixture
def mock_supabase():
    return MagicMock()

@pytest.fixture
def service(mock_supabase):
    return FeedbackService(mock_supabase)

def test_repair_json_basic(service):
    # Valid JSON with markdown
    json_text = '```json{"key": "value"}```'
    result = service.repair_json(json_text)
    assert result['key'] == 'value'

def test_repair_json_malformed(service):
    # Missing closing quote
    json_text = '{"key": "value}'
    with pytest.raises(Exception):
        service.repair_json(json_text)

# @patch('app.services.feedback_service.genai')
# @patch('app.services.feedback_service.types')
# @patch('app.services.feedback_service.tempfile.NamedTemporaryFile')
# @patch('app.services.feedback_service.io.BytesIO')
# @patch('os.unlink')
# @patch('os.path.exists', return_value=True)
# @pytest.mark.asyncio
# async def test_upload_audio_file(mock_exists, mock_unlink, mock_bytesio, mock_tempfile, mock_types, mock_genai, service, mock_supabase):
#     file = MagicMock(spec=UploadFile)
#     file.filename = 'audio.webm'
#     file.read = AsyncMock(return_value=b'audio-data')
#     mock_file_obj = MagicMock()
#     mock_tempfile.return_value.__enter__.return_value = mock_file_obj
#     mock_file_obj.name = 'tempfile.webm'
#     mock_bytesio.return_value = MagicMock()
#     mock_genai.Client().files.upload.return_value = MagicMock(name='file_id')
#     mock_genai.__version__ = "1.0.0"
#     # Ensure UploadFileConfig returns an object with real string attributes
#     mock_config = MagicMock()
#     mock_config.mime_type = "audio/webm"
#     mock_config.name = "short_id"
#     mock_config.display_name = "interview_id_question_id_1.webm"
#     mock_types.UploadFileConfig.return_value = mock_config
#     mock_supabase.upload_recording_file = AsyncMock(return_value='file_url')
#     mock_supabase.insert_user_response = AsyncMock(return_value={})
#     result = await service.upload_audio_file(file, 'interview_id', 'question_id', 'question_text', 1, 'user_id', 'audio/webm')
#     assert 'file_url' in result
#     assert 'gemini_file_id' in result
#     assert 'question_id' in result

@patch('app.services.feedback_service.client')
@patch('app.services.feedback_service.types.UploadFileConfig')
@patch('app.services.feedback_service.genai')
@pytest.mark.asyncio
async def test_upload_audio_file_uses_public_url(mock_genai, mock_upload_config, mock_client, service, mock_supabase):
    class FakeUploadFile:
        def __init__(self, data: bytes):
            self._data = data

        async def read(self):
            return self._data

    mock_genai.__version__ = "test-version"
    mock_upload_config.return_value = SimpleNamespace()
    mock_client.files.upload.return_value = SimpleNamespace(name='gemini-file-id')

    public_url = "https://example.com/public-url"

    class SupabaseResponse:
        def get_public_url(self):
            return public_url

    service.supabase_service.upload_recording_file = AsyncMock(return_value=SupabaseResponse())
    service.supabase_service.insert_user_response = AsyncMock(return_value={})

    file = FakeUploadFile(b"dummy-bytes")

    result = await service.upload_audio_file(
        file=file,
        interview_id='interview123',
        question_id='question456',
        question_text='Tell me about yourself',
        question_order=1,
        user_id='user789',
        mime_type='audio/webm'
    )

    assert result['file_url'] == public_url
    service.supabase_service.upload_recording_file.assert_awaited_once()
    service.supabase_service.insert_user_response.assert_awaited_once()

@patch('app.services.feedback_service.client')
@pytest.mark.asyncio
async def test_generate_feedback_success(mock_client, service, mock_supabase):
    # Mock interview data
    mock_supabase.get_interview_data = AsyncMock(return_value={
        'resume': {'extracted_text': 'resume text'},
        'job_description': {'title': 'title', 'description': 'desc'},
        'company_name': 'company',
        'location': 'location',
        'interview_questions': ['qid'],
        'created_at': '2025-10-14T10:00:00+00:00'
    })
    mock_supabase.get_interview_question.return_value = MagicMock(data={'question': 'Q?', 'order': 1})
    mock_supabase.get_user_responses.return_value = [
        {'question_id': 'qid', 'question_text': 'Q?', 'question_order': 1, 'gemini_file_id': 'fid'}
    ]
    file_obj = SimpleNamespace(name='fid')
    mock_client.files.get.return_value = file_obj
    candidate = MagicMock()
    candidate.content.parts = [MagicMock(text='```json{"question_analysis": [], "overall_feedback_summary": [], "confidence_score": 7}```')]
    mock_client.models.generate_content.return_value = MagicMock(candidates=[candidate])
    mock_supabase.save_feedback.return_value = {}
    mock_supabase.update_interview.return_value = {}
    result = await service.generate_feedback('interview_id', 'user_id')
    assert result['status'] == 'success'
    assert 'message' in result
    args, kwargs = mock_supabase.update_interview.call_args
    update_payload = args[1]
    assert update_payload['status'] == 'completed'
    assert 'duration' in update_payload
    assert update_payload['score'] == 70

@patch('app.services.feedback_service.client')
@pytest.mark.asyncio
async def test_generate_feedback_api_error(mock_client, service, mock_supabase):
    mock_supabase.get_interview_data = AsyncMock(return_value={
        'resume': {'extracted_text': 'resume text'},
        'job_description': {'title': 'title', 'description': 'desc'},
        'company_name': 'company',
        'location': 'location',
        'interview_questions': ['qid'],
        'created_at': '2025-10-14T10:00:00Z'
    })
    mock_supabase.get_interview_question.return_value = MagicMock(data={'question': 'Q?', 'order': 1})
    mock_supabase.get_user_responses.return_value = [
        {'question_id': 'qid', 'question_text': 'Q?', 'question_order': 1, 'gemini_file_id': 'fid'}
    ]
    mock_client.models.generate_content.side_effect = Exception('API error')
    with pytest.raises(Exception):
        await service.generate_feedback('interview_id', 'user_id')


@patch('app.services.feedback_service.client')
@pytest.mark.asyncio
async def test_generate_feedback_warns_on_missing_question(mock_client, service, mock_supabase, capsys):
    mock_supabase.get_interview_data = AsyncMock(return_value={
        'resume': {'extracted_text': 'resume text'},
        'job_description': {},
        'company_name': 'company',
        'location': 'location',
        'interview_questions': ['qid']
    })
    mock_supabase.get_interview_question.return_value = MagicMock(data={'question': 'Q?', 'order': 1})
    mock_supabase.get_user_responses.return_value = [
        {'question_id': 'unknown', 'question_text': None, 'question_order': 2, 'gemini_file_id': 'unknown'},
        {'question_id': 'qid', 'question_text': 'Q?', 'question_order': 1, 'gemini_file_id': 'fid'}
    ]
    mock_client.files.get.return_value = SimpleNamespace(name='fid')
    candidate = MagicMock()
    candidate.content.parts = [MagicMock(text=json.dumps({
        "question_analysis": [],
        "overall_feedback_summary": [],
        "confidence_score": 6
    }))]
    mock_client.models.generate_content.return_value = MagicMock(candidates=[candidate])
    mock_supabase.save_feedback.return_value = {}
    mock_supabase.update_interview.return_value = {}

    result = await service.generate_feedback('iid', 'uid')
    assert result['status'] == 'success'
    captured = capsys.readouterr()
    assert 'No matching question found' in captured.out


@patch('app.services.feedback_service.client')
@pytest.mark.asyncio
async def test_generate_feedback_invalid_interview_data(mock_client, service, mock_supabase):
    mock_supabase.get_interview_data = AsyncMock(return_value={'error': {'message': 'fail'}})
    with pytest.raises(Exception) as exc:
        await service.generate_feedback('iid', 'uid')
    assert 'Failed to fetch interview data' in str(exc.value)


@patch('app.services.feedback_service.client')
@pytest.mark.asyncio
async def test_generate_feedback_question_fetch_error(mock_client, service, mock_supabase):
    mock_supabase.get_interview_data = AsyncMock(return_value={
        'resume': {'extracted_text': 'resume'},
        'job_description': {},
        'interview_questions': ['q1']
    })
    mock_supabase.get_interview_question.return_value = {'error': {'message': 'missing'}}
    with pytest.raises(Exception) as exc:
        await service.generate_feedback('iid', 'uid')
    assert 'Failed to fetch question data' in str(exc.value)


@patch('app.services.feedback_service.client')
@pytest.mark.asyncio
async def test_generate_feedback_no_questions(mock_client, service, mock_supabase):
    mock_supabase.get_interview_data = AsyncMock(return_value={
        'resume': {'extracted_text': 'resume'},
        'job_description': {},
        'interview_questions': []
    })
    with pytest.raises(Exception) as exc:
        await service.generate_feedback('iid', 'uid')
    assert 'No interview questions found' in str(exc.value)


@patch('app.services.feedback_service.client')
@pytest.mark.asyncio
async def test_generate_feedback_user_responses_error(mock_client, service, mock_supabase):
    mock_supabase.get_interview_data = AsyncMock(return_value={
        'resume': {'extracted_text': 'resume'},
        'job_description': {},
        'interview_questions': ['q1']
    })
    mock_supabase.get_interview_question.return_value = MagicMock(data={'question': 'Q', 'order': 1})
    mock_supabase.get_user_responses.return_value = {'error': {'message': 'fail'}}
    with pytest.raises(Exception) as exc:
        await service.generate_feedback('iid', 'uid')
    assert 'Failed to fetch user responses' in str(exc.value)


@patch('app.services.feedback_service.client')
@pytest.mark.asyncio
async def test_generate_feedback_missing_question_data(mock_client, service, mock_supabase):
    mock_supabase.get_interview_data = AsyncMock(return_value={
        'resume': {'extracted_text': 'resume'},
        'job_description': {},
        'interview_questions': ['q1']
    })
    mock_supabase.get_interview_question.return_value = MagicMock(data={'question': 'Q', 'order': 1})
    mock_supabase.get_user_responses.return_value = [
        {'question_id': 'q1', 'question_order': 1, 'gemini_file_id': None}
    ]
    with pytest.raises(Exception) as exc:
        await service.generate_feedback('iid', 'uid')
    assert 'No valid audio responses' in str(exc.value)


@patch('app.services.feedback_service.client')
@pytest.mark.asyncio
async def test_generate_feedback_no_responses(mock_client, service, mock_supabase):
    mock_supabase.get_interview_data = AsyncMock(return_value={
        'resume': {'extracted_text': 'resume'},
        'job_description': {},
        'interview_questions': ['q1']
    })
    mock_supabase.get_interview_question.return_value = MagicMock(data={'question': 'Q', 'order': 1})
    mock_supabase.get_user_responses.return_value = []
    with pytest.raises(Exception) as exc:
        await service.generate_feedback('iid', 'uid')
    assert 'Failed to fetch user responses' in str(exc.value)


@patch('app.services.feedback_service.client')
@pytest.mark.asyncio
async def test_generate_feedback_file_fetch_error(mock_client, service, mock_supabase):
    mock_supabase.get_interview_data = AsyncMock(return_value={
        'resume': {'extracted_text': 'resume'},
        'job_description': {},
        'interview_questions': ['q1']
    })
    mock_supabase.get_interview_question.return_value = MagicMock(data={'question': 'Q', 'order': 1})
    mock_supabase.get_user_responses.return_value = [
        {'question_id': 'q1', 'question_text': 'Q', 'question_order': 1, 'gemini_file_id': 'fid'}
    ]
    mock_client.files.get.side_effect = Exception('missing')
    with pytest.raises(Exception) as exc:
        await service.generate_feedback('iid', 'uid')
    assert 'Failed to fetch audio file' in str(exc.value)


@patch('app.services.feedback_service.client')
@pytest.mark.asyncio
async def test_generate_feedback_empty_api_response(mock_client, service, mock_supabase):
    mock_supabase.get_interview_data = AsyncMock(return_value={
        'resume': {'extracted_text': 'resume'},
        'job_description': {},
        'interview_questions': ['q1']
    })
    mock_supabase.get_interview_question.return_value = MagicMock(data={'question': 'Q', 'order': 1})
    mock_supabase.get_user_responses.return_value = [
        {'question_id': 'q1', 'question_text': 'Q', 'question_order': 1, 'gemini_file_id': 'fid'}
    ]
    mock_client.files.get.return_value = SimpleNamespace(name='fid')
    mock_client.models.generate_content.return_value = MagicMock(candidates=[])
    with pytest.raises(Exception) as exc:
        await service.generate_feedback('iid', 'uid')
    assert 'Empty response from Gemini' in str(exc.value)


@patch('app.services.feedback_service.client')
@pytest.mark.asyncio
async def test_generate_feedback_empty_feedback_text(mock_client, service, mock_supabase):
    mock_supabase.get_interview_data = AsyncMock(return_value={
        'resume': {'extracted_text': 'resume'},
        'job_description': {},
        'interview_questions': ['q1']
    })
    mock_supabase.get_interview_question.return_value = MagicMock(data={'question': 'Q', 'order': 1})
    mock_supabase.get_user_responses.return_value = [
        {'question_id': 'q1', 'question_text': 'Q', 'question_order': 1, 'gemini_file_id': 'fid'}
    ]
    mock_client.files.get.return_value = SimpleNamespace(name='fid')
    candidate = MagicMock()
    candidate.content.parts = [MagicMock(text='')]
    mock_client.models.generate_content.return_value = MagicMock(candidates=[candidate])
    with pytest.raises(Exception) as exc:
        await service.generate_feedback('iid', 'uid')
    assert 'Feedback generation returned empty result' in str(exc.value)


@patch('app.services.feedback_service.client')
@pytest.mark.asyncio
async def test_generate_feedback_repairs_json(mock_client, service, mock_supabase):
    mock_supabase.get_interview_data = AsyncMock(return_value={
        'resume': {'extracted_text': 'resume'},
        'job_description': {},
        'company_name': 'Acme',
        'location': 'Remote',
        'interview_questions': ['q1'],
        'created_at': '2025-01-01T00:00:00Z'
    })
    mock_supabase.get_interview_question.return_value = MagicMock(data={'question': 'Q', 'order': 1})
    mock_supabase.get_user_responses.return_value = [
        {'question_id': 'q1', 'question_text': 'Q', 'question_order': 1, 'gemini_file_id': 'fid'}
    ]
    mock_client.files.get.return_value = SimpleNamespace(name='fid')
    candidate = MagicMock()
    candidate.content.parts = [MagicMock(text='{"question_analysis": [}')]
    mock_client.models.generate_content.return_value = MagicMock(candidates=[candidate])
    mock_supabase.save_feedback.return_value = {}
    mock_supabase.update_interview.return_value = {}

    repaired_payload = {
        "question_analysis": [],
        "overall_feedback_summary": [],
        "communication_assessment": [],
        "overall_sentiment": "Neutral",
        "confidence_score": 5,
        "overall_improvement_steps": []
    }

    with patch.object(FeedbackService, 'repair_json', return_value=repaired_payload) as repair_mock:
        result = await service.generate_feedback('iid', 'uid')

    assert result['status'] == 'success'
    repair_mock.assert_called_once()


@patch('app.services.feedback_service.client')
@pytest.mark.asyncio
async def test_generate_feedback_json_parse_failure(mock_client, service, mock_supabase, capsys):
    mock_supabase.get_interview_data = AsyncMock(return_value={
        'resume': {'extracted_text': 'resume'},
        'job_description': {},
        'interview_questions': ['q1']
    })
    mock_supabase.get_interview_question.return_value = MagicMock(data={'question': 'Q', 'order': 1})
    mock_supabase.get_user_responses.return_value = [
        {'question_id': 'q1', 'question_text': 'Q', 'question_order': 1, 'gemini_file_id': 'fid'}
    ]
    mock_client.files.get.return_value = SimpleNamespace(name='fid')
    bad_json = '{"question_analysis": [}'
    candidate = MagicMock()
    candidate.content.parts = [MagicMock(text=bad_json)]
    mock_client.models.generate_content.return_value = MagicMock(candidates=[candidate])
    mock_supabase.save_feedback.return_value = {}
    mock_supabase.update_interview.return_value = {}
    with patch('app.services.feedback_service.json5.loads', side_effect=[Exception('fail1'), Exception('fail2')]):
        result = await service.generate_feedback('iid', 'uid')
    assert result['status'] == 'success'
    captured = capsys.readouterr()
    assert 'Using fallback feedback structure' in captured.out


@patch('app.services.feedback_service.client')
@pytest.mark.asyncio
async def test_generate_feedback_save_feedback_error(mock_client, service, mock_supabase):
    mock_supabase.get_interview_data = AsyncMock(return_value={
        'resume': {'extracted_text': 'resume'},
        'job_description': {},
        'interview_questions': ['q1']
    })
    mock_supabase.get_interview_question.return_value = MagicMock(data={'question': 'Q', 'order': 1})
    mock_supabase.get_user_responses.return_value = [
        {'question_id': 'q1', 'question_text': 'Q', 'question_order': 1, 'gemini_file_id': 'fid'}
    ]
    mock_client.files.get.return_value = SimpleNamespace(name='fid')
    candidate = MagicMock()
    candidate.content.parts = [MagicMock(text=json.dumps({
        "question_analysis": [],
        "overall_feedback_summary": [],
        "confidence_score": 5
    }))]
    mock_client.models.generate_content.return_value = MagicMock(candidates=[candidate])
    mock_supabase.save_feedback.return_value = {"error": {"message": "db"}}
    with pytest.raises(Exception) as exc:
        await service.generate_feedback('iid', 'uid')
    assert 'Failed to save feedback' in str(exc.value)


@patch('app.services.feedback_service.client')
@pytest.mark.asyncio
async def test_generate_feedback_invalid_feedback_object(mock_client, service, mock_supabase):
    mock_supabase.get_interview_data = AsyncMock(return_value={
        'resume': {'extracted_text': 'resume'},
        'job_description': {},
        'interview_questions': ['q1']
    })
    mock_supabase.get_interview_question.return_value = MagicMock(data={'question': 'Q', 'order': 1})
    mock_supabase.get_user_responses.return_value = [
        {'question_id': 'q1', 'question_text': 'Q', 'question_order': 1, 'gemini_file_id': 'fid'}
    ]
    mock_client.files.get.return_value = SimpleNamespace(name='fid')
    candidate = MagicMock()
    candidate.content.parts = [MagicMock(text='[]')]
    mock_client.models.generate_content.return_value = MagicMock(candidates=[candidate])
    with pytest.raises(Exception) as exc:
        await service.generate_feedback('iid', 'uid')
    assert 'Parsed feedback is not a valid JSON object' in str(exc.value)


@patch('app.services.feedback_service.client')
@pytest.mark.asyncio
async def test_generate_feedback_missing_required_fields(mock_client, service, mock_supabase, capsys):
    mock_supabase.get_interview_data = AsyncMock(return_value={
        'resume': {'extracted_text': 'resume'},
        'job_description': {},
        'interview_questions': ['q1']
    })
    mock_supabase.get_interview_question.return_value = MagicMock(data={'question': 'Q', 'order': 1})
    mock_supabase.get_user_responses.return_value = [
        {'question_id': 'q1', 'question_text': 'Q', 'question_order': 1, 'gemini_file_id': 'fid'}
    ]
    mock_client.files.get.return_value = SimpleNamespace(name='fid')
    candidate = MagicMock()
    candidate.content.parts = [MagicMock(text=json.dumps({
        "overall_feedback_summary": [],
        "confidence_score": 5
    }))]
    mock_client.models.generate_content.return_value = MagicMock(candidates=[candidate])
    mock_supabase.save_feedback.return_value = {}
    mock_supabase.update_interview.return_value = {}
    await service.generate_feedback('iid', 'uid')
    captured = capsys.readouterr()
    assert 'missing required fields' in captured.out


@patch('app.services.feedback_service.client')
@pytest.mark.asyncio
async def test_generate_feedback_created_at_warning(mock_client, service, mock_supabase, capsys):
    mock_supabase.get_interview_data = AsyncMock(return_value={
        'resume': {'extracted_text': 'resume'},
        'job_description': {},
        'interview_questions': ['q1'],
        'created_at': 'invalid'
    })
    mock_supabase.get_interview_question.return_value = MagicMock(data={'question': 'Q', 'order': 1})
    mock_supabase.get_user_responses.return_value = [
        {'question_id': 'q1', 'question_text': 'Q', 'question_order': 1, 'gemini_file_id': 'fid'}
    ]
    mock_client.files.get.return_value = SimpleNamespace(name='fid')
    candidate = MagicMock()
    candidate.content.parts = [MagicMock(text=json.dumps({
        "question_analysis": [],
        "overall_feedback_summary": [],
        "confidence_score": 5
    }))]
    mock_client.models.generate_content.return_value = MagicMock(candidates=[candidate])
    mock_supabase.save_feedback.return_value = {}
    mock_supabase.update_interview.return_value = {}
    await service.generate_feedback('iid', 'uid')
    captured = capsys.readouterr()
    assert 'Could not parse created_at' in captured.out


@pytest.mark.parametrize(
    "delta, expected",
    [
        (timedelta(seconds=30), '< 1 minute'),
        (timedelta(minutes=1), '1 minute'),
        (timedelta(minutes=5), '5 minutes')
    ]
)
@patch('app.services.feedback_service.client')
@pytest.mark.asyncio
async def test_generate_feedback_duration_formats(mock_client, service, mock_supabase, delta, expected):
    base_time = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    created_at = (base_time - delta).isoformat()

    mock_supabase.get_interview_data = AsyncMock(return_value={
        'resume': {'extracted_text': 'resume'},
        'job_description': {},
        'company_name': 'Acme',
        'location': 'Remote',
        'interview_questions': ['q1'],
        'created_at': created_at
    })
    mock_supabase.get_interview_question.return_value = MagicMock(data={'question': 'Q', 'order': 1})
    mock_supabase.get_user_responses.return_value = [
        {'question_id': 'q1', 'question_text': 'Q', 'question_order': 1, 'gemini_file_id': 'fid'}
    ]
    mock_client.files.get.return_value = SimpleNamespace(name='fid')
    candidate = MagicMock()
    candidate.content.parts = [MagicMock(text=json.dumps({
        "question_analysis": [],
        "overall_feedback_summary": [],
        "confidence_score": 6
    }))]
    mock_client.models.generate_content.return_value = MagicMock(candidates=[candidate])
    mock_supabase.save_feedback.return_value = {}
    mock_supabase.update_interview.return_value = {}

    dummy_datetime = SimpleNamespace(
        now=lambda tz=None: base_time,
        fromisoformat=datetime.fromisoformat,
        timezone=timezone
    )

    with patch('app.services.feedback_service.datetime', dummy_datetime):
        await service.generate_feedback('iid', 'uid')

    update_payload = mock_supabase.update_interview.call_args[0][1]
    assert update_payload['duration'] == expected

def test_repair_json_targeted_fix(service):
    # JSON missing a closing quote; provide an error message indicating line/column
    bad = '{"key": "value}'
    err = 'Unterminated string (line 1 column 15)'
    # Patch json5.loads to a predictable parser to avoid relying on the real json5 behavior
    with patch('app.services.feedback_service.json5.loads', return_value={"key": "value"}):
        res = service.repair_json(bad, err)
        assert res["key"] == "value"


def test_repair_json_balance_quotes_fallback(service):
    # Force json5 to fail the first time, then succeed after _balance_quotes is applied
    text = '{"a": "b}'
    with patch('app.services.feedback_service.json5.loads', side_effect=[Exception('fail'), {"a": "b"}]):
        res = service.repair_json(text)
        assert res["a"] == "b"


@pytest.mark.asyncio
async def test_upload_audio_file_non_bytes(service):
    # file.read returns a str -> should raise a TypeError
    fake_file = AsyncMock()
    fake_file.read = AsyncMock(return_value='not-bytes')
    with pytest.raises(Exception) as exc:
        await service.upload_audio_file(fake_file, 'iid', 'qid', 'qtext', 1, 'uid', 'audio/webm')
    # The implementation wraps internal TypeError into a generic Exception with context
    assert 'file_content is not bytes' in str(exc.value)


@pytest.mark.asyncio
async def test_upload_audio_file_empty(service):
    # file.read returns empty bytes -> should raise ValueError
    fake_file = AsyncMock()
    fake_file.read = AsyncMock(return_value=b'')
    with pytest.raises(Exception) as exc:
        await service.upload_audio_file(fake_file, 'iid', 'qid', 'qtext', 1, 'uid', 'audio/webm')
    assert 'File content is empty' in str(exc.value)


def _mk_tmp_cm(name='tmp.webm'):
    """Create a simple context manager object that mimics NamedTemporaryFile for tests."""
    cm = MagicMock()
    cm.__enter__.return_value = cm
    cm.name = name
    cm.write = MagicMock()
    cm.__exit__.return_value = False
    return cm


@pytest.mark.asyncio
@patch('app.services.feedback_service.tempfile.NamedTemporaryFile')
async def test_upload_audio_file_gemini_api_error(mock_named_tmp, service, mock_supabase, capsys):
    # Prepare file that will be accepted as bytes
    fake_file = AsyncMock()
    fake_file.read = AsyncMock(return_value=b'data')

    # NamedTemporaryFile context manager stub
    mock_named_tmp.return_value = _mk_tmp_cm()

    # Patch the Gemini client to raise a BadRequest
    class DummyApiError(Exception):
        def __init__(self):
            self.response = SimpleNamespace(text='body')

    with patch('app.services.feedback_service.BadRequest', DummyApiError), \
            patch('app.services.feedback_service.client') as mock_client:
        mock_client.files.upload.side_effect = DummyApiError()
        with pytest.raises(Exception) as exc:
            await service.upload_audio_file(fake_file, 'iid', 'qid', 'qtext', 1, 'uid', 'audio/webm')
        assert 'Gemini API upload failed' in str(exc.value)
    captured = capsys.readouterr()
    assert 'API Error Response Body' in captured.out


@pytest.mark.asyncio
@patch('app.services.feedback_service.tempfile.NamedTemporaryFile')
async def test_upload_audio_file_gemini_api_status(mock_named_tmp, service, mock_supabase, capsys):
    fake_file = AsyncMock()
    fake_file.read = AsyncMock(return_value=b'data')
    mock_named_tmp.return_value = _mk_tmp_cm()

    class DummyStatusError(Exception):
        status_code = 403

    with patch('app.services.feedback_service.Forbidden', DummyStatusError), \
            patch('app.services.feedback_service.client') as mock_client:
        mock_client.files.upload.side_effect = DummyStatusError()
        with pytest.raises(Exception) as exc:
            await service.upload_audio_file(fake_file, 'iid', 'qid', 'qtext', 1, 'uid', 'audio/webm')
        assert 'Gemini API upload failed' in str(exc.value)
    captured = capsys.readouterr()
    assert 'API Error Status Code' in captured.out


@pytest.mark.asyncio
@patch('app.services.feedback_service.tempfile.NamedTemporaryFile')
async def test_upload_audio_file_unexpected_error(mock_named_tmp, service, mock_supabase):
    fake_file = AsyncMock()
    fake_file.read = AsyncMock(return_value=b'data')
    mock_named_tmp.return_value = _mk_tmp_cm()

    with patch('app.services.feedback_service.client') as mock_client:
        mock_client.files.upload.side_effect = ValueError('boom')
        with pytest.raises(Exception) as exc:
            await service.upload_audio_file(fake_file, 'iid', 'qid', 'qtext', 1, 'uid', 'audio/webm')
        assert 'Unexpected error during Gemini file upload' in str(exc.value)


@pytest.mark.asyncio
@patch('app.services.feedback_service.os.unlink')
@patch('app.services.feedback_service.os.path.exists', return_value=True)
@patch('app.services.feedback_service.tempfile.NamedTemporaryFile')
async def test_upload_audio_file_cleanup_errors(mock_named_tmp, mock_exists, mock_unlink, service, mock_supabase, capsys):
    fake_file = AsyncMock()
    fake_file.read = AsyncMock(return_value=b'data')
    mock_named_tmp.return_value = _mk_tmp_cm()
    mock_unlink.side_effect = Exception('cleanup')

    with patch('app.services.feedback_service.client') as mock_client:
        mock_client.files.upload.side_effect = ValueError('boom')
        with pytest.raises(Exception):
            await service.upload_audio_file(fake_file, 'iid', 'qid', 'qtext', 1, 'uid', 'audio/webm')

    captured = capsys.readouterr()
    assert 'Error during original temporary file cleanup' in captured.out


@pytest.mark.asyncio
@patch('app.services.feedback_service.tempfile.NamedTemporaryFile')
async def test_upload_audio_file_gemini_missing_name(mock_named_tmp, service, mock_supabase):
    fake_file = AsyncMock()
    fake_file.read = AsyncMock(return_value=b'data')
    mock_named_tmp.return_value = _mk_tmp_cm()

    # client.files.upload returns an object missing 'name' or with falsy name
    with patch('app.services.feedback_service.client') as mock_client:
        bad_resp = MagicMock()
        bad_resp.name = None
        mock_client.files.upload.return_value = bad_resp
        with pytest.raises(Exception) as exc:
            await service.upload_audio_file(fake_file, 'iid', 'qid', 'qtext', 1, 'uid', 'audio/webm')
        assert 'Response missing ID' in str(exc.value) or 'Failed to upload file to Gemini' in str(exc.value)


@pytest.mark.asyncio
@patch('app.services.feedback_service.tempfile.NamedTemporaryFile')
async def test_upload_audio_file_success_variants(mock_named_tmp, service, mock_supabase):
    fake_file = AsyncMock()
    fake_file.read = AsyncMock(return_value=b'data')
    mock_named_tmp.return_value = _mk_tmp_cm()

    # Create gemini response with a name
    gemini_resp = MagicMock()
    gemini_resp.name = 'gfile123'

    # Test multiple supabase return shapes
    fallback_obj = object()
    class ResponseWithUrl:
        def __init__(self, url):
            self.url = url

    variants = {
        'string': ('https://u1.example', 'https://u1.example'),
        'dict_data': ({'data': {'publicUrl': 'https://u2.example'}}, 'https://u2.example'),
        'obj_url': (ResponseWithUrl('https://u3.example'), 'https://u3.example'),
        'fallback': (fallback_obj, str(fallback_obj))
    }

    for label, (supabase_resp, expected_url) in variants.items():
        if label == 'fallback':
            expected_url = str(supabase_resp)
        with patch('app.services.feedback_service.client') as mock_client:
            mock_client.files.upload.return_value = gemini_resp
            # supabase upload returns variant
            mock_supabase.upload_recording_file = AsyncMock(return_value=supabase_resp)
            mock_supabase.insert_user_response = AsyncMock(return_value={})

            # Call
            res = await FeedbackService(mock_supabase).upload_audio_file(fake_file, 'iid', 'qid', 'qtext', 1, 'uid', 'audio/webm')
            assert res['gemini_file_id'] == 'gfile123'
            assert res['question_id'] == 'qid'
            assert res['file_url'] == expected_url
        

@pytest.mark.asyncio
@patch('app.services.feedback_service.tempfile.NamedTemporaryFile')
async def test_upload_audio_file_insert_response_error(mock_named_tmp, service, mock_supabase):
    fake_file = AsyncMock()
    fake_file.read = AsyncMock(return_value=b'data')
    mock_named_tmp.return_value = _mk_tmp_cm()

    gemini_resp = MagicMock()
    gemini_resp.name = 'gfile123'

    with patch('app.services.feedback_service.client') as mock_client:
        mock_client.files.upload.return_value = gemini_resp
        mock_supabase.upload_recording_file = AsyncMock(return_value='https://url')
        mock_supabase.insert_user_response = AsyncMock(return_value={'error': 'db'})
        with pytest.raises(Exception) as exc:
            await service.upload_audio_file(fake_file, 'iid', 'qid', 'qtext', 1, 'uid', 'audio/webm')
        assert 'Failed to save file data' in str(exc.value)
