from app.services.supabase_service import supabase_service
from app.services.parser_service import ResumeParserService
import os
import shutil

resume_parser_service = ResumeParserService()

class WorkflowService:
    async def upload_resume(self, user_id, file):
        # 1. Upload file to Supabase Storage
        upload_response = supabase_service.upload_file(user_id, file, "resumes")
        if not upload_response:
            return upload_response

        # Reset file pointer after reading it during the upload.
        file.file.seek(0)

        # 2. Parse the file locally
        local_path = os.path.join("uploads", file.filename)
        try:
            with open(local_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            if file.filename.endswith(".pdf"):
                extracted_text = ResumeParserService.parse_pdf(local_path)
            elif file.filename.endswith(".docx"):
                extracted_text = ResumeParserService.parse_docx(local_path)
            else:
                os.remove(local_path)
                return {"error": "Unsupported file format"}
        finally:
            if os.path.exists(local_path):
                os.remove(local_path)

        # 3. Construct the public URL or signed URL for the file
        file_path = f"{user_id}/{file.filename}"
        url_response = supabase_service.get_file_url(file_path, "resumes")
        if "error" in url_response:
            return {"error": "Failed to get file URL"}

        # 4. Insert the record into the 'resumes' table
        create_response = supabase_service.create_resume(user_id, url_response, extracted_text)
        return create_response

    def update_extracted_text(self, user_id, updated_text):
        resume = supabase_service.get_resume_table(user_id)
        if not resume or "error" in resume:
            return {"error": "No resume found for the current user"}
        resume_id = resume.data[0]['id']
        response = supabase_service.update_resume(resume_id, updated_text)
        return response

    def get_resume_text(self, user_id):
        return supabase_service.get_resume_table(user_id)

    def create_job_description(self, user_id, job_title, company_name, location, job_type, description):
        return supabase_service.create_job_description(
            user_id=user_id,
            job_title=job_title,
            company_name=company_name,
            location=location,
            job_type=job_type,
            description=description
        )
