# test_feedback.py (put in project root)
import os
import sys
import asyncio
import json
from unittest.mock import patch, MagicMock

# Add project root to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

# Import services after path setup
from app.services.feedback_service import FeedbackService

async def test_with_real_data(interview_id, user_id):
    """Test with real data from database"""
    try:
        print(f"Testing with real data: interview_id={interview_id}, user_id={user_id}")
        result = await FeedbackService.generate_feedback(interview_id, user_id)
        print("✅ Success! Result:", result)
        return result
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":    
    asyncio.run(test_with_real_data("50411bac-b858-4cec-8509-dd2f84f2f0d7", "76b318e6-bccd-453a-b9ff-b6381e508902"))