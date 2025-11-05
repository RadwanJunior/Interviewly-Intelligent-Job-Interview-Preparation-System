import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from app.services.parser_service import ResumeParserService
from fastapi import UploadFile

@pytest.fixture
def parser():
    return ResumeParserService()

@patch('app.services.parser_service.extract_text')
def test_parse_pdf(mock_extract, parser):
    mock_extract.return_value = 'PDF text'
    result = parser.parse_pdf('dummy.pdf')
    assert result == 'PDF text'
    mock_extract.assert_called_once_with('dummy.pdf')

@patch('app.services.parser_service.Document')
def test_parse_docx(mock_doc, parser):
    mock_doc.return_value.paragraphs = [MagicMock(text='Para1'), MagicMock(text='Para2')]
    result = parser.parse_docx('dummy.docx')
    assert result == 'Para1\nPara2'
    mock_doc.assert_called_once_with('dummy.docx')

@pytest.mark.asyncio
@patch('app.services.parser_service.ResumeParserService.parse_pdf', return_value='PDF text')
@patch('app.services.parser_service.ResumeParserService.parse_docx', return_value='DOCX text')
@patch('builtins.open', new_callable=MagicMock)
@patch('os.remove')
@patch('shutil.copyfileobj')
async def test_parse_resume_pdf(mock_copy, mock_remove, mock_open, mock_parse_docx, mock_parse_pdf, parser):
    file = MagicMock(spec=UploadFile)
    file.filename = 'resume.pdf'
    file.file = MagicMock()
    result = await parser.parse_resume(file)
    assert result['filename'] == 'resume.pdf'
    assert result['parsed_text'] == 'PDF text'
    mock_parse_pdf.assert_called_once()
    mock_remove.assert_called()

@pytest.mark.asyncio
@patch('app.services.parser_service.ResumeParserService.parse_pdf', return_value='PDF text')
@patch('app.services.parser_service.ResumeParserService.parse_docx', return_value='DOCX text')
@patch('builtins.open', new_callable=MagicMock)
@patch('os.remove')
@patch('shutil.copyfileobj')
async def test_parse_resume_docx(mock_copy, mock_remove, mock_open, mock_parse_docx, mock_parse_pdf, parser):
    file = MagicMock(spec=UploadFile)
    file.filename = 'resume.docx'
    file.file = MagicMock()
    result = await parser.parse_resume(file)
    assert result['filename'] == 'resume.docx'
    assert result['parsed_text'] == 'DOCX text'
    mock_parse_docx.assert_called_once()
    mock_remove.assert_called()

@pytest.mark.asyncio
@patch('builtins.open', new_callable=MagicMock)
@patch('os.remove')
@patch('shutil.copyfileobj')
async def test_parse_resume_unsupported(mock_copy, mock_remove, mock_open, parser):
    file = MagicMock(spec=UploadFile)
    file.filename = 'resume.txt'
    file.file = MagicMock()
    result = await parser.parse_resume(file)
    assert 'error' in result
    assert result['error'] == 'Unsupported file format'
    mock_remove.assert_called()