import json
import logging
import asyncio
from enum import Enum
from typing import Optional, Dict, Any
from app.services.redis_service import redis_client
from app.services.supabase_service import SupabaseService


class RAGStatus(str, Enum):
    """Status of RAG enhancement process"""
    NOT_STARTED = "not_started"
    ENHANCING = "enhancing"
    VECTOR_SEARCH = "vector_search"
    WEB_SCRAPING = "web_scraping"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"
    TIMEOUT = "timeout"


class RAGService:
    DEFAULT_TIMEOUT = 120  # 2 minutes for RAG enhancement
    
    @staticmethod
    async def request_enhancement(
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
            
            # Update status to enhancing
            await SupabaseService.update_interview_status(interview_id, RAGStatus.ENHANCING.value)
            
            # Publish request to n8n workflow
            recipients = await redis_client.publish(
                "interviewly:request-rag",
                {
                    "interview_id": interview_id,
                    "resume": resume,
                    "job_description": job_description,
                    "company": company,
                    "job_title": job_title
                }
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
                await SupabaseService.update_interview_status(interview_id, RAGStatus.FAILED.value)
                return {
                    "status": "error",
                    "message": "RAG workflow not available",
                    "interview_id": interview_id
                }
                
        except Exception as e:
            logging.error(f"[RAG] Error requesting enhancement: {str(e)}")
            await SupabaseService.update_interview_status(interview_id, RAGStatus.FAILED.value)
            return {
                "status": "error",
                "message": str(e),
                "interview_id": interview_id
            }
    
    @staticmethod
    async def get_enhancement_status(interview_id: str) -> Dict[str, Any]:
        """
        Gets current status of RAG enhancement for an interview.
        Checks both database status and enhanced prompt availability.
        """
        try:
            # Get interview status from database
            interview_response = SupabaseService.get_interview_session(interview_id)
            
            if "error" in interview_response or not interview_response.data:
                return {
                    "status": "error",
                    "message": "Interview not found"
                }
            
            interview = interview_response.data[0]
            current_status = interview.get("status", RAGStatus.NOT_STARTED.value)
            
            # Check if enhanced prompt exists
            enhanced_prompt = await SupabaseService.get_enhanced_prompt(interview_id)
            
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
    
    @staticmethod
    async def wait_for_enhancement(
        interview_id: str,
        timeout: float = DEFAULT_TIMEOUT
    ) -> Dict[str, Any]:
        """
        Waits for RAG enhancement to complete with timeout.
        Used for background tasks - does not block HTTP requests.
        """
        try:
            logging.info(f"[RAG] Waiting for enhancement completion (timeout: {timeout}s)")
            
            start_time = asyncio.get_event_loop().time()
            poll_interval = 2  # Check every 2 seconds
            
            while True:
                elapsed = asyncio.get_event_loop().time() - start_time
                
                if elapsed >= timeout:
                    logging.warning(f"[RAG] Enhancement timeout after {elapsed}s")
                    await SupabaseService.update_interview_status(interview_id, RAGStatus.TIMEOUT.value)
                    return {
                        "status": "timeout",
                        "message": f"Enhancement timed out after {timeout}s",
                        "interview_id": interview_id
                    }
                
                # Check status
                status_result = await RAGService.get_enhancement_status(interview_id)
                current_status = status_result.get("status")
                
                # Check if complete
                if current_status == RAGStatus.READY.value:
                    enhanced_prompt = await SupabaseService.get_enhanced_prompt(interview_id)
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