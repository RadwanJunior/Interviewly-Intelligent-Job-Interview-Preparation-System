# test_feedback.py (put in project root)
"""
test_feedback.py - Manual/async test for FeedbackService.generate_feedback
Allows running a real feedback generation test with hardcoded interview and user IDs.
Not a pytest test: run directly for manual integration/debugging.
"""
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
    """
    Run FeedbackService.generate_feedback with real interview and user IDs.
    Prints the result or error for manual inspection.
    Args:
        interview_id (str): The interview session ID.
        user_id (str): The user ID.
    Returns:
        The result of feedback generation, or None if an error occurs.
    """
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
    # Run the test with hardcoded IDs when this script is executed directly
    asyncio.run(test_with_real_data("50411bac-b858-4cec-8509-dd2f84f2f0d7", "76b318e6-bccd-453a-b9ff-b6381e508902"))