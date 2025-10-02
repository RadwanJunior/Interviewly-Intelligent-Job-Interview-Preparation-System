
# Import Supabase service for storage and database operations
from app.services.supabase_service import supabase_service
# Import resume parser for extracting text from uploaded files
from app.services.parser_service import ResumeParserService
import os
import shutil


# Instantiate the resume parser service (used for PDF/DOCX parsing)
resume_parser_service = ResumeParserService()


class WorkflowService:
    """
    Service class to handle resume and job description workflows.
    Provides methods for uploading, parsing, storing, and updating resumes, as well as creating job descriptions.
    """

    async def upload_resume(self, user_id, file):
        # Receives a user ID and an uploaded file object (should have .file and .filename attributes)
        # 1. Upload file to Supabase Storage
        upload_response = await supabase_service.upload_file(user_id, file, "resumes")
        if not upload_response:
            # If upload fails, return the error/response
            return upload_response

        # Reset file pointer after reading it during the upload.
        # This is necessary because file streams are exhausted after reading
        file.file.seek(0)

        # 2. Parse the file locally
        # Save the uploaded file to a temporary local path for parsing
        local_path = os.path.join("uploads", file.filename)
        try:
            with open(local_path, "wb") as buffer:
                # Copy the file stream to the local file
                shutil.copyfileobj(file.file, buffer)

            # Check file extension and parse accordingly
            if file.filename.endswith(".pdf"):
                # Extract text from PDF resumes
                extracted_text = resume_parser_service.parse_pdf(local_path)
            elif file.filename.endswith(".docx"):
                # Extract text from DOCX resumes
                extracted_text = resume_parser_service.parse_docx(local_path)
            else:
                # Unsupported file format, clean up and return error
                os.remove(local_path)
                return {"error": "Unsupported file format"}
        finally:
            # Always remove the local file after parsing to avoid clutter
            if os.path.exists(local_path):
                os.remove(local_path)

        # 3. Construct the public URL or signed URL for the file
        # This URL will be used to access the file from the frontend or other services
        file_path = f"{user_id}/{file.filename}"
        url_response = supabase_service.get_file_url(file_path, "resumes")
        if "error" in url_response:
            # If URL generation fails, return error
            return {"error": "Failed to get file URL"}

        # 4. Insert the record into the 'resumes' table
        # Store the resume metadata, file URL, and extracted text in the database
        create_response = supabase_service.create_resume(user_id, url_response, extracted_text)
        return create_response


    def update_extracted_text(self, user_id, updated_text):
        # Update the extracted text for a user's resume in the database
        # user_id: ID of the user whose resume is being updated
        # updated_text: New text to replace the old extracted text
        resume = supabase_service.get_resume_table(user_id)
        if not resume or "error" in resume:
            # No resume found for this user
            return {"error": "No resume found for the current user"}
        # Get the resume ID from the first record (assuming one resume per user)
        resume_id = resume.data[0]['id']
        response = supabase_service.update_resume(resume_id, updated_text)
        return response


    def get_resume_text(self, user_id):
        # Retrieve the resume record(s) for a given user
        # Returns the database entry for the user's resume
        return supabase_service.get_resume_table(user_id)


    def create_job_description(self, user_id, job_title, company_name, location, job_type, description):
        # Create a new job description entry in the database for the user
        # Parameters:
        #   user_id: ID of the user
        #   job_title: Title of the job
        #   company_name: Name of the company
        #   location: Job location
        #   job_type: Type of job (e.g., full-time, part-time)
        #   description: Full job description text
        return supabase_service.create_job_description(
            user_id=user_id,
            job_title=job_title,
            company_name=company_name,
            location=location,
            job_type=job_type,
            description=description
        )
