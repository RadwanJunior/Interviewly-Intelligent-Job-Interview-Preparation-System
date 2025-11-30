from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.services.supabase_service import supabase_service
from google import genai
from google.genai import types
import os
import asyncio
import json  
import logging
from fastapi.background import BackgroundTasks
import wave
import io
from websockets.exceptions import ConnectionClosed
from app.services.conversation_service import ConversationService

# --- LOGGING AND CONSTANTS ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
router = APIRouter()
conversation_service = ConversationService(supabase_service)

MODEL_NAME = "gemini-2.5-flash-native-audio-preview-09-2025"
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

# --- CONVERSATION TURN & QUEUE HELPERS ---
class ConversationTurn:
    def __init__(self, speaker: str):
        self.speaker = speaker
        self.text = ""
        self.audio_chunks = []
        self._saved = False
        self._saving = False

class TurnProcessor:
    """Manages a queue of turns to be uploaded sequentially."""
    def __init__(self):
        self.queue = asyncio.Queue()
        self.worker_task = None

    def start(self):
        self.worker_task = asyncio.create_task(self._worker())

    async def stop(self):
        if self.worker_task:
            # Wait for pending items if any
            if not self.queue.empty():
                logging.info(f"Processor stopping. Waiting for {self.queue.qsize()} pending uploads...")
                await self.queue.join()
            
            self.worker_task.cancel()
            try:
                await self.worker_task
            except asyncio.CancelledError:
                pass

    async def add_turn(self, turn: ConversationTurn, interview_id: str, turn_index: int, user_id: str):
        # Prevent duplicate processing
        if getattr(turn, '_saving', False) or getattr(turn, '_saved', False):
            return

        turn._saving = True
        
        # 1. FILTER SILENCE
        total_bytes = sum(len(c) for c in turn.audio_chunks)
        duration_sec = total_bytes / 32000.0
        
        if duration_sec < 0.5 and not turn.text:
            logging.warning(f"[{interview_id}] Skipping turn {turn_index} ({turn.speaker}): Too short ({duration_sec:.2f}s) and no text.")
            turn._saving = False
            return

        # 2. SNAPSHOT DATA (Copy list to avoid mutation issues in queue)
        turn_data = {
            "speaker": turn.speaker,
            "audio_chunks": list(turn.audio_chunks),
            "text": turn.text,
            "turn_index": turn_index
        }
        
        logging.info(f"[{interview_id}] Queuing turn {turn_index} for upload (Queue size: {self.queue.qsize()})")
        await self.queue.put((turn, turn_data, interview_id, user_id))

    async def _worker(self):
        logging.info("TurnProcessor worker started.")
        while True:
            try:
                turn, turn_data, interview_id, user_id = await self.queue.get()
                
                try:
                    logging.info(f"[{interview_id}] Processing upload for turn {turn_data['turn_index']}...")
                    result = await conversation_service.process_turn_audio(
                        turn_data=turn_data,
                        interview_id=interview_id,
                        user_id=user_id,
                        turn_index=turn_data['turn_index']
                    )
                    
                    if result.get("status") == "success":
                        logging.info(f"[{interview_id}] Saved turn {turn_data['turn_index']}.")
                        turn._saved = True
                    else:
                        logging.error(f"[{interview_id}] Failed to save turn {turn_data['turn_index']}: {result.get('reason')}")
                except Exception as e:
                    logging.error(f"[{interview_id}] Error in upload worker: {e}", exc_info=True)
                finally:
                    turn._saving = False
                    self.queue.task_done()
            
            except asyncio.CancelledError:
                logging.info("TurnProcessor worker cancelled.")
                break
            except Exception as e:
                logging.error(f"Critical error in TurnProcessor worker: {e}", exc_info=True)
                await asyncio.sleep(1)

async def client_to_gemini_task(websocket: WebSocket, session: genai.live.AsyncSession, interview_id: str, conversation_turns: list, turn_lock: asyncio.Lock, user_id: str, processor: TurnProcessor):
    """Handles streaming user audio to Gemini."""
    logging.info(f"[{interview_id}] Starting client-to-gemini task.")
    try:
        while True:
            try:
                event = await websocket.receive()

                if 'bytes' in event and event['bytes'] is not None:
                    chunk = event['bytes']
                    async with turn_lock:
                        # FIX: If user starts speaking, ensure we are in a user turn.
                        # If we are in AI turn, it means user interrupted or AI finished but didn't signal yet.
                        if conversation_turns and conversation_turns[-1].speaker == "user":
                            conversation_turns[-1].audio_chunks.append(chunk)
                        else:
                            logging.info(f"[{interview_id}] User started speaking (switching from {conversation_turns[-1].speaker if conversation_turns else 'None'}).")
                            conversation_turns.append(ConversationTurn("user"))
                            conversation_turns[-1].audio_chunks.append(chunk)
                    
                    await session.send_realtime_input(
                        audio=types.Blob(data=chunk, mime_type="audio/pcm;rate=16000")
                    )

                elif 'text' in event and event['text'] is not None:
                    message = json.loads(event['text'])
                    if message.get("type") == "USER_AUDIO_END":
                        logging.info(f"[{interview_id}] User finished speaking.")
                        
                        async with turn_lock:
                            # Find the active user turn
                            user_turn = None
                            user_turn_idx = -1
                            
                            # Case 1: Normal flow, User is last
                            if conversation_turns and conversation_turns[-1].speaker == "user":
                                user_turn = conversation_turns[-1]
                                user_turn_idx = len(conversation_turns) - 1
                            # Case 2: Implicit switch happened, AI is last, User is second to last
                            elif len(conversation_turns) > 1 and conversation_turns[-2].speaker == "user":
                                user_turn = conversation_turns[-2]
                                user_turn_idx = len(conversation_turns) - 2
                            
                            if user_turn:
                                if message.get("transcription"):
                                    user_turn.text = message.get("transcription")
                                
                                # Add to queue
                                await processor.add_turn(
                                    user_turn, 
                                    interview_id, 
                                    user_turn_idx,
                                    user_id
                                )
                                
                                # Only append new AI turn if we aren't ALREADY in one
                                if conversation_turns[-1].speaker != "ai":
                                    conversation_turns.append(ConversationTurn("ai"))
    
                        await session.send_realtime_input(audio_stream_end=True)

            except (ConnectionClosed, RuntimeError):
                logging.info(f"[{interview_id}] Client connection closed (receive).")
                break

    except Exception as e:
        logging.error(f"[{interview_id}] Error in client-to-gemini task: {e}", exc_info=True)

async def gemini_to_client_task(websocket: WebSocket, session: genai.live.AsyncSession, interview_id: str, conversation_turns: list, turn_lock: asyncio.Lock, user_id: str, processor: TurnProcessor):
    """Receives audio/text from Gemini."""
    logging.info(f"[{interview_id}] Starting gemini-to-client task.")
    
    try:
        while True:
            try:
                message = await session._receive()

                extracted_audio = None
                extracted_text = ""

                if message.data:
                    extracted_audio = message.data
                
                if message.server_content and message.server_content.model_turn and message.server_content.model_turn.parts:
                    for part in message.server_content.model_turn.parts:
                        if part.text:
                            extracted_text += part.text
                        if not extracted_audio and part.inline_data and part.inline_data.data:
                            extracted_audio = part.inline_data.data

                if not extracted_text and message.text:
                    extracted_text = message.text

                async with turn_lock:
                    # Implicit Turn Switching: If Gemini speaks during User turn
                    if (extracted_audio or extracted_text) and conversation_turns and conversation_turns[-1].speaker == "user":
                        logging.info(f"[{interview_id}] Implicit switch to AI.")
                        conversation_turns.append(ConversationTurn("ai"))

                    if conversation_turns and conversation_turns[-1].speaker == "ai":
                        current_turn = conversation_turns[-1]
                        if extracted_text:
                            current_turn.text += extracted_text
                        if extracted_audio:
                            current_turn.audio_chunks.append(extracted_audio)
                            
                            # Send audio to client
                            wav_buffer = io.BytesIO()
                            with wave.open(wav_buffer, 'wb') as wav_file:
                                wav_file.setnchannels(1); wav_file.setsampwidth(2); wav_file.setframerate(24000)
                                wav_file.writeframes(extracted_audio)
                            wav_buffer.seek(0)
                            await websocket.send_bytes(wav_buffer.read())

                if message.server_content and message.server_content.turn_complete:
                    async with turn_lock:
                        # FIX: Handle case where user interrupted AI (so last turn is User, not AI)
                        ai_turn = None
                        ai_turn_idx = -1
                        
                        if conversation_turns and conversation_turns[-1].speaker == "ai":
                            ai_turn = conversation_turns[-1]
                            ai_turn_idx = len(conversation_turns) - 1
                            # Prepare for user
                            conversation_turns.append(ConversationTurn("user"))
                        elif len(conversation_turns) > 1 and conversation_turns[-2].speaker == "ai":
                            # User already interrupted and created a turn
                            ai_turn = conversation_turns[-2]
                            ai_turn_idx = len(conversation_turns) - 2
                        
                        if ai_turn and not ai_turn._saved:
                            logging.info(f"[{interview_id}] AI turn complete. Queuing index {ai_turn_idx}")
                            await processor.add_turn(
                                ai_turn, 
                                interview_id, 
                                ai_turn_idx, 
                                user_id
                            )
                    
                    try:
                        await websocket.send_json({"type": "AI_TURN_COMPLETE"})
                    except (ConnectionClosed, RuntimeError):
                        break
            
            except ConnectionClosed:
                break

    except Exception as e:
        logging.error(f"[{interview_id}] Error in gemini_to_client_task: {e}", exc_info=True)

@router.websocket("/ws/{interview_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    interview_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(supabase_service.get_current_user_ws)
):
    await websocket.accept()
    logging.info(f"[{interview_id}] WebSocket connection accepted.")
    
    tasks = []
    conversation_turns = []
    turn_lock = asyncio.Lock()
    processor = TurnProcessor()
    processor.start()
    
    try:
        interview_data = await supabase_service.get_interview_data(current_user.id, interview_id)
        interview_owner_id = interview_data.get("user_id")
        storage_user_id = interview_owner_id if interview_owner_id else current_user.id
        
        resume_text = interview_data.get("resume", {}).get("extracted_text", "")
        job_description = interview_data.get("job_description", {}).get("description", "")
        enhanced_prompt = interview_data.get("enhanced_prompt")
        
        if enhanced_prompt:
            system_instruction_text = f"""Enhanced Interview Context:
                {SYSTEM_PROMPT_TEMPLATE.format(resume=resume_text, job_description=job_description)}
                {enhanced_prompt}
            """
        else:
            system_instruction_text = SYSTEM_PROMPT_TEMPLATE.format(
                resume=resume_text,
                job_description=job_description
            )
        
        # Use AUDIO modality. Gemini 2.0 Flash Exp typically returns text alongside audio automatically.
        gemini_config = {
            "response_modalities": ["AUDIO"],
            "system_instruction": { "parts": [{"text": system_instruction_text}] }
        }   
        config = types.LiveConnectConfig.model_validate(gemini_config)

        async with client.aio.live.connect(model=MODEL_NAME, config=config) as gemini_session:
            logging.info(f"[{interview_id}] Gemini connection successful.")
            
            conversation_turns = [ConversationTurn("ai")]
            
            keep_alive_task = asyncio.create_task(keep_alive_websocket(websocket, interview_id))
            
            c_to_g_task = asyncio.create_task(client_to_gemini_task(
                websocket, 
                gemini_session, 
                interview_id, 
                conversation_turns,
                turn_lock,
                storage_user_id,
                processor
            ))
            
            g_to_c_task = asyncio.create_task(gemini_to_client_task(
                websocket, 
                gemini_session, 
                interview_id, 
                conversation_turns,
                turn_lock,
                storage_user_id,
                processor
            ))
            
            tasks = [c_to_g_task, g_to_c_task, keep_alive_task]
            await asyncio.gather(*tasks)

    except WebSocketDisconnect:
        logging.info(f"[{interview_id}] Client disconnected gracefully.")
    except Exception as e:
        logging.error(f"[{interview_id}] An unexpected error occurred: {e}", exc_info=True)
    finally:
        for task in tasks:
            if not task.done():
                task.cancel()
    
        # Save any unsaved turns on disconnect
        for i, turn in enumerate(conversation_turns):
            if (turn.audio_chunks or turn.text) and not getattr(turn, '_saved', False):
                try:
                    logging.info(f"[{interview_id}] Queuing unsaved {turn.speaker} turn {i} on disconnect.")
                    await processor.add_turn(turn, interview_id, i, current_user.id)
                except Exception as save_err:
                    logging.error(f"[{interview_id}] Error queuing turn on disconnect: {save_err}")
        
        # Stop processor and wait for queue to empty
        await processor.stop()
        logging.info(f"[{interview_id}] Closing WebSocket connection.")

async def keep_alive_websocket(websocket: WebSocket, interview_id: str):
    """Send periodic keep-alive pings."""
    try:
        while True:
            await asyncio.sleep(20)
            try:
                await websocket.send_json({"type": "KEEP_ALIVE"})
            except Exception:
                break
    except asyncio.CancelledError:
        pass
