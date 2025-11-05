import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.workflow_service import WorkflowService

@pytest.fixture
def workflow_service():
    return WorkflowService()

@patch('app.services.workflow_service.supabase_service')
@patch('app.services.workflow_service.resume_parser_service')
@pytest.mark.asyncio
async def test_upload_resume_pdf(mock_parser, mock_supabase, 
                                 workflow_service):
    # Setup mocks
    mock_supabase.upload_file = AsyncMock(return_value=True)
    mock_supabase.get_file_url.return_value = 'http://example.com/resume.pdf'
    mock_supabase.create_resume.return_value = {'success': True}
    mock_parser.parse_pdf.return_value = 'Extracted PDF text'
    file = MagicMock()
    file.filename = 'resume.pdf'
    file.file = MagicMock()
    file.file.seek = MagicMock()
    # Mock file.file.read to return bytes for copyfileobj
    file.file.read = MagicMock(side_effect=[b'PDFDATA', b''])
    # Run
    result = await workflow_service.upload_resume('user123', file)
    assert result == {'success': True}
    mock_parser.parse_pdf.assert_called_once()
    mock_supabase.create_resume.assert_called_once()

@patch('app.services.workflow_service.supabase_service')
@patch('app.services.workflow_service.resume_parser_service')
@pytest.mark.asyncio
async def test_upload_resume_docx(mock_parser, mock_supabase, workflow_service):
    mock_supabase.upload_file = AsyncMock(return_value=True)
    mock_supabase.get_file_url.return_value = 'http://example.com/resume.docx'
    mock_supabase.create_resume.return_value = {'success': True}
    mock_parser.parse_docx.return_value = 'Extracted DOCX text'
    file = MagicMock()
    file.filename = 'resume.docx'
    file.file = MagicMock()
    file.file.seek = MagicMock()
    # Mock file.file.read to return bytes for copyfileobj
    file.file.read = MagicMock(side_effect=[b'DOCXDATA', b''])
    result = await workflow_service.upload_resume('user123', file)
    assert result == {'success': True}
    mock_parser.parse_docx.assert_called_once()
    mock_supabase.create_resume.assert_called_once()

@patch('app.services.workflow_service.supabase_service')
@pytest.mark.asyncio
async def test_upload_resume_unsupported_format(mock_supabase, workflow_service):
    mock_supabase.upload_file = AsyncMock(return_value=True)
    file = MagicMock()
    file.filename = 'resume.txt'
    file.file = MagicMock()
    file.file.seek = MagicMock()
    file.file.read = MagicMock(side_effect=[b'TXTDATA', b''])
    result = await workflow_service.upload_resume('user123', file)
    assert 'error' in result
    assert result['error'] == 'Unsupported file format'

@patch('app.services.workflow_service.supabase_service')
@pytest.mark.asyncio
async def test_upload_resume_upload_failure(mock_supabase, workflow_service):
    mock_supabase.upload_file = AsyncMock(return_value=None)
    file = MagicMock()
    file.filename = 'resume.pdf'
    file.file = MagicMock()
    result = await workflow_service.upload_resume('user123', file)
    assert result is None
    mock_supabase.upload_file.assert_awaited_once_with('user123', file, 'resumes')

@patch('app.services.workflow_service.supabase_service')
@patch('app.services.workflow_service.resume_parser_service')
@pytest.mark.asyncio
async def test_upload_resume_get_file_url_error(mock_parser, mock_supabase, workflow_service):
    mock_supabase.upload_file = AsyncMock(return_value=True)
    mock_supabase.get_file_url.return_value = {'error': 'Failed'}
    mock_parser.parse_pdf.return_value = 'Extracted PDF text'
    file = MagicMock()
    file.filename = 'resume.pdf'
    file.file = MagicMock()
    file.file.seek = MagicMock()
    file.file.read = MagicMock(side_effect=[b'PDFDATA', b''])
    result = await workflow_service.upload_resume('user123', file)
    assert result == {'error': 'Failed to get file URL'}
    mock_supabase.get_file_url.assert_called_once()

@patch('app.services.workflow_service.supabase_service')
def test_update_extracted_text_success(mock_supabase, workflow_service):
    mock_supabase.get_resume_table.return_value = MagicMock(data=[{'id': 1}])
    mock_supabase.update_resume.return_value = {'success': True}
    result = workflow_service.update_extracted_text('user123', 'new text')
    assert result == {'success': True}
    mock_supabase.update_resume.assert_called_once()

@patch('app.services.workflow_service.supabase_service')
def test_update_extracted_text_no_resume(mock_supabase, workflow_service):
    mock_supabase.get_resume_table.return_value = {'error': 'Not found'}
    result = workflow_service.update_extracted_text('user123', 'new text')
    assert 'error' in result
    assert result['error'] == 'No resume found for the current user'

@patch('app.services.workflow_service.supabase_service')
def test_get_resume_text(mock_supabase, workflow_service):
    mock_supabase.get_resume_table.return_value = {'data': 'resume data'}
    result = workflow_service.get_resume_text('user123')
    assert result == {'data': 'resume data'}
    mock_supabase.get_resume_table.assert_called_once_with('user123')

@patch('app.services.workflow_service.supabase_service')
def test_create_job_description(mock_supabase, workflow_service):
    mock_supabase.create_job_description.return_value = {'success': True}
    result = workflow_service.create_job_description(
        'user123', 'Engineer', 'Acme', 'NY', 'Full-time', 'Job description text'
    )
    assert result == {'success': True}
    mock_supabase.create_job_description.assert_called_once_with(
        user_id='user123',
        job_title='Engineer',
        company_name='Acme',
        location='NY',
        job_type='Full-time',
        description='Job description text'
    )
