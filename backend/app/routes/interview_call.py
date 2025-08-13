###### Solution 4 ############################
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.services.supabase_service import SupabaseService
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

# --- LOGGING AND CONSTANTS (UNCHANGED) ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
router = APIRouter()
MODEL_NAME = "gemini-live-2.5-flash-preview"
SYSTEM_PROMPT_TEMPLATE = """
You are an expert interviewer named 'Alex'. You are conducting a professional job interview. Treat this like a real interview.
Your persona is friendly, encouraging, and professional. Keep your responses concise and focused on the interview questions.
You will be provided with the candidate's resume and the job description. Your task is to ask relevant questions based on these documents.
Start by introducing yourself and the role, then ask the first question. Wait for the user's response before asking the next question. Ask follow-up questions based on the candidate's answers to keep the conversation flowing naturally.
Ask behavioral, technical, and situational questions to assess the candidate's fit for the role.
Do not ask questions that are not relevant to the job or the candidate's experience.

Candidate's Resume:
{resume}

Job Description:
{job_description}
"""

# --- CONVERSATION TURN & DB HELPERS (UNCHANGED) ---
class ConversationTurn:
    def __init__(self, speaker: str):
        self.speaker = speaker
        self.text = ""
        self.audio_chunks = []

async def process_and_save_turn(turn: ConversationTurn, interview_id: str, turn_index: int, user_id: str = None):
    """Background task to process and save a conversation turn using the new ConversationService."""
    try:
        # Modified check: Save if we have EITHER audio OR text content
        if not turn.audio_chunks and not turn.text:
            logging.warning(f"[{interview_id}] Skipping turn {turn_index} for {turn.speaker} due to no audio or text.")
            return
            
        logging.info(f"[{interview_id}] Processing turn {turn_index} for {turn.speaker} with {len(turn.audio_chunks) if turn.audio_chunks else 0} audio chunks")
        
        # Import the service here to avoid circular imports
        try:
            from app.services.conversation_service import ConversationService
            logging.info(f"[{interview_id}] Successfully imported ConversationService")
        except ImportError as imp_err:
            logging.error(f"[{interview_id}] Failed to import ConversationService: {imp_err}", exc_info=True)
            # Create a basic fallback implementation if import fails
            class FallbackService:
                @staticmethod
                async def process_turn_audio(*args, **kwargs):
                    logging.error(f"[{interview_id}] Using fallback service - original service import failed")
                    return {"status": "error", "reason": "service_import_failed"}
            ConversationService = FallbackService
        
        # Verify we have something to save (either audio OR text)
        total_audio_size = sum(len(chunk) for chunk in turn.audio_chunks) if turn.audio_chunks else 0
        has_content = total_audio_size > 0 or turn.text
        
        if not has_content:
            logging.warning(f"[{interview_id}] Empty turn for {turn.speaker} turn {turn_index}")
            return
        
        # Convert the ConversationTurn object to a dictionary
        turn_data = {
            "speaker": turn.speaker,
            "audio_chunks": turn.audio_chunks if turn.audio_chunks else [],
            "text": turn.text,
            "turn_index": turn_index
        }
        
        # Use our service
        logging.info(f"[{interview_id}] Calling ConversationService.process_turn_audio for turn {turn_index}")
        result = await ConversationService.process_turn_audio(
            turn_data=turn_data,
            interview_id=interview_id,
            user_id=user_id,
            turn_index=turn_index
        )
        
        logging.info(f"[{interview_id}] Turn {turn_index} DB save result: {result}")
        
        # And dump the actual data being saved:
        logging.info(f"[{interview_id}] Turn {turn_index} data: speaker={turn_data.get('speaker')}, " +
                    f"text length={len(turn_data.get('text', ''))}, " +
                    f"audio_chunks={len(turn_data.get('audio_chunks', []))}")
        
        if result.get("status") == "success":
            logging.info(f"[{interview_id}] Successfully saved turn {turn_index} for {turn.speaker}.")
        else:
            logging.error(f"[{interview_id}] Failed to save turn {turn_index}: {result.get('reason')}")
    
    except Exception as e:
        logging.error(f"[{interview_id}] Error in process_and_save_turn for {turn.speaker} turn {turn_index}: {e}", exc_info=True)


# =========================================================================
# === FINAL, ROBUST ASYNC TASKS USING NEW SDK METHODS ===
# =========================================================================

async def client_to_gemini_task(websocket: WebSocket, session: genai.live.AsyncSession, interview_id: str, conversation_turns: list, background_tasks: BackgroundTasks, user_id: str, turn_index_ref: dict):
    """
    Handles streaming user audio to Gemini, while also storing it for later transcription.
    """
    logging.info(f"[{interview_id}] Starting client-to-gemini task.")
    try:
        while True:
            try:
                event = await websocket.receive()

                # For audio chunks, both send to Gemini and store locally
                if 'bytes' in event and event['bytes'] is not None:
                    chunk = event['bytes']
                    
                    # 1. Store the chunk in the current user turn
                    if conversation_turns and conversation_turns[-1].speaker == "user":
                        conversation_turns[-1].audio_chunks.append(chunk)
                        # logging.info(f"[{interview_id}] Stored {len(chunk)} bytes of user audio.")
                
                    # 2. Send to Gemini
                    try:
                        await session.send_realtime_input(
                            audio=types.Blob(data=chunk, mime_type="audio/pcm;rate=16000")
                        )
                        logging.info(f"[{interview_id}] Sent {len(chunk)} bytes of user audio to Gemini.")
                    except Exception as send_err:
                        logging.error(f"[{interview_id}] Error sending audio to Gemini: {send_err}", exc_info=True)
                        # Don't break the loop, just log the error

                # When user finishes speaking, signal to Gemini
                elif 'text' in event and event['text'] is not None:
                    message = json.loads(event['text'])
                    if message.get("type") == "USER_AUDIO_END":
                        logging.info(f"[{interview_id}] User finished. Sending audio_stream_end signal.")
                        
                        # Save the user's turn when they finish speaking
                        if conversation_turns and conversation_turns[-1].speaker == "user":
                            user_turn = conversation_turns[-1]
                            
                            # Calculate total audio size for logging
                            total_audio_size = sum(len(chunk) for chunk in user_turn.audio_chunks) if user_turn.audio_chunks else 0
                            logging.info(f"[{interview_id}] User turn has {len(user_turn.audio_chunks)} chunks totaling {total_audio_size} bytes")
                            
                            # Only save if there's actual audio content
                            if user_turn.audio_chunks:
                                logging.info(f"[{interview_id}] Saving completed user turn {turn_index_ref['value']}.")
                                
                                # Get transcription from user message if available
                                if message.get("transcription"):
                                    user_turn.text = message.get("transcription")
                                
                                # Save the user turn
                                background_tasks.add_task(
                                    process_and_save_turn, 
                                    user_turn, 
                                    interview_id, 
                                    turn_index_ref['value'],
                                    user_id
                                )
                                turn_index_ref['value'] += 1
                        
                        try:
                            await session.send_realtime_input(audio_stream_end=True)
                        except Exception as end_err:
                            logging.error(f"[{interview_id}] Error sending audio_stream_end: {end_err}", exc_info=True)

            except ConnectionClosed:
                logging.warning(f"[{interview_id}] Client disconnected from client-to-gemini task.")
                break

    except Exception as e:
        logging.error(f"[{interview_id}] Error in client-to-gemini task: {e}", exc_info=True)


async def gemini_to_client_task(websocket: WebSocket, session: genai.live.AsyncSession, interview_id: str, background_tasks: BackgroundTasks, conversation_turns: list, user_id: str, turn_index_ref: dict):
    """Receives audio chunks from Gemini, converts them to WAV, and alternates between speakers."""
    logging.info(f"[{interview_id}] Starting gemini-to-client task.")
    
    try:
        while True:
            try:
                message = await session._receive()
                
                # Add more detailed logging about the message
                if message.server_content:
                    logging.info(f"[{interview_id}] Server content received. Turn complete: {message.server_content.turn_complete}")
                if message.text:
                    logging.info(f"[{interview_id}] Text received: {message.text[:50]}...")
                if message.data:
                    logging.info(f"[{interview_id}] Received {len(message.data)} bytes of audio data")
                
                # Handle audio data
                if message.data:
                    # Create a WAV wrapper for the PCM data
                    pcm_data = message.data
                    wav_buffer = io.BytesIO()
                    
                    with wave.open(wav_buffer, 'wb') as wav_file:
                        wav_file.setnchannels(1)  # Mono
                        wav_file.setsampwidth(2)  # 16-bit
                        wav_file.setframerate(24000)  # Gemini uses 24kHz
                        wav_file.writeframes(pcm_data)
                    
                    wav_buffer.seek(0)
                    wav_data = wav_buffer.read()
                    
                    # Send WAV to client and store original PCM for saving
                    await websocket.send_bytes(wav_data)
                    
                    # Only store audio in the current turn if it's the AI speaking
                    if conversation_turns and conversation_turns[-1].speaker == "ai":
                        conversation_turns[-1].audio_chunks.append(pcm_data)
                        logging.info(f"[{interview_id}] Added {len(pcm_data)} bytes to AI audio chunks. Total chunks: {len(conversation_turns[-1].audio_chunks)}")
                    
                    logging.info(f"[{interview_id}] Sent {len(wav_data)} bytes of WAV audio to client.")
                
                # When AI turn is complete, save it and prepare for user's turn
                if message.server_content and message.server_content.turn_complete:
                    ai_turn = conversation_turns[-1]
                    
                    # Store text if available
                    if message.text:
                        ai_turn.text = message.text
                        logging.info(f"[{interview_id}] Set AI turn text: {message.text[:50]}...")
                    
                    # Log audio content before saving
                    if ai_turn.audio_chunks:
                        total_audio_bytes = sum(len(chunk) for chunk in ai_turn.audio_chunks)
                        logging.info(f"[{interview_id}] AI turn has {len(ai_turn.audio_chunks)} chunks totaling {total_audio_bytes} bytes")
                    else:
                        logging.warning(f"[{interview_id}] AI turn has NO audio chunks!")
                    
                    # Force direct execution rather than background task for debugging
                    logging.info(f"[{interview_id}] Processing AI turn {turn_index_ref['value']}...")
                    try:
                        await process_and_save_turn(ai_turn, interview_id, turn_index_ref['value'], user_id)
                        logging.info(f"[{interview_id}] Successfully processed AI turn {turn_index_ref['value']}")
                    except Exception as save_err:
                        logging.error(f"[{interview_id}] Error directly processing AI turn: {save_err}", exc_info=True)
                        # Fall back to background task
                        background_tasks.add_task(
                            process_and_save_turn, 
                            ai_turn, 
                            interview_id, 
                            turn_index_ref['value'],
                            user_id
                        )
                        
                    turn_index_ref['value'] += 1
                    
                    # Create a USER turn next
                    conversation_turns.append(ConversationTurn("user"))
                    logging.info(f"[{interview_id}] Ready for user turn {turn_index_ref['value']}.")
                    
                    # Signal frontend that it's time for user to speak
                    await websocket.send_json({"type": "AI_TURN_COMPLETE"})
            
            except ConnectionClosed:
                logging.warning(f"[{interview_id}] WebSocket connection closed in gemini_to_client_task")
                break

    except Exception as e:
        logging.error(f"[{interview_id}] Error in gemini_to_client_task: {e}", exc_info=True)


# =========================================================================
# === FINAL, REDESIGNED WEBSOCKET ENDPOINT (USER-FIRST) ===
# =========================================================================
@router.websocket("/ws/{interview_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    interview_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(SupabaseService.get_current_user_ws)
):
    await websocket.accept()
    logging.info(f"[{interview_id}] WebSocket connection accepted.")
    
    # Initialize these variables outside the try block so they're always defined
    tasks = []
    conversation_turns = []
    turn_index_ref = {'value': 0}
    
    try:
        interview_data = await SupabaseService.get_interview_data(current_user.id, interview_id)
        system_instruction_text = SYSTEM_PROMPT_TEMPLATE.format(
            resume=interview_data.get("resume", {}).get("extracted_text", ""),
            job_description=interview_data.get("job_description", {}).get("description", "")
        )
        
        # Use a simple dictionary for the config
        gemini_config = {
            "response_modalities": ["AUDIO"],
            "system_instruction": { "parts": [{"text": system_instruction_text}] }
        }   
        
        logging.info(f"[{interview_id}] Connecting to Gemini Live API.")
        
        async with client.aio.live.connect(model=MODEL_NAME, config=gemini_config) as gemini_session:
            logging.info(f"[{interview_id}] Gemini connection successful.")
            
            # Initialize with the first AI turn
            conversation_turns = [ConversationTurn("ai")]
            
            # Add a keep-alive task
            keep_alive_task = asyncio.create_task(
                keep_alive_websocket(websocket, interview_id)
            )
            
            # Pass background_tasks and turn_index_ref to client_to_gemini_task
            c_to_g_task = asyncio.create_task(client_to_gemini_task(
                websocket, 
                gemini_session, 
                interview_id, 
                conversation_turns,
                background_tasks,
                current_user.id,
                turn_index_ref
            ))
            
            g_to_c_task = asyncio.create_task(gemini_to_client_task(
                websocket, 
                gemini_session, 
                interview_id, 
                background_tasks, 
                conversation_turns, 
                user_id=current_user.id,
                turn_index_ref=turn_index_ref
            ))
            
            tasks = [c_to_g_task, g_to_c_task, keep_alive_task]
            await asyncio.gather(*tasks)

    except WebSocketDisconnect:
        logging.info(f"[{interview_id}] Client disconnected gracefully.")
    except Exception as e:
        logging.error(f"[{interview_id}] An unexpected error occurred: {e}", exc_info=True)
    finally:
        # Cancel any pending tasks
        for task in tasks:
            if not task.done():
                task.cancel()
        
        # Try to save the last turn if it has content and wasn't already saved
        if conversation_turns and len(conversation_turns) > 0 and conversation_turns[-1].audio_chunks:
            last_turn = conversation_turns[-1]
            try:
                logging.info(f"[{interview_id}] Saving final {last_turn.speaker} turn on disconnect.")
                await process_and_save_turn(last_turn, interview_id, turn_index_ref['value'], current_user.id)
            except Exception as save_err:
                logging.error(f"[{interview_id}] Error saving final turn: {save_err}")
        
        logging.info(f"[{interview_id}] Closing WebSocket connection.")


async def keep_alive_websocket(websocket: WebSocket, interview_id: str):
    """Send periodic keep-alive pings to prevent timeout."""
    try:
        while True:
            await asyncio.sleep(20)  # Send a ping every 20 seconds
            try:
                await websocket.send_json({"type": "KEEP_ALIVE"})
                logging.debug(f"[{interview_id}] Sent keep-alive ping")
            except Exception as e:
                logging.warning(f"[{interview_id}] Failed to send keep-alive: {e}")
                break
    except asyncio.CancelledError:
        logging.debug(f"[{interview_id}] Keep-alive task cancelled")
