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