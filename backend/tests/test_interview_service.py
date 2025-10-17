import pytest
from unittest.mock import patch, MagicMock
from app.services.interview_service import InterviewService

@patch('app.services.interview_service.client')
def test_generate_questions_valid_json(mock_client):
    mock_response = MagicMock()
    mock_response.candidates = [MagicMock(content=MagicMock(parts=[MagicMock(text='[{"question": "Q1"}, {"question": "Q2"}]')]))]
    mock_client.models.generate_content.return_value = mock_response
    result = InterviewService.generate_questions('resume', 'title', 'desc', 'company', 'location')
    assert isinstance(result, list)
    assert result[0]['question'] == 'Q1'
    assert result[1]['question'] == 'Q2'

@patch('app.services.interview_service.client')
def test_generate_questions_markdown_json(mock_client):
    mock_response = MagicMock()
    mock_response.candidates = [MagicMock(content=MagicMock(parts=[MagicMock(text='```json[{"question": "Q1"}]```')]))]
    mock_client.models.generate_content.return_value = mock_response
    result = InterviewService.generate_questions('resume', 'title', 'desc', 'company', 'location')
    assert isinstance(result, list)
    assert result[0]['question'] == 'Q1'

@patch('app.services.interview_service.client')
def test_generate_questions_exception(mock_client):
    mock_client.models.generate_content.side_effect = Exception('API error')
    result = InterviewService.generate_questions('resume', 'title', 'desc', 'company', 'location')
    assert result == []