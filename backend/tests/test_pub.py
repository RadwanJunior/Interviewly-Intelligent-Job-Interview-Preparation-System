# test_publisher.py
from upstash_redis import Redis
import json

redis = Redis(
    url="https://refined-albacore-24717.upstash.io",
    token="AWCNAAIncDE2ZTZjMWNmMDVkZmY0ZWZkOTU0MWFjMTQzNTZkZDBjOXAxMjQ3MTc"
)

test_data = {
    "interview_id": "test-123",
    "resume": "Full Stack Developer with 5 years of experience in React, Node.js, and cloud technologies.",
    "job_description": "Looking for a Senior Full Stack Developer with strong React and Node.js skills.",
    "company": "Tech Innovations Inc",
    "job_title": "Senior Full Stack Developer"
}

# Publish to the channel that n8n is listening to
redis.publish("interviewly:request-rag", json.dumps(test_data))
print("Test message published!") 