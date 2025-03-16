from speechmatics.models import ConnectionSettings
from speechmatics.batch_client import BatchClient
from httpx import HTTPStatusError
import os
import dotenv
import time

dotenv.load_dotenv()

API_KEY = os.getenv("SPEECHMATICS_API_KEY")
LANGUAGE = "en"

settings = ConnectionSettings(
    url="https://asr.api.speechmatics.com/v2",
    auth_token=API_KEY,
)

# Define transcription parameters
conf = {
    "type": "transcription",
    "transcription_config": {
        "language": LANGUAGE
    }
}

def transcribe_audio(file_path: str):
    """Submits an audio file for transcription and returns the job ID."""
    with BatchClient(settings) as client:
        try:
            job_id = client.submit_job(
                audio=file_path,
                transcription_config=conf,
            )
            print(f'Job {job_id} submitted successfully')
            return job_id
        except HTTPStatusError as e:
            if e.response.status_code == 401:
                print('Invalid API key - Check your API_KEY at the top of the code!')
            elif e.response.status_code == 400:
                print(e.response.json()['detail'])
            else:
                raise e

def get_transcription_result(job_id: str):
    """Checks the status of the transcription job and returns the transcript if complete."""
    with BatchClient(settings) as client:
        try:
            while True:
                job_status = client.check_job_status(job_id)
                print(job_status)
                # Extract the status from the nested 'job' object
                status = job_status['job']['status']
                
                if status == 'done':
                    transcript = client.get_job_result(job_id, transcription_format='txt')
                    print(transcript)
                    return transcript
                elif status == 'failed':
                    print(f'Job {job_id} failed: {job_status["job"].get("message", "Unknown error")}')
                    return None
                else:
                    print(f'Job {job_id} is {status}, checking again in 10 seconds...')
                    time.sleep(10)
        except HTTPStatusError as e:
            print(f'Error checking job status: {e}')
            raise e

# Example usage:
# job_id = transcribe_audio("backend/tests/test_audio.m4a")
# transcript = get_transcription_result(job_id)

# print(transcript)
