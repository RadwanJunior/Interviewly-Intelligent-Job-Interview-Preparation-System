import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from app.services.feedback_service import FeedbackService
from fastapi import UploadFile

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
@patch('app.services.feedback_service.datetime')
@pytest.mark.asyncio
async def test_generate_feedback_success(mock_datetime, mock_client, service, mock_supabase):
    # Mock interview data
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
    mock_client.models.generate_content.return_value = MagicMock(candidates=[MagicMock(content=MagicMock(parts=[MagicMock(text='{"question_analysis": [], "overall_feedback_summary": [], "confidence_score": 7}')]))])
    mock_supabase.save_feedback.return_value = {}
    mock_supabase.update_interview.return_value = {}
    mock_datetime.now.return_value = MagicMock(isoformat=lambda: '2025-10-14T10:30:00Z')
    result = await service.generate_feedback('interview_id', 'user_id')
    assert result['status'] == 'success'
    assert 'message' in result

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
async def test_upload_audio_file_gemini_api_error(mock_named_tmp, service, mock_supabase):
    # Prepare file that will be accepted as bytes
    fake_file = AsyncMock()
    fake_file.read = AsyncMock(return_value=b'data')

    # NamedTemporaryFile context manager stub
    mock_named_tmp.return_value = _mk_tmp_cm()

    # Patch the Gemini client to raise a BadRequest
    from google.api_core.exceptions import BadRequest
    with patch('app.services.feedback_service.client') as mock_client:
        mock_client.files.upload.side_effect = BadRequest('bad')
        with pytest.raises(Exception) as exc:
            await service.upload_audio_file(fake_file, 'iid', 'qid', 'qtext', 1, 'uid', 'audio/webm')
        assert 'Gemini API upload failed' in str(exc.value)


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
    variants = [
        ('string', 'https://u1.example'),
        ('dict_data', {'data': {'publicUrl': 'https://u2.example'}}),
        ('obj_url', MagicMock(url='https://u3.example'))
    ]

    for _, supabase_resp in variants:
        with patch('app.services.feedback_service.client') as mock_client:
            mock_client.files.upload.return_value = gemini_resp
            # supabase upload returns variant
            mock_supabase.upload_recording_file = AsyncMock(return_value=supabase_resp)
            mock_supabase.insert_user_response = AsyncMock(return_value={})

            # Call
            res = await FeedbackService(mock_supabase).upload_audio_file(fake_file, 'iid', 'qid', 'qtext', 1, 'uid', 'audio/webm')
            assert res['gemini_file_id'] == 'gfile123'
            assert res['question_id'] == 'qid'