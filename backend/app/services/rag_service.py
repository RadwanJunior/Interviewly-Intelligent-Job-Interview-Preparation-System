import json
import logging
import asyncio
from app.services.redis_service import redis_client

class RAGService:
    @staticmethod
    async def initiate_interview(interview_id, resume, job_description, company, job_title):
        """Initiates and waits for the RAG process to complete"""
        try:
            logging.info(f"Initiating RAG enhancement for interview {interview_id}")
            
            # Create an event to wait for completion
            completion_event = asyncio.Event()
            enhanced_prompt = None
            
            # Define a callback for when the enhanced prompt is ready
            async def handle_prompt_ready(message):
                data = message["data"]
                if data.get("interview_id") == interview_id:
                    nonlocal enhanced_prompt
                    enhanced_prompt = data.get("enhanced_prompt")
                    completion_event.set()
            
            # Subscribe to the prompt-ready channel
            await redis_client.subscribe("interviewly:prompt-ready", handle_prompt_ready)
            
            # Publish the request
            await redis_client.publish(
                "interviewly:request-rag",
                {
                    "interview_id": interview_id,
                    "resume": resume,
                    "job_description": job_description,
                    "company": company,
                    "job_title": job_title
                }
            )
            
            # Wait for the response with a timeout
            try:
                await asyncio.wait_for(completion_event.wait(), timeout=30.0)  # 30 second timeout
                await redis_client.unsubscribe("interviewly:prompt-ready", handle_prompt_ready)
                return {"status": "success", "enhanced_prompt": enhanced_prompt}
            except asyncio.TimeoutError:
                # If we time out, continue with basic questions
                logging.warning(f"RAG enhancement timed out for interview {interview_id}")
                await redis_client.unsubscribe("interviewly:prompt-ready", handle_prompt_ready)
                return {"status": "timeout"}
            
        except Exception as e:
            logging.error(f"Error during RAG enhancement: {str(e)}")
            return {"status": "error", "message": str(e)}