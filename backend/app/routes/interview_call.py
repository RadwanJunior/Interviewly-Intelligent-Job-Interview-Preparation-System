from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from app.services.supabase_service import supabase_service
from google import genai
from google.genai import types
from google.api_core import exceptions as google_exceptions
import os
import asyncio
import json  
import logging
from fastapi.background import BackgroundTasks
import wave
import io
from websockets.exceptions import ConnectionClosed
from app.services.conversation_service import ConversationService
import time
import httpx  # Add this import
from datetime import datetime, timezone

# --- LOGGING AND CONSTANTS ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
router = APIRouter()
conversation_service = ConversationService(supabase_service)

MODEL_NAME = "gemini-2.5-flash-native-audio-preview-09-2025"

# ADD RATE LIMITING
_connection_attempts = {}
_cooldown_period = 60

# CREATE SHARED HTTP CLIENT WITH CONNECTION POOLING
_http_client = None

def get_http_client():
    """Get or create shared HTTP client with proper connection limits"""
    global _http_client
    if _http_client is None:
        limits = httpx.Limits(
            max_keepalive_connections=5,
            max_connections=10,
            keepalive_expiry=30.0
        )
        _http_client = httpx.AsyncClient(
            limits=limits,
            timeout=httpx.Timeout(30.0),
            http2=True
        )
    return _http_client

SYSTEM_PROMPT_TEMPLATE = """
You are an expert technical interviewer named 'Alex'. You are conducting a professional job interview for a technical role. Treat this like a real interview at a top company.

Your persona is professional with appropriate warmth - firm but fair. Your primary goal is to thoroughly assess the candidate's technical abilities and job fit.

IMPORTANT INTERVIEW BEHAVIORS:
1. Start with a brief introduction and explanation of the role.
2. Ask a mix of questions with this distribution:
   - technical questions directly related to the skills in the job description
   - behavioral questions requiring specific examples from the candidate's past
   - resume-based questions that probe the candidate's listed experiences and skills
   - hypothetical problem-solving scenarios relevant to the role

3. CRITICAL: Do not accept vague or deflective answers:
   - When the candidate gives a general answer, respond with "Could you provide a specific example?"
   - If they deflect, say "Let's circle back to my question about [topic]"
   - For technical questions, probe deeper with "How would you implement that?" or "What specific approach would you take?"

4. Always ask at least one follow-up question for each main question to verify depth of knowledge.
5. For technical skills mentioned in the resume or job description, ask for concrete examples of how they've applied them.
6. If the candidate claims expertise in a technology, ask them to explain a complex concept related to it.

Candidate's Resume:
{resume}

Job Description:
{job_description}

Remember to remain professional but persistent. Your job is to thoroughly assess the candidate's qualifications and ensure they provide substantive answers with specific examples.
"""

# --- SIMPLIFIED TURN TRACKING ---
class ConversationTurn:
    def __init__(self, speaker: str, turn_index: int = None):
        self.speaker = speaker
        self.text = ""
        self.audio_chunks = []
        self._saved = False
        self.turn_index = turn_index

class UploadQueue:
    """Sequential upload queue with connection pooling"""
    def __init__(self):
        self.queue = asyncio.Queue()
        self.worker_task = None
    
    def start(self):
        self.worker_task = asyncio.create_task(self._worker())
    
    async def stop(self):
        if self.worker_task:
            await self.queue.join()
            self.worker_task.cancel()
            try:
                await self.worker_task
            except asyncio.CancelledError:
                pass
    
    async def add(self, turn: ConversationTurn, interview_id: str, turn_index: int, user_id: str):
        if turn._saved:
            logging.info(f"[{interview_id}] Turn {turn_index} ({turn.speaker}) already marked as saved, skipping")
            return
        
        turn._saved = True
        
        turn_data = {
            "speaker": turn.speaker,
            "audio_chunks": list(turn.audio_chunks),
            "text": turn.text,
            "turn_index": turn_index
        }
        
        logging.info(f"[{interview_id}] Adding {turn.speaker} turn {turn_index} to upload queue (queue size: {self.queue.qsize()})")
        await self.queue.put((turn_data, interview_id, user_id, turn_index))
    
    async def _worker(self):
        logging.info("UploadQueue worker started")
        while True:
            try:
                turn_data, interview_id, user_id, turn_index = await self.queue.get()
                
                speaker = turn_data.get("speaker")
                audio_count = len(turn_data.get("audio_chunks", []))
                
                logging.info(f"[{interview_id}] Worker processing {speaker} turn {turn_index} ({audio_count} audio chunks)")
                
                try:
                    # Add delay between uploads to prevent SSL errors
                    await asyncio.sleep(0.5)
                    
                    result = await conversation_service.process_turn_audio(
                        turn_data=turn_data,
                        interview_id=interview_id,
                        user_id=user_id,
                        turn_index=turn_index
                    )
                    
                    if result.get("status") == "success":
                        logging.info(f"[{interview_id}] ✓ Successfully uploaded {speaker} turn {turn_index}")
                    else:
                        logging.error(f"[{interview_id}] ✗ Failed to upload {speaker} turn {turn_index}: {result.get('reason')}")
                
                except Exception as e:
                    logging.error(f"[{interview_id}] Upload error for turn {turn_index}: {e}", exc_info=True)
                finally:
                    self.queue.task_done()
            
            except asyncio.CancelledError:
                logging.info("UploadQueue worker cancelled")
                break
            except Exception as e:
                logging.error(f"Critical error in UploadQueue worker: {e}", exc_info=True)


AUDIO_BUFFER_SIZE = 16000
AUDIO_SEND_INTERVAL = 1.0

async def client_to_gemini_task(websocket: WebSocket, session: genai.live.AsyncSession, interview_id: str, conversation_turns: list, user_id: str, turn_index_ref: dict, upload_queue: UploadQueue):
    """Handles streaming user audio to Gemini with buffering"""
    logging.info(f"[{interview_id}] Starting client-to-gemini task.")
    
    audio_buffer = bytearray()
    last_send_time = asyncio.get_event_loop().time()
    last_audio_time = None
    USER_SILENCE_THRESHOLD = 1.5  # Auto-save after 1.5 seconds of silence
    silence_check_task = None
    
    async def flush_buffer():
        nonlocal audio_buffer, last_send_time
        if len(audio_buffer) > 0:
            try:
                await session.send_realtime_input(
                    audio=types.Blob(data=bytes(audio_buffer), mime_type="audio/pcm;rate=16000")
                )
                audio_buffer = bytearray()
                last_send_time = asyncio.get_event_loop().time()
            except Exception as e:
                logging.error(f"[{interview_id}] Error sending audio: {e}")
    
    async def save_current_user_turn(transcription: str = None):
        """Helper to save the current user turn"""
        if conversation_turns and conversation_turns[-1].speaker == "user":
            user_turn = conversation_turns[-1]
            if not user_turn._saved and user_turn.audio_chunks:
                if transcription:
                    user_turn.text = transcription
                
                chunk_count = len(user_turn.audio_chunks)
                logging.info(f"[{interview_id}] Saving user turn {user_turn.turn_index} ({chunk_count} chunks)")
                await upload_queue.add(user_turn, interview_id, user_turn.turn_index, user_id)
                return True
        return False
    
    async def monitor_silence():
        """Background task to auto-save user turn after silence"""
        nonlocal last_audio_time
        try:
            while True:
                await asyncio.sleep(0.5)
                
                if last_audio_time and conversation_turns:
                    silence_duration = asyncio.get_event_loop().time() - last_audio_time
                    
                    # If silence threshold exceeded and user turn is active
                    if silence_duration > USER_SILENCE_THRESHOLD:
                        if conversation_turns[-1].speaker == "user" and not conversation_turns[-1]._saved:
                            logging.info(f"[{interview_id}] Auto-saving user turn after {silence_duration:.1f}s silence")
                            await flush_buffer()
                            await save_current_user_turn()
                            await session.send_realtime_input(audio_stream_end=True)
                            last_audio_time = None
        except asyncio.CancelledError:
            logging.info(f"[{interview_id}] Silence monitor cancelled")
            raise
    
    # Start silence monitoring
    silence_check_task = asyncio.create_task(monitor_silence())
    
    try:
        while True:
            event = await websocket.receive()

            if 'bytes' in event and event['bytes']:
                chunk = event['bytes']
                last_audio_time = asyncio.get_event_loop().time()
                
                if not conversation_turns or conversation_turns[-1].speaker != "user":
                    turn_index_ref['value'] += 1
                    new_user_turn = ConversationTurn("user", turn_index_ref['value'])
                    conversation_turns.append(new_user_turn)
                    logging.info(f"[{interview_id}] User started speaking, created turn {turn_index_ref['value']}")
                
                conversation_turns[-1].audio_chunks.append(chunk)
                
                audio_buffer.extend(chunk)
                current_time = asyncio.get_event_loop().time()
                
                if len(audio_buffer) >= AUDIO_BUFFER_SIZE or (current_time - last_send_time) >= AUDIO_SEND_INTERVAL:
                    await flush_buffer()

            elif 'text' in event:
                message = json.loads(event['text'])
                if message.get("type") == "USER_AUDIO_END":
                    logging.info(f"[{interview_id}] User finished speaking (USER_AUDIO_END).")
                    
                    await flush_buffer()
                    await save_current_user_turn(message.get("transcription"))
                    await session.send_realtime_input(audio_stream_end=True)
                    last_audio_time = None

    except (ConnectionClosed, WebSocketDisconnect, RuntimeError):
        logging.info(f"[{interview_id}] Client disconnected.")
        
        if silence_check_task:
            silence_check_task.cancel()
            try:
                await silence_check_task
            except asyncio.CancelledError:
                pass
        
        # Save incomplete user turn on disconnect
        await flush_buffer()
        saved = await save_current_user_turn()
        if saved:
            logging.info(f"[{interview_id}] Saved incomplete user turn on disconnect")
    
    except Exception as e:
        if silence_check_task:
            silence_check_task.cancel()
            try:
                await silence_check_task
            except asyncio.CancelledError:
                pass
        logging.error(f"[{interview_id}] Error in client_to_gemini: {e}", exc_info=True)


async def gemini_to_client_task(websocket: WebSocket, session: genai.live.AsyncSession, interview_id: str, conversation_turns: list, user_id: str, turn_index_ref: dict, upload_queue: UploadQueue):
    """Receives audio from Gemini and sends to client"""
    logging.info(f"[{interview_id}] Starting gemini-to-client task.")
    
    saved_turn_indices = set()
    
    try:
        while True:
            message = await session._receive()
            
            if message.data:
                pcm_data = message.data
                
                if not conversation_turns or conversation_turns[-1].speaker != "ai":
                    # SAVE THE PREVIOUS USER TURN BEFORE CREATING NEW AI TURN
                    if conversation_turns and conversation_turns[-1].speaker == "user":
                        user_turn = conversation_turns[-1]
                        if not user_turn._saved and user_turn.audio_chunks:
                            logging.info(f"[{interview_id}] Saving user turn {user_turn.turn_index} before AI response ({len(user_turn.audio_chunks)} chunks)")
                            await upload_queue.add(user_turn, interview_id, user_turn.turn_index, user_id)
                    
                    turn_index_ref['value'] += 1
                    new_ai_turn = ConversationTurn("ai", turn_index_ref['value'])
                    conversation_turns.append(new_ai_turn)
                    logging.info(f"[{interview_id}] AI started speaking, created turn {turn_index_ref['value']}")
                
                conversation_turns[-1].audio_chunks.append(pcm_data)
                
                wav_buffer = io.BytesIO()
                with wave.open(wav_buffer, 'wb') as wav_file:
                    wav_file.setnchannels(1)
                    wav_file.setsampwidth(2)
                    wav_file.setframerate(24000)
                    wav_file.writeframes(pcm_data)
                
                wav_buffer.seek(0)
                await websocket.send_bytes(wav_buffer.read())
            
            if message.text:
                if conversation_turns and conversation_turns[-1].speaker == "ai":
                    conversation_turns[-1].text += message.text
            
            if message.server_content and message.server_content.turn_complete:
                if not conversation_turns:
                    logging.error(f"[{interview_id}] turn_complete received but conversation_turns is empty!")
                    continue
                
                ai_turn = None
                
                # Find the most recent AI turn
                for i in range(len(conversation_turns) - 1, -1, -1):
                    if conversation_turns[i].speaker == "ai":
                        ai_turn = conversation_turns[i]
                        logging.info(f"[{interview_id}] AI turn {ai_turn.turn_index} complete (found at position {i - len(conversation_turns)})")
                        break
                
                if not ai_turn:
                    logging.error(f"[{interview_id}] Cannot find any AI turn!")
                    continue
                
                ai_turn_index = ai_turn.turn_index
                
                if ai_turn_index in saved_turn_indices:
                    logging.info(f"[{interview_id}] AI turn {ai_turn_index} already saved, ignoring duplicate turn_complete")
                    await websocket.send_json({"type": "AI_TURN_COMPLETE"})
                    continue
                
                audio_chunk_count = len(ai_turn.audio_chunks)
                total_audio_bytes = sum(len(chunk) for chunk in ai_turn.audio_chunks)
                
                logging.info(f"[{interview_id}] Finalizing AI turn {ai_turn_index}: {audio_chunk_count} chunks, {total_audio_bytes} bytes")
                
                if audio_chunk_count > 0 or ai_turn.text:
                    await upload_queue.add(ai_turn, interview_id, ai_turn_index, user_id)
                    saved_turn_indices.add(ai_turn_index)
                    logging.info(f"[{interview_id}] ✓ Queued AI turn {ai_turn_index}")
                else:
                    logging.warning(f"[{interview_id}] AI turn {ai_turn_index} has no content")
                
                await websocket.send_json({"type": "AI_TURN_COMPLETE"})

    except ConnectionClosed:
        logging.info(f"[{interview_id}] Gemini connection closed.")
    except Exception as e:
        logging.error(f"[{interview_id}] Error in gemini_to_client: {e}", exc_info=True)


@router.websocket("/ws/{interview_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    interview_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(supabase_service.get_current_user_ws)
):
    await websocket.accept()
    logging.info(f"[{interview_id}] WebSocket accepted.")
    
    user_key = current_user.id
    now = time.time()
    
    if user_key in _connection_attempts:
        last_attempt, count = _connection_attempts[user_key]
        if now - last_attempt < _cooldown_period:
            wait_time = int(_cooldown_period - (now - last_attempt))
            error_msg = f"Too many connection attempts. Please wait {wait_time} seconds."
            logging.warning(f"[{interview_id}] Rate limit hit for user {user_key}")
            await websocket.send_json({"type": "ERROR", "message": error_msg})
            await websocket.close(code=1008, reason="Rate limit")
            return
    
    _connection_attempts[user_key] = (now, 1)
    
    tasks = []
    conversation_turns = []
    turn_index_ref = {'value': 0}
    upload_queue = UploadQueue()
    upload_queue.start()
    
    try:
        interview_data = await supabase_service.get_interview_data(current_user.id, interview_id)
        storage_user_id = interview_data.get("user_id") or current_user.id
        
        resume_text = interview_data.get("resume", {}).get("extracted_text", "")
        job_description = interview_data.get("job_description", {}).get("description", "")
        enhanced_prompt = interview_data.get("enhanced_prompt")
        
        if enhanced_prompt:
            system_instruction_text = f"""{SYSTEM_PROMPT_TEMPLATE.format(resume=resume_text, job_description=job_description)}
            
Enhanced Context:
{enhanced_prompt}"""
        else:
            system_instruction_text = SYSTEM_PROMPT_TEMPLATE.format(
                resume=resume_text,
                job_description=job_description
            )
        
        gemini_config = {
            "response_modalities": ["AUDIO"],
            "system_instruction": {"parts": [{"text": system_instruction_text}]}
        }
        
        config = types.LiveConnectConfig.model_validate(gemini_config)

        try:
            async with client.aio.live.connect(model=MODEL_NAME, config=config) as gemini_session:
                logging.info(f"[{interview_id}] Connected to Gemini.")
                
                if user_key in _connection_attempts:
                    del _connection_attempts[user_key]
                
                conversation_turns = [ConversationTurn("ai", 0)]
                
                c_to_g = asyncio.create_task(client_to_gemini_task(
                    websocket, gemini_session, interview_id, conversation_turns,
                    storage_user_id, turn_index_ref, upload_queue
                ))
                
                g_to_c = asyncio.create_task(gemini_to_client_task(
                    websocket, gemini_session, interview_id, conversation_turns,
                    storage_user_id, turn_index_ref, upload_queue
                ))
                
                tasks = [c_to_g, g_to_c]
                await asyncio.gather(*tasks)
        
        except (google_exceptions.ResourceExhausted, ConnectionClosed) as quota_err:
            error_message = "API quota exceeded" if isinstance(quota_err, google_exceptions.ResourceExhausted) else str(quota_err)
            logging.error(f"[{interview_id}] {error_message}")
            await websocket.send_json({
                "type": "ERROR",
                "message": "Service temporarily unavailable. The interview service has reached its usage limit. Please try again in a few minutes."
            })
            await websocket.close(code=1008, reason="Quota exceeded")

    except WebSocketDisconnect:
        logging.info(f"[{interview_id}] Disconnected.")
    except Exception as e:
        logging.error(f"[{interview_id}] Error: {e}", exc_info=True)
    finally:
        for task in tasks:
            if not task.done():
                task.cancel()
        
        # Save any unsaved turns
        for turn in conversation_turns:
            if (turn.audio_chunks or turn.text) and not turn._saved:
                logging.info(f"[{interview_id}] Saving unsaved {turn.speaker} turn {turn.turn_index} in finally block")
                await upload_queue.add(turn, interview_id, turn.turn_index, storage_user_id)
        
        await upload_queue.stop()
        logging.info(f"[{interview_id}] Closed.")


@router.post("/end/{interview_id}")
async def end_interview(
    interview_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(supabase_service.get_current_user)
):
    """
    Ends the interview call and triggers feedback generation in the background.
    """
    try:
        if not current_user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        user_id = current_user.id
        
        logging.info(f"[{interview_id}] Ending interview for user {user_id}")
        
        # Update interview status to completed
        update_payload = {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }
        
        # FIX: Added 'await' here  
        update_result = await supabase_service.update_interview(interview_id, update_payload)
        
        if "error" in update_result:
            logging.error(f"[{interview_id}] Failed to update interview status: {update_result['error']}")
            raise HTTPException(status_code=500, detail="Failed to update interview status")
        
        logging.info(f"[{interview_id}] ✓ Interview marked as completed")
        
        # Import the service instance, not the method directly
        from app.services.feedback_live_service import feedback_live_service
        
        logging.info(f"[{interview_id}] Queuing feedback generation task...")
        background_tasks.add_task(
            feedback_live_service.generate_live_feedback,
            interview_id,
            user_id
        )
        logging.info(f"[{interview_id}] ✓ Feedback generation task queued successfully")
        
        return {
            "status": "success",
            "message": "Interview ended. Generating feedback...",
            "interview_id": interview_id
        }
         
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"[{interview_id}] Error ending interview: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))