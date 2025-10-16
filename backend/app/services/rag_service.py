import json
import logging
import asyncio
from enum import Enum
from typing import Optional, Dict, Any
from app.services.redis_service import redis_client
from app.services.supabase_service import supabase_service


class RAGStatus(str, Enum):
    """Status of RAG enhancement process"""
    NOT_STARTED = "pending"
    ENHANCING = "enhancing" 
    VECTOR_SEARCH = "processing"
    WEB_SCRAPING = "processing"
    PROCESSING = "processing"
    READY = "ready"          # This matches your DB constraint
    FAILED = "failed"
    TIMEOUT = "timeout"      # This matches your DB constraint
    QUOTA_EXCEEDED = "quota_exceeded"  # Add this new status


class RAGService:
    def __init__(self):
        self.DEFAULT_TIMEOUT = 120  # 2 minutes for RAG enhancement
    
    
    async def request_enhancement(
        self,
        interview_id: str,
        resume: str,
        job_description: str,
        company: str,
        job_title: str
    ) -> Dict[str, Any]:
        """
        Initiates RAG enhancement process asynchronously.
        Does NOT wait for completion - returns immediately.
        The n8n workflow will process and publish results via Redis.
        """
        try:
            logging.info(f"[RAG] Requesting enhancement for interview {interview_id}")
            
            # Validate inputs - make sure they're not None or empty
            if not resume or resume.strip() == "":
                logging.warning(f"[RAG] Empty resume provided for interview {interview_id}")
                resume = "No resume provided"
            
            if not job_description or job_description.strip() == "":
                logging.warning(f"[RAG] Empty job description provided for interview {interview_id}")
                job_description = "No job description provided"
            
            if not company or company.strip() == "":
                company = "Unknown Company"
                
            if not job_title or job_title.strip() == "":
                job_title = "Unknown Position"

            # Debug logging to see what we're sending
            logging.info(f"[RAG] Sending to n8n - interview_id: {interview_id}")
            logging.info(f"[RAG] Resume length: {len(resume)} chars")
            logging.info(f"[RAG] Job description length: {len(job_description)} chars")
            logging.info(f"[RAG] Company: {company}")
            logging.info(f"[RAG] Job title: {job_title}")
            
            # Update status to enhancing
            await supabase_service.update_interview_status(interview_id, RAGStatus.ENHANCING.value)
            
            # Create message payload - ensure all fields are strings
            message_payload = {
                "interview_id": str(interview_id),
                "resume": str(resume),
                "job_description": str(job_description),
                "company": str(company),
                "job_title": str(job_title)
            }
            
            # Publish request to n8n workflow using the correct Redis client method
            recipients = await redis_client.publish(
                "interviewly:request-rag",
                message_payload  # Pass the dict directly - redis_client should handle JSON serialization
            )
            
            if recipients > 0:
                logging.info(f"[RAG] Enhancement request published to {recipients} subscribers")
                return {
                    "status": "requested",
                    "message": "RAG enhancement initiated",
                    "interview_id": interview_id
                }
            else:
                logging.warning(f"[RAG] No subscribers listening on interviewly:request-rag")
                # Mark as failed if no n8n workflow is listening
                await supabase_service.update_interview_status(interview_id, RAGStatus.FAILED.value)
                return {
                    "status": "error",
                    "message": "RAG workflow not available",
                    "interview_id": interview_id
                }
                
        except Exception as e:
            logging.error(f"[RAG] Error requesting enhancement: {str(e)}")
            await supabase_service.update_interview_status(interview_id, RAGStatus.FAILED.value)
            return {
                "status": "error",
                "message": str(e),
                "interview_id": interview_id
            }
    
    async def get_enhancement_status(self, interview_id: str) -> Dict[str, Any]:
        """
        Gets current status of RAG enhancement for an interview.
        Checks both database status and enhanced prompt availability.
        """
        try:
            # Get interview status from database
            interview_response = supabase_service.get_interview_session(interview_id)
            
            if "error" in interview_response or not interview_response.data:
                return {
                    "status": "error",
                    "message": "Interview not found"
                }
            
            interview = interview_response.data[0]
            current_status = interview.get("status", RAGStatus.NOT_STARTED.value)
            
            # Check if enhanced prompt exists
            enhanced_prompt = await supabase_service.get_enhanced_prompt(interview_id)
            
            return {
                "status": current_status,
                "enhanced_prompt_available": enhanced_prompt is not None,
                "interview_id": interview_id
            }
            
        except Exception as e:
            logging.error(f"[RAG] Error getting enhancement status: {str(e)}")
            return {
                "status": "error",
                "message": str(e),
                "interview_id": interview_id
            }
    
    async def wait_for_enhancement(
        self,
        interview_id: str,
        timeout: float = None
    ) -> Dict[str, Any]:
        """
        Waits for RAG enhancement to complete with timeout.
        Used for background tasks - does not block HTTP requests.
        """
        if timeout is None:
            timeout = self.DEFAULT_TIMEOUT
            
        try:
            logging.info(f"[RAG] Waiting for enhancement completion (timeout: {timeout}s)")
            
            start_time = asyncio.get_event_loop().time()
            poll_interval = 2  # Check every 2 seconds
            
            while True:
                elapsed = asyncio.get_event_loop().time() - start_time
                
                if elapsed >= timeout:
                    logging.warning(f"[RAG] Enhancement timeout after {elapsed}s")
                    await supabase_service.update_interview_status(interview_id, RAGStatus.TIMEOUT.value)
                    return {
                        "status": "timeout",
                        "message": f"Enhancement timed out after {timeout}s",
                        "interview_id": interview_id
                    }
                
                # Check status
                status_result = await self.get_enhancement_status(interview_id)
                current_status = status_result.get("status")
                
                # Check if complete
                if current_status == RAGStatus.READY.value:
                    enhanced_prompt = await supabase_service.get_enhanced_prompt(interview_id)
                    return {
                        "status": "success",
                        "enhanced_prompt": enhanced_prompt,
                        "interview_id": interview_id
                    }
                
                # Check if failed
                if current_status in [RAGStatus.FAILED.value, RAGStatus.TIMEOUT.value]:
                    return {
                        "status": "failed",
                        "message": f"Enhancement failed with status: {current_status}",
                        "interview_id": interview_id
                    }
                
                # Wait before next poll
                await asyncio.sleep(poll_interval)
                
        except Exception as e:
            logging.error(f"[RAG] Error waiting for enhancement: {str(e)}")
            return {
                "status": "error",
                "message": str(e),
                "interview_id": interview_id
            }

# Singleton instance of RAGService for use throughout the app
rag_service = RAGService()