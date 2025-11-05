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

# --- LOGGING AND CONSTANTS (UNCHANGED) ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
router = APIRouter()
conversation_service = ConversationService(supabase_service)

MODEL_NAME = "gemini-2.5-flash-native-audio-preview-09-2025"  # New native audio model
SYSTEM_PROMPT_TEMPLATE = """
You are an expert technical interviewer named 'Alex'. You are conducting a professional job interview for a technical role. Treat this like a real interview at a top company.

Your persona is professional with appropriate warmth - firm but fair. Your primary goal is to thoroughly assess the candidate's technical abilities and job fit.

IMPORTANT INTERVIEW BEHAVIORS:
1. Start with a brief introduction and explanation of the role.
2. Ask a mix of questions with this distribution:
   - 40% technical questions directly related to the skills in the job description
   - 30% behavioral questions requiring specific examples from the candidate's past
   - 20% resume-based questions that probe the candidate's listed experiences and skills
   - 10% hypothetical problem-solving scenarios relevant to the role

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

# --- CONVERSATION TURN & DB HELPERS ---
class ConversationTurn:
    def __init__(self, speaker: str):
        self.speaker = speaker
        self.text = ""
        self.audio_chunks = []

async def process_and_save_turn(turn: ConversationTurn, interview_id: str, turn_index: int, user_id: str = None):
    """Background task to process and save a conversation turn using the new ConversationService."""
    try:
        print("this is the user and interview ids:", user_id, interview_id)
        # Modified check: Save if we have EITHER audio OR text content
        if not turn.audio_chunks and not turn.text:
            logging.warning(f"[{interview_id}] Skipping turn {turn_index} for {turn.speaker} due to no audio or text.")
            return
            
        logging.info(f"[{interview_id}] Processing turn {turn_index} for {turn.speaker} with {len(turn.audio_chunks) if turn.audio_chunks else 0} audio chunks")
        
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
        result = await conversation_service.process_turn_audio(
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
        
        # At the end of successful processing:
        if result.get("status") == "success":
            logging.info(f"[{interview_id}] Successfully saved turn {turn_index} for {turn.speaker}.")
            # Mark this turn as saved to prevent duplicate processing
            setattr(turn, '_saved', True)
        else:
            logging.error(f"[{interview_id}] Failed to save turn {turn_index}: {result.get('reason')}")
    
    except Exception as e:
        logging.error(f"[{interview_id}] Error in process_and_save_turn for {turn.speaker} turn {turn_index}: {e}", exc_info=True)

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
                        if conversation_turns and conversation_turns[-1].speaker == "user":
                            user_turn = conversation_turns[-1]
                            total_audio_size = sum(len(chunk) for chunk in user_turn.audio_chunks) if user_turn.audio_chunks else 0
                            logging.info(f"[{interview_id}] User turn has {len(user_turn.audio_chunks)} chunks totaling {total_audio_size} bytes")
                            # Save even if audio is short, for debugging
                            if user_turn.audio_chunks or user_turn.text:
                                logging.info(f"[{interview_id}] Saving completed user turn {turn_index_ref['value']}.")
                                if message.get("transcription"):
                                    user_turn.text = message.get("transcription")
                                background_tasks.add_task(
                                    process_and_save_turn, 
                                    user_turn, 
                                    interview_id, 
                                    turn_index_ref['value'],
                                    user_id
                                )
                            else:
                                logging.warning(f"[{interview_id}] Skipping user turn {turn_index_ref['value']} due to no audio or text.")
                            turn_index_ref['value'] += 1
                            
                            # Before appending a new AI turn, check if the previous user turn needs saving
                            if message.get("type") == "USER_AUDIO_END":
                                # This is where you currently process the USER_AUDIO_END message
                                # Keep all the existing code...
                                
                                if conversation_turns and conversation_turns[-1].speaker == "user":
                                    user_turn = conversation_turns[-1]
                                    # ...existing code for checking and saving user turn...
                                    
                                # Add defensive check BEFORE creating new AI turn:
                                elif conversation_turns and len(conversation_turns) > 1 and conversation_turns[-2].speaker == "user":
                                    # The user turn might have been skipped - check the previous turn
                                    user_turn = conversation_turns[-2]
                                    if (user_turn.audio_chunks or user_turn.text) and not hasattr(user_turn, '_saved'):
                                        logging.info(f"[{interview_id}] Defensive save: previous user turn had unsaved audio/text.")
                                        background_tasks.add_task(
                                            process_and_save_turn, 
                                            user_turn, 
                                            interview_id, 
                                            turn_index_ref['value'] - 1,
                                            user_id
                                        )
                                        # Mark as saved to prevent duplicate saves
                                        setattr(user_turn, '_saved', True)
                                
                            # Then create the AI turn as you currently do:
                            conversation_turns.append(ConversationTurn("ai"))
                            logging.info(f"[{interview_id}] Created new AI turn {turn_index_ref['value']} for next response")
    
                        try:
                            await session.send_realtime_input(audio_stream_end=True)
                        except Exception as end_err:
                            logging.error(f"[{interview_id}] Error sending audio_stream_end: {end_err}", exc_info=True)

            except ConnectionClosed:
                logging.warning(f"[{interview_id}] Client disconnected from client-to-gemini task.")
                break

    except Exception as e:
        logging.error(f"[{interview_id}] Error in client-to-gemini task: {e}", exc_info=True)

# async def client_to_gemini_task(websocket: WebSocket, session: genai.live.AsyncSession, interview_id: str, conversation_turns: list, background_tasks: BackgroundTasks, user_id: str, turn_index_ref: dict):
#     """
#     Handles streaming user audio to Gemini and saving the completed user turn.
#     This version uses the original background task logic.
#     """
#     logging.info(f"[{interview_id}] Starting client-to-gemini task.")
#     try:
#         while True:
#             try:
#                 event = await websocket.receive()

#                 if 'bytes' in event and event['bytes'] is not None:
#                     chunk = event['bytes']
#                     if conversation_turns and conversation_turns[-1].speaker == "user":
#                         conversation_turns[-1].audio_chunks.append(chunk)
                    
#                     try:
#                         await session.send_realtime_input(
#                             audio=types.Blob(data=chunk, mime_type="audio/pcm;rate=16000")
#                         )
#                     except Exception as send_err:
#                         logging.error(f"[{interview_id}] Error sending audio to Gemini: {send_err}")

#                 elif 'text' in event and event['text'] is not None:
#                     message = json.loads(event['text'])
#                     if message.get("type") == "USER_AUDIO_END":
#                         logging.info(f"[{interview_id}] Received USER_AUDIO_END signal from client.")
                        
#                         if conversation_turns and conversation_turns[-1].speaker == "user":
#                             user_turn = conversation_turns[-1]
#                             if message.get("transcription"):
#                                 user_turn.text = message.get("transcription")
                            
#                             # Using the original background task as requested
#                             logging.info(f"[{interview_id}] Scheduling save for user turn {turn_index_ref['value']}.")
#                             background_tasks.add_task(
#                                 process_and_save_turn, 
#                                 user_turn, 
#                                 interview_id, 
#                                 turn_index_ref['value'],
#                                 user_id
#                             )
#                             setattr(user_turn, '_saved', True) # Optimistic marking
                            
#                             # Increment turn index and create placeholder for the AI's response
#                             turn_index_ref['value'] += 1
#                             conversation_turns.append(ConversationTurn("ai"))
#                             logging.info(f"[{interview_id}] Created placeholder for AI turn {turn_index_ref['value']}.")
    
#                         try:
#                             # FIX #1: Use the correct snake_case argument to prevent the TypeError.
#                             await session.send_realtime_input(audio_stream_end=True)
#                             logging.info(f"[{interview_id}] Successfully sent audio_stream_end=True signal to Gemini.")
#                         except Exception as end_err:
#                             logging.error(f"[{interview_id}] Error sending audio_stream_end signal: {end_err}", exc_info=True)

#             except ConnectionClosed:
#                 logging.warning(f"[{interview_id}] Client disconnected from client-to-gemini task.")
#                 break

#     except Exception as e:
#         if "Cannot call \"receive\"" in str(e):
#              logging.warning(f"[{interview_id}] Gracefully handling client disconnect in client_to_gemini task.")
#         else:
#              logging.error(f"[{interview_id}] Error in client-to-gemini task: {e}", exc_info=True)

async def gemini_to_client_task(websocket: WebSocket, session: genai.live.AsyncSession, interview_id: str, background_tasks: BackgroundTasks, conversation_turns: list, user_id: str, turn_index_ref: dict):
    """Receives audio chunks from Gemini, converts them to WAV, and alternates between speakers."""
    logging.info(f"[{interview_id}] Starting gemini-to-client task.")
    
    try:
        while True:
            try:
                message = await session._receive()

                # 🔍 ADD COMPREHENSIVE DEBUG LOGGING
                debug_gemini_message(message, interview_id)
                
                # Extract text and audio from the proper locations
                extracted_text = None
                extracted_audio = None
                
                # Check server_content.model_turn.parts (where everything actually is)
                if message.server_content and hasattr(message.server_content, 'model_turn') and message.server_content.model_turn:
                    if hasattr(message.server_content.model_turn, 'parts'):
                        for i, part in enumerate(message.server_content.model_turn.parts):
                            # Extract text
                            if hasattr(part, 'text') and part.text and not extracted_text:
                                extracted_text = part.text
                                logging.info(f"[{interview_id}] ✅ Found text in part {i}: {extracted_text[:50]}...")
                            
                            # ✅ FIX: Extract audio correctly and BREAK
                            if hasattr(part, 'inline_data') and part.inline_data and hasattr(part.inline_data, 'data'):
                                extracted_audio = part.inline_data.data
                                logging.info(f"[{interview_id}] ✅ Found AI audio in part {i}: {len(extracted_audio)} bytes")
                                break  # Take the first audio chunk and stop looking
                
                # Fallback: Check direct attributes (probably never works but keep for safety)
                if not extracted_text and hasattr(message, 'text') and message.text:
                    extracted_text = message.text

                if not extracted_audio and hasattr(message, 'data') and message.data:
                    extracted_audio = message.data
                
                # Handle extracted text
                if extracted_text:
                    if conversation_turns and conversation_turns[-1].speaker == "ai":
                        conversation_turns[-1].text += extracted_text
                        logging.info(f"[{interview_id}] Added text to AI turn: {extracted_text[:50]}...")
                
                # Handle extracted audio
                if extracted_audio:
                    # Create WAV wrapper
                    wav_buffer = io.BytesIO()
                    with wave.open(wav_buffer, 'wb') as wav_file:
                        wav_file.setnchannels(1)
                        wav_file.setsampwidth(2)
                        wav_file.setframerate(24000)
                        wav_file.writeframes(extracted_audio)
                    
                    wav_buffer.seek(0)
                    wav_data = wav_buffer.read()
                    
                    # Send to client and store
                    await websocket.send_bytes(wav_data)
                    
                    if conversation_turns and conversation_turns[-1].speaker == "ai":
                        conversation_turns[-1].audio_chunks.append(extracted_audio)
                        logging.info(f"[{interview_id}] Added {len(extracted_audio)} bytes to AI audio chunks. Total chunks: {len(conversation_turns[-1].audio_chunks)}")
                    
                    logging.info(f"[{interview_id}] Sent {len(wav_data)} bytes of WAV audio to client.")
                
                # Handle turn completion
                if message.server_content and message.server_content.turn_complete:
                    logging.info(f"[{interview_id}] AI turn {turn_index_ref['value']} is complete")
                    
                    ai_turn = conversation_turns[-1]
                    
                    # Debug what we have before saving
                    audio_count = len(ai_turn.audio_chunks) if ai_turn.audio_chunks else 0
                    audio_bytes = sum(len(chunk) for chunk in ai_turn.audio_chunks) if ai_turn.audio_chunks else 0
                    text_length = len(ai_turn.text) if ai_turn.text else 0
                    
                    logging.info(f"[{interview_id}] Pre-save debug: audio_chunks={audio_count}, total_bytes={audio_bytes}, text_length={text_length}")
                    
                    # Save the turn
                    try:
                        await process_and_save_turn(ai_turn, interview_id, turn_index_ref['value'], user_id)
                        logging.info(f"[{interview_id}] Successfully processed AI turn {turn_index_ref['value']}")
                        setattr(ai_turn, '_saved', True)
                    except Exception as save_err:
                        logging.error(f"[{interview_id}] Error processing AI turn: {save_err}", exc_info=True)
                        
                    turn_index_ref['value'] += 1
                    conversation_turns.append(ConversationTurn("user"))
                    logging.info(f"[{interview_id}] Ready for user turn {turn_index_ref['value']}.")
                    
                    try:
                        await websocket.send_json({"type": "AI_TURN_COMPLETE"})
                    except (ConnectionClosed, RuntimeError):
                        logging.warning(f"[{interview_id}] Could not send AI_TURN_COMPLETE; socket was already closed.")
                        break
            
            except ConnectionClosed:
                logging.warning(f"[{interview_id}] WebSocket connection closed in gemini_to_client_task")
                break

    except Exception as e:
        logging.error(f"[{interview_id}] Error in gemini_to_client_task: {e}", exc_info=True)



# async def gemini_to_client_task(websocket: WebSocket, session: genai.live.AsyncSession, interview_id: str, background_tasks: BackgroundTasks, conversation_turns: list, user_id: str, turn_index_ref: dict):
#     """
#     Receives audio/text from Gemini, sends to client, and saves the completed AI turn.
#     This version uses the original background task logic and removes the duplicate save attempt.
#     """
#     logging.info(f"[{interview_id}] Starting gemini-to-client task.")
#     try:
#         while True:
#             try:
#                 message = await session._receive()
                
#                 # Accumulate AI text and audio
#                 if conversation_turns and conversation_turns[-1].speaker == "ai":
#                     current_ai_turn = conversation_turns[-1]
#                     if message.text:
#                         current_ai_turn.text += message.text
#                     if message.data:
#                         pcm_data = message.data
#                         wav_buffer = io.BytesIO()
#                         with wave.open(wav_buffer, 'wb') as wf:
#                             wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(24000)
#                             wf.writeframes(pcm_data)
#                         wav_buffer.seek(0)
#                         await websocket.send_bytes(wav_buffer.read())
#                         current_ai_turn.audio_chunks.append(pcm_data)
                
#                 if message.server_content and message.server_content.turn_complete:
#                     logging.info(f"[{interview_id}] AI turn is complete.")
                    
#                     # FIX #2: The loop that caused duplicate saves has been completely removed.
                    
#                     # Proceed with saving ONLY the current AI turn.
#                     if conversation_turns and conversation_turns[-1].speaker == "ai":
#                         ai_turn = conversation_turns[-1]
                        
#                         # Using the original background task as requested
#                         logging.info(f"[{interview_id}] Scheduling save for AI turn {turn_index_ref['value']}.")
#                         background_tasks.add_task(
#                             process_and_save_turn, 
#                             ai_turn, 
#                             interview_id, 
#                             turn_index_ref['value'],
#                             user_id
#                         )
#                         setattr(ai_turn, '_saved', True) # Optimistic marking
                        
#                         # Increment turn index and create placeholder for the next user turn
#                         turn_index_ref['value'] += 1
#                         conversation_turns.append(ConversationTurn("user"))
#                         logging.info(f"[{interview_id}] Created placeholder for user turn {turn_index_ref['value']}.")
                        
#                         try:
#                             await websocket.send_json({"type": "AI_TURN_COMPLETE"})
#                         except (ConnectionClosed, RuntimeError):
#                             break
            
#             except ConnectionClosed:
#                 logging.warning(f"[{interview_id}] WebSocket connection closed in gemini_to_client_task.")
#                 break

#     except Exception as e:
#         logging.error(f"[{interview_id}] Error in gemini_to_client_task: {e}", exc_info=True)

@router.websocket("/ws/{interview_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    interview_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(supabase_service.get_current_user_ws)
):
    await websocket.accept()
    logging.info(f"[{interview_id}] WebSocket connection accepted.")
    
    # Initialize these variables outside the try block so they're always defined
    tasks = []
    conversation_turns = []
    turn_index_ref = {'value': 0}
    
    try:
        # Get the interview data
        interview_data = await supabase_service.get_interview_data(current_user.id, interview_id)
        
        # IMPORTANT: Extract the correct user_id from the interview data
        interview_owner_id = interview_data.get("user_id")
        
        # Log both IDs to debug
        logging.info(f"[{interview_id}] Current user: {current_user.id}, Interview owner: {interview_owner_id}")
        
        # Use YOUR user ID (the one you created the interview with)
        # This ensures consistent storage paths
        storage_user_id = interview_owner_id if interview_owner_id else current_user.id
        
        # Get basic data
        resume_text = interview_data.get("resume", {}).get("extracted_text", "")
        job_description = interview_data.get("job_description", {}).get("description", "")
        enhanced_prompt = interview_data.get("enhanced_prompt")
        
        # Use enhanced prompt if available, otherwise use basic template
        if enhanced_prompt:
            logging.info(f"[{interview_id}] Using RAG-enhanced system prompt for video interview")
            system_instruction_text = f"""Enhanced Interview Context:
{enhanced_prompt}

You are an expert technical interviewer named 'Alex'. Use the enhanced context above to conduct a more personalized and targeted interview. Focus on the specific insights and recommendations provided in the enhanced context while maintaining your professional interviewing persona.

IMPORTANT: The enhanced context contains valuable insights about the candidate's background and the role requirements. Use this information to ask more targeted and relevant questions.

Candidate's Resume:
{resume_text}

Job Description:
{job_description}
"""
        else:
            logging.info(f"[{interview_id}] Using standard system prompt (RAG enhancement not available)")
            system_instruction_text = SYSTEM_PROMPT_TEMPLATE.format(
                resume=resume_text,
                job_description=job_description
            )
        
        # Use a simple dictionary for the config
        gemini_config = {
            "response_modalities": ["AUDIO"],
            "system_instruction": { "parts": [{"text": system_instruction_text}] }
        }   
        config = types.LiveConnectConfig.model_validate(gemini_config)
        logging.info(f"[{interview_id}] Connecting to Gemini Live API.")

        async with client.aio.live.connect(model=MODEL_NAME, config=config) as gemini_session:
            logging.info(f"[{interview_id}] Gemini connection successful.")
            
            # Initialize with the first AI turn
            conversation_turns = [ConversationTurn("ai")]
            
            # Add a keep-alive task
            keep_alive_task = asyncio.create_task(
                keep_alive_websocket(websocket, interview_id)
            )
            
            # Use storage_user_id instead of current_user.id
            c_to_g_task = asyncio.create_task(client_to_gemini_task(
                websocket, 
                gemini_session, 
                interview_id, 
                conversation_turns,
                background_tasks,
                storage_user_id,  # Use the correct user ID here
                turn_index_ref
            ))
            
            g_to_c_task = asyncio.create_task(gemini_to_client_task(
                websocket, 
                gemini_session, 
                interview_id, 
                background_tasks, 
                conversation_turns, 
                user_id=storage_user_id,  # Use the correct user ID here
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
    
        # Check ALL turns, not just the last one
        for i, turn in enumerate(conversation_turns):
            if (turn.audio_chunks or turn.text) and not hasattr(turn, '_saved'):
                try:
                    logging.info(f"[{interview_id}] Saving unsaved {turn.speaker} turn {i} on disconnect.")
                    await process_and_save_turn(turn, interview_id, i, current_user.id)
                except Exception as save_err:
                    logging.error(f"[{interview_id}] Error saving turn on disconnect: {save_err}")
    
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

def debug_gemini_message(message, interview_id: str):
    """Comprehensive debugging of Gemini message structure"""
    logging.info(f"[{interview_id}] === GEMINI MESSAGE DEBUG ===")
    
    # Top-level attributes
    logging.info(f"[{interview_id}] message type: {type(message)}")
    logging.info(f"[{interview_id}] setup_complete: {message.setup_complete}")
    logging.info(f"[{interview_id}] tool_call: {message.tool_call}")
    logging.info(f"[{interview_id}] usage_metadata: {message.usage_metadata}")
    
    # Check for text (this will show us if text exists anywhere)
    if hasattr(message, 'text') and message.text:
        logging.info(f"[{interview_id}] Direct text: '{message.text[:100]}...'")
    else:
        logging.info(f"[{interview_id}] Direct text: None")
    
    # Check for data (audio)
    if hasattr(message, 'data') and message.data:
        logging.info(f"[{interview_id}] Direct data: {len(message.data)} bytes")
    else:
        logging.info(f"[{interview_id}] Direct data: None")
    
    # Server content analysis
    if message.server_content:
        sc = message.server_content
        logging.info(f"[{interview_id}] server_content type: {type(sc)}")
        logging.info(f"[{interview_id}] turn_complete: {sc.turn_complete}")
        logging.info(f"[{interview_id}] generation_complete: {getattr(sc, 'generation_complete', 'N/A')}")
        
        # Model turn analysis
        if hasattr(sc, 'model_turn') and sc.model_turn:
            mt = sc.model_turn
            logging.info(f"[{interview_id}] model_turn type: {type(mt)}")
            
            if hasattr(mt, 'parts') and mt.parts:
                logging.info(f"[{interview_id}] model_turn has {len(mt.parts)} parts")
                
                for i, part in enumerate(mt.parts):
                    logging.info(f"[{interview_id}] Part {i} type: {type(part)}")
                    
                    # Check for text in parts
                    if hasattr(part, 'text') and part.text:
                        logging.info(f"[{interview_id}] Part {i} text: '{part.text[:100]}...'")
                    
                    # Check for inline_data (audio)
                    if hasattr(part, 'inline_data') and part.inline_data:
                        blob = part.inline_data
                        logging.info(f"[{interview_id}] Part {i} inline_data: {len(blob.data)} bytes, mime: {blob.mime_type}")
                    
                    # List all attributes of the part
                    part_attrs = [attr for attr in dir(part) if not attr.startswith('_')]
                    logging.info(f"[{interview_id}] Part {i} attributes: {part_attrs}")
            else:
                logging.info(f"[{interview_id}] model_turn has no parts")
        else:
            logging.info(f"[{interview_id}] No model_turn in server_content")
    else:
        logging.info(f"[{interview_id}] No server_content")
    
    # List all top-level attributes
    msg_attrs = [attr for attr in dir(message) if not attr.startswith('_')]
    logging.info(f"[{interview_id}] Message attributes: {msg_attrs}")
    
    logging.info(f"[{interview_id}] === END DEBUG ===")
