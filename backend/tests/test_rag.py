import asyncio
import json
import os
from app.services.redis_service import subscribe_to_channels, publish_message

async def test_rag_workflow():
    """Test the RAG workflow with a sample interview context"""
    # Subscribe to channels
    pubsub = await subscribe_to_channels("interviewly:prompt-ready", "interviewly:data-collection-started")
    
    # Sample data
    interview_id = "test-interview-123"
    company = "Google"
    job_title = "Software Engineer"
    resume = """
    John Doe
    Software Engineer
    
    Experience:
    - 5 years experience in full-stack development
    - Proficient in Python, JavaScript, and React
    - Built scalable web applications using Django and Node.js
    
    Education:
    - Bachelor's in Computer Science, University of Ottawa
    """
    job_description = """
    Software Engineer at Google
    
    Responsibilities:
    - Design and develop high-volume, low-latency applications
    - Write clean, maintainable code
    - Collaborate with cross-functional teams
    
    Requirements:
    - Strong knowledge of algorithms and data structures
    - Experience with Python and JavaScript
    - Bachelor's degree in Computer Science or related field
    """
    
    # Request RAG enhancement
    print("Requesting RAG enhancement...")
    await publish_message(
        "interviewly:request-rag",
        {
            "interview_id": interview_id,
            "company": company,
            "job_title": job_title,
            "resume": resume,
            "job_description": job_description
        }
    )
    
    # Wait for responses
    timeout = 60  # seconds
    start_time = asyncio.get_event_loop().time()
    while asyncio.get_event_loop().time() - start_time < timeout:
        message = await pubsub.get_message(ignore_subscribe_messages=True)
        if message:
            channel = message["channel"].decode("utf-8")
            data = json.loads(message["data"].decode("utf-8"))
            
            if channel == "interviewly:prompt-ready":
                print("\n=== Enhanced Prompt Ready ===")
                print(f"Interview ID: {data['interview_id']}")
                print(f"Enhanced Prompt: {data['enhanced_prompt'][:200]}...")
                return
                
            elif channel == "interviewly:data-collection-started":
                print("\n=== Data Collection Started ===")
                print(f"Interview ID: {data['interview_id']}")
                print("Waiting for collection to complete...")
        
        await asyncio.sleep(0.1)
    
    print("Timeout waiting for response")

if __name__ == "__main__":
    asyncio.run(test_rag_workflow())