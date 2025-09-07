from upstash_redis import Redis
import json
import time

# Connect to Upstash Redis
redis = Redis(
    url="https://refined-albacore-24717.upstash.io",
    token="AWCNAAIncDE2ZTZjMWNmMDVkZmY0ZWZkOTU0MWFjMTQzNTZkZDBjOXAxMjQ3MTc"  # Replace with your actual token
)

print("Listening for messages on interviewly:prompt-ready...")
print("(Using polling approach with Upstash REST API)")

# Track the last message to avoid duplicates
last_message = None

try:
    while True:
        # We'll poll for messages using GET since upstash-redis doesn't support traditional PubSub
        message = redis.get("interviewly:prompt-ready:last")
        
        # Only process if this is a new message
        if message is not None and message != last_message:
            last_message = message
            print("New message received!")
            
            try:
                parsed_message = json.loads(message)
                print("Interview ID:", parsed_message.get("interview_id", "unknown"))
                print("Source:", parsed_message.get("source", "unknown"))
                
                if "enhanced_prompt" in parsed_message:
                    print("Enhanced Prompt (first 100 chars):", 
                          parsed_message["enhanced_prompt"][:100] + "...")
                    
                    print("\n----- FULL PROMPT -----\n")
                    print(parsed_message["enhanced_prompt"])
                else:
                    print("No prompt found in message")
                    
            except (json.JSONDecodeError, TypeError) as e:
                print(f"Error parsing message: {e}")
                print("Raw message:", message)
        
        time.sleep(1)  # Check every second
        
except KeyboardInterrupt:
    print("\nStopping listener...")
    print("Exiting.")