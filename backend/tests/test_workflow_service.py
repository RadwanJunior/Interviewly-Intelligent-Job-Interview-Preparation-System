import pytest
from unittest.mock import patch, MagicMock, mock_open
import io
from app.services.workflow_service import WorkflowService

class TestWorkflowService:
    """Test suite for the WorkflowService class."""
    
    @pytest.fixture
    def mock_supabase(self):
        """Create a mock Supabase service specific to workflow tests.
        
        This fixture provides specialized mock behavior for the Supabase service
        that is tailored to the workflow service tests in this file.
        """
        mock = MagicMock()
        # Setup common mock responses
        mock.upload_file.return_value = {"path": "user-id/test.pdf"}
        mock.get_file_url.return_value = "https://test-bucket.com/user-id/test.pdf"
        mock.create_resume.return_value = {"id": "resume-id", "user_id": "user-id", "file_url": "https://test-bucket.com/user-id/test.pdf"}
        mock.get_resume_table.return_value = MagicMock(data=[{"id": "resume-id", "extracted_text": "Resume content"}])
        mock.update_resume.return_value = {"id": "resume-id", "extracted_text": "Updated content"}
        mock.create_job_description.return_value = {"id": "job-id", "user_id": "user-id", "job_title": "Software Engineer"}
        return mock
    
    @pytest.fixture
    def service(self):
        """Create a WorkflowService instance."""
        return WorkflowService()
    
    @pytest.mark.asyncio
    async def test_upload_resume_pdf_success(self, service, mock_supabase, mock_resume_file):
        """Test successful PDF resume upload."""
        # Setup
        user_id = "test-user-id"
        
        # Create a FastAPI UploadFile-compatible mock
        mock_file = MagicMock()
        mock_file.filename = mock_resume_file["filename"]
        mock_file.file = mock_resume_file["file"]
        
        # Patch dependencies
        with patch('app.services.workflow_service.supabase_service', mock_supabase), \
             patch('app.services.workflow_service.ResumeParserService.parse_pdf', return_value="Extracted text from PDF"), \
             patch('builtins.open', mock_open()), \
             patch('os.path.exists', return_value=True), \
             patch('os.remove'):
            
            # Execute
            result = await service.upload_resume(user_id, mock_file)
            
            # Verify
            mock_supabase.upload_file.assert_called_once_with(user_id, mock_file, "resumes")
            mock_supabase.get_file_url.assert_called_once_with(f"{user_id}/{mock_file.filename}", "resumes")
            mock_supabase.create_resume.assert_called_once_with(user_id, "https://test-bucket.com/user-id/test.pdf", "Extracted text from PDF")
            assert result["id"] == "resume-id"
    
    @pytest.mark.asyncio
    async def test_upload_resume_docx_success(self, service, mock_supabase, mock_docx_file):
        """Test successful DOCX resume upload."""
        # Setup
        user_id = "test-user-id"
        
        # Configure specific mock returns for this test
        mock_supabase.upload_file.return_value = {"path": "user-id/test.docx"}
        mock_supabase.get_file_url.return_value = "https://test-bucket.com/user-id/test.docx"
        mock_supabase.create_resume.return_value = {"id": "resume-id", "user_id": "user-id", "file_url": "https://test-bucket.com/user-id/test.docx"}
        
        # Create a FastAPI UploadFile-compatible mock
        mock_file = MagicMock()
        mock_file.filename = mock_docx_file["filename"]
        mock_file.file = mock_docx_file["file"]
        
        # Patch dependencies
        with patch('app.services.workflow_service.supabase_service', mock_supabase), \
             patch('app.services.workflow_service.ResumeParserService.parse_docx', return_value="Extracted text from DOCX"), \
             patch('builtins.open', mock_open()), \
             patch('os.path.exists', return_value=True), \
             patch('os.remove'):
            
            # Execute
            result = await service.upload_resume(user_id, mock_file)
            
            # Verify
            mock_supabase.upload_file.assert_called_once_with(user_id, mock_file, "resumes")
            mock_supabase.get_file_url.assert_called_once_with(f"{user_id}/{mock_file.filename}", "resumes")
            mock_supabase.create_resume.assert_called_once_with(user_id, "https://test-bucket.com/user-id/test.docx", "Extracted text from DOCX")
            assert result["id"] == "resume-id"
    
    @pytest.mark.asyncio
    async def test_upload_resume_unsupported_format(self, service, mock_supabase):
        """Test upload with unsupported file format."""
        # Setup
        user_id = "test-user-id"
        
        # Create a FastAPI UploadFile-compatible mock with unsupported extension
        mock_file = MagicMock()
        mock_file.filename = "test_resume.txt"
        mock_file.file = io.BytesIO(b"Mock TXT content for testing")
        
        # Patch dependencies
        with patch('app.services.workflow_service.supabase_service', mock_supabase), \
             patch('builtins.open', mock_open()), \
             patch('os.path.exists', return_value=True), \
             patch('os.remove'):
            
            # Execute
            result = await service.upload_resume(user_id, mock_file)
            
            # Verify
            assert "error" in result
            assert result["error"] == "Unsupported file format"
    
    @pytest.mark.asyncio
    async def test_upload_resume_upload_failure(self, service, mock_supabase, mock_resume_file):
        """Test resume upload with storage upload failure."""
        # Setup
        user_id = "test-user-id"
        
        # Configure mock to simulate upload failure
        mock_supabase.upload_file.return_value = None
        
        # Patch dependencies
        with patch('app.services.workflow_service.supabase_service', mock_supabase):
            
            # Execute
            result = await service.upload_resume(user_id, mock_resume_file)
            
            # Verify
            assert result is None
            mock_supabase.upload_file.assert_called_once_with(user_id, mock_resume_file, "resumes")
            mock_supabase.get_file_url.assert_not_called()
            mock_supabase.create_resume.assert_not_called()
    
    def test_update_extracted_text_success(self, service, mock_supabase):
        """Test successful update of extracted text."""
        # Setup
        user_id = "test-user-id"
        updated_text = "Updated resume content"
        
        # Configure specific mock returns for this test
        mock_supabase.get_resume_table.return_value = MagicMock(data=[{"id": "resume-id", "extracted_text": "Resume content"}])
        mock_supabase.update_resume.return_value = {"id": "resume-id", "extracted_text": "Updated content"}
        
        # Patch dependencies
        with patch('app.services.workflow_service.supabase_service', mock_supabase):
            
            # Execute
            result = service.update_extracted_text(user_id, updated_text)
            
            # Verify
            mock_supabase.get_resume_table.assert_called_once_with(user_id)
            mock_supabase.update_resume.assert_called_once_with("resume-id", updated_text)
            assert result["id"] == "resume-id"
            assert result["extracted_text"] == "Updated content"
    
    def test_update_extracted_text_no_resume(self, service, mock_supabase):
        """Test update extracted text when no resume exists."""
        # Setup
        user_id = "test-user-id"
        updated_text = "Updated resume content"
        
        # Configure mock to simulate no resume found
        mock_supabase.get_resume_table.return_value = None
        
        # Patch dependencies
        with patch('app.services.workflow_service.supabase_service', mock_supabase):
            
            # Execute
            result = service.update_extracted_text(user_id, updated_text)
            
            # Verify
            assert "error" in result
            assert result["error"] == "No resume found for the current user"
            mock_supabase.update_resume.assert_not_called()
    
    def test_get_resume_text(self, service, mock_supabase):
        """Test getting resume text."""
        # Setup
        user_id = "test-user-id"
        
        # Configure specific mock returns for this test
        mock_supabase.get_resume_table.return_value = MagicMock(data=[{"id": "resume-id", "extracted_text": "Resume content"}])
        
        # Patch dependencies
        with patch('app.services.workflow_service.supabase_service', mock_supabase):
            
            # Execute
            result = service.get_resume_text(user_id)
            
            # Verify
            mock_supabase.get_resume_table.assert_called_once_with(user_id)
            assert result.data[0]["extracted_text"] == "Resume content"
    
    def test_create_job_description(self, service, mock_supabase):
        """Test creating a job description."""
        # Setup
        user_id = "test-user-id"
        job_title = "Software Engineer"
        company_name = "Tech Corp"
        location = "Remote"
        job_type = "Full-time"
        description = "Job description content"
        
        # Configure specific mock returns for this test
        mock_supabase.create_job_description.return_value = {"id": "job-id", "user_id": "user-id", "job_title": "Software Engineer"}
        
        # Patch dependencies
        with patch('app.services.workflow_service.supabase_service', mock_supabase):
            
            # Execute
            result = service.create_job_description(
                user_id, job_title, company_name, location, job_type, description
            )
            
            # Verify
            mock_supabase.create_job_description.assert_called_once_with(
                user_id=user_id,
                job_title=job_title,
                company_name=company_name,
                location=location,
                job_type=job_type,
                description=description
            )
            assert result["id"] == "job-id"
