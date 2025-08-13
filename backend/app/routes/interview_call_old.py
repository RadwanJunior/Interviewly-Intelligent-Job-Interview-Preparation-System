# from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
# from google.api_core.exceptions import GoogleAPIError
# from app.services.supabase_service import SupabaseService
# from google import genai
# import os
# import asyncio

# # Replace genai.configure with the client-based initialization
# client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# router = APIRouter()
# MODEL_NAME = "gemini-live-2.5-flash-preview"
# SYSTEM_PROMPT_TEMPLATE = """
# You are an expert interviewer named 'Alex'. You are conducting a professional job interview. Treat this like a real interview.
# Your persona is friendly, encouraging, and professional. Keep your responses concise and focused on the interview questions.
# You will be provided with the candidate's resume and the job description. Your task is to ask relevant questions based on these documents.
# Start by introducing yourself and the role, then ask the first question. Wait for the user's response before asking the next question. Ask follow-up questions based on the candidate's answers to keep the conversation flowing naturally.
# Ask behavioral, technical, and situational questions to assess the candidate's fit for the role.
# Do not ask questions that are not relevant to the job or the candidate's experience.

# Candidate's Resume:
# {resume}

# Job Description:
# {job_description}
# """

# @router.websocket("/ws/{interview_id}")
# async def websocket_endpoint(
#     websocket: WebSocket, 
#     interview_id: str,
#     current_user: dict = Depends(SupabaseService.get_current_user_ws)
# ):
#     # 1. Authenticate the user
#     if not current_user or not getattr(current_user, "id", None):
#         await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed")
#         return

#     user_id = current_user.id
#     await websocket.accept()
    
#     # Define two concurrent tasks for bidirectional streaming
#     async def forward_client_to_gemini(ws, gemini_session):
#         """Receives audio from the client and forwards it to Gemini."""
#         try:
#             while True:
#                 audio_chunk = await ws.receive_bytes()
#                 await gemini_session.send_realtime_input(
#                     audio={"data": audio_chunk}
#                 )
#         except WebSocketDisconnect:
#             print("Client disconnected, closing forwarder to Gemini.")

#     async def forward_gemini_to_client(ws, gemini_session):
#         """Receives audio from Gemini and forwards it to the client."""
#         try:
#             async for response in gemini_session.receive():
#                 if response.data:
#                     await ws.send_bytes(response.data)
#         except WebSocketDisconnect:
#             print("Client disconnected, closing forwarder from Gemini.")

#     try:
#         # 2. Fetch Interview Context
#         interview_data = await SupabaseService.get_interview_data(user_id, interview_id)
#         if not interview_data:
#             await websocket.send_json({"error": "Interview context not found or access denied."})
#             return

#         resume_text = interview_data.get("resume", {}).get("extracted_text", "Not available.")
#         job_desc_text = interview_data.get("job_description", {}).get("description", "Not available.")
        
#         system_instruction = SYSTEM_PROMPT_TEMPLATE.format(
#             resume=resume_text,
#             job_description=job_desc_text
#         )

#         # 3. Connect to Gemini Live API using the correct async context manager
#         print("Connecting to Gemini Live API...")

#         # Define the configuration as a dictionary
#         gemini_config = {
#             "response_modalities": ["AUDIO"],
#             "system_instruction": system_instruction
#         }
#         async with client.aio.live.connect(
#             model=MODEL_NAME,
#             config=gemini_config
#         ) as gemini_session:
#             print("Connected to Gemini.")

#             # 5. Run both streaming tasks concurrently
#             client_to_gemini_task = asyncio.create_task(
#                 forward_client_to_gemini(websocket, gemini_session)
#             )
#             gemini_to_client_task = asyncio.create_task(
#                 forward_gemini_to_client(websocket, gemini_session)
#             )
            
#             await asyncio.gather(client_to_gemini_task, gemini_to_client_task)

#     except WebSocketDisconnect:
#         print(f"Client disconnected from interview {interview_id}")
#     except GoogleAPIError as e:
#         print(f"Gemini API Error: {e}")
#     except Exception as e:
#         print(f"An unexpected error occurred: {e}")
#     finally:
#         print(f"Closing connection for interview {interview_id}")
#         if websocket.client_state.value != 3: # 3 is 'DISCONNECTED'
#             await websocket.close()

# ##### --------------------- SOLUTION 2 NOT USED --------------------- #####
# from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, status
# from app.services.supabase_service import SupabaseService
# from google import genai
# import os
# import asyncio
# import json
# import logging
# from fastapi.background import BackgroundTasks
# import base64

# # --- LOGGING SETUP (No changes) ---
# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
# client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
# router = APIRouter()
# MODEL_NAME = "gemini-live-2.5-flash-preview"
# SYSTEM_PROMPT_TEMPLATE = """
# You are an expert interviewer named 'Alex'. You are conducting a professional job interview. Treat this like a real interview.
# Your persona is friendly, encouraging, and professional. Keep your responses concise and focused on the interview questions.
# You will be provided with the candidate's resume and the job description. Your task is to ask relevant questions based on these documents.
# Start by introducing yourself and the role, then ask the first question. Wait for the user's response before asking the next question. Ask follow-up questions based on the candidate's answers to keep the conversation flowing naturally.
# Ask behavioral, technical, and situational questions to assess the candidate's fit for the role.
# Do not ask questions that are not relevant to the job or the candidate's experience.

# Candidate's Resume:
# {resume}

# Job Description:
# {job_description}
# """

# # --- ConversationTurn and process_and_save_turn (No major changes) ---
# class ConversationTurn:
#     def __init__(self, speaker: str):
#         self.speaker = speaker
#         self.text = ""
#         self.audio_chunks = []

# async def process_and_save_turn(turn: ConversationTurn, interview_id: str, turn_index: int):
#     if not turn.audio_chunks:
#         logging.warning(f"[{interview_id}] Skipping turn {turn_index} for {turn.speaker} due to no audio.")
#         return
#     try:
#         full_audio = b"".join(turn.audio_chunks)
#         audio_url = await SupabaseService.upload_audio_to_storage(
#             interview_id, full_audio, turn_index, turn.speaker
#         )
#         if audio_url:
#             await SupabaseService.save_conversation_turn(
#                 interview_id, turn.speaker, turn.text, audio_url
#             )
#             logging.info(f"[{interview_id}] Successfully saved turn {turn_index}.")
#         else:
#             logging.error(f"[{interview_id}] Failed to get audio URL for turn {turn_index}.")
#     except Exception as e:
#         logging.error(f"[{interview_id}] Error in background task for turn {turn_index}: {e}", exc_info=True)


# async def client_to_gemini_task(websocket: WebSocket, gemini_session, interview_id: str):
#     """
#     REDESIGNED ARCHITECTURE: Streams audio by sending raw `realtime_input`
#     payloads, then ends the turn with a raw `client_content` payload.
#     This bypasses the flawed genai library's `send` method entirely.
#     """
#     logging.info(f"[{interview_id}] Starting redesigned client-to-gemini task.")
    
#     # 1. Get the raw, authenticated websocket connection from the session object.
#     raw_ws = gemini_session._ws

#     try:
#         while True:
#             event = await websocket.receive()

#             # 2. For each audio chunk, create and send a 'realtime_input' payload.
#             if 'bytes' in event and event['bytes'] is not None:
#                 chunk = event['bytes']
#                 encoded_audio_data = base64.b64encode(chunk).decode('utf-8')

#                 realtime_payload = {
#                     "realtime_input": {
#                         "media_chunks": [{"data": encoded_audio_data, "mime_type": "audio/pcm"}]
#                     }
#                 }
#                 await raw_ws.send(json.dumps(realtime_payload))

#             # 3. When the user is done, send the 'client_content' payload to end the turn.
#             elif 'text' in event and event['text'] is not None:
#                 message = json.loads(event['text'])
#                 if message.get("type") == "USER_AUDIO_END":
#                     logging.info(f"[{interview_id}] User finished. Sending 'turn_complete' signal.")
#                     end_of_turn_payload = {"client_content": {"turn_complete": True}}
#                     await raw_ws.send(json.dumps(end_of_turn_payload))

#     except WebSocketDisconnect:
#         logging.warning(f"[{interview_id}] Client disconnected from client-to-gemini_task.")
#     except Exception as e:
#         logging.error(f"[{interview_id}] Error in client-to-gemini_task: {e}", exc_info=True)

# # =========================================================================
# # === COMPLETELY REWRITTEN GEMINI-TO-CLIENT TASK (Based on Docs) ===
# # =========================================================================
# async def gemini_to_client_task(websocket: WebSocket, gemini_session, conversation_turns: list, interview_id: str, background_tasks: BackgroundTasks):
#     """Receives responses from Gemini, forwards them, and saves transcripts."""
#     logging.info(f"[{interview_id}] Starting gemini-to-client task...")
#     turn_index = 0
#     try:
#         async for response in gemini_session.receive():
#             content = response.server_content
            
#             # Handle audio output from the model
#             if content.model_turn and content.model_turn.parts:
#                 audio_part = next((p for p in content.model_turn.parts if p.audio), None)
#                 if audio_part:
#                     audio_data = audio_part.audio
#                     logging.info(f"[{interview_id}] Received {len(audio_data)} bytes from Gemini. Forwarding to client.")
#                     await websocket.send_bytes(audio_data)
#                     if conversation_turns and conversation_turns[-1].speaker == "ai":
#                         conversation_turns[-1].audio_chunks.append(audio_data)

#             # Handle transcripts
#             if content.output_transcription and content.output_transcription.text:
#                 transcript = content.output_transcription.text
#                 logging.info(f"[{interview_id}] Final AI transcript: '{transcript}'")
#                 if conversation_turns and conversation_turns[-1].speaker == "ai":
#                     ai_turn = conversation_turns[-1]
#                     ai_turn.text = transcript
#                     background_tasks.add_task(process_and_save_turn, ai_turn, interview_id, turn_index)
#                     turn_index += 1
#                     conversation_turns.append(ConversationTurn("user")) # Start next turn for user
            
#             if content.input_transcription and content.input_transcription.text:
#                 transcript = content.input_transcription.text
#                 logging.info(f"[{interview_id}] Final User transcript: '{transcript}'")
#                 if conversation_turns and conversation_turns[-1].speaker == "user":
#                     user_turn = conversation_turns[-1]
#                     user_turn.text = transcript
#                     # Don't save the turn here, wait for the AI to respond first

#     except Exception as e:
#         logging.error(f"[{interview_id}] Error in gemini_to_client_task: {e}", exc_info=True)


# # =========================================================================
# # === UPDATED WEBSOCKET ENDPOINT (Based on Docs) ===
# # =========================================================================
# @router.websocket("/ws/{interview_id}")
# async def websocket_endpoint(
#     websocket: WebSocket,
#     interview_id: str,
#     background_tasks: BackgroundTasks,
#     current_user: dict = Depends(SupabaseService.get_current_user_ws)
# ):
#     await websocket.accept()
#     logging.info(f"[{interview_id}] WebSocket connection accepted.")
    
#     try:
#         interview_data = await SupabaseService.get_interview_data(current_user.id, interview_id)
#         system_instruction_text = SYSTEM_PROMPT_TEMPLATE.format(
#             resume=interview_data.get("resume", {}).get("extracted_text", ""),
#             job_description=interview_data.get("job_description", {}).get("description", "")
#         )
#         # Use the minimal dictionary config that passed validation
#         gemini_config = {
#             "response_modalities": ["AUDIO"],
#             "system_instruction": { "parts": [{"text": system_instruction_text}] }
#         }
        
#         logging.info(f"[{interview_id}] Connecting to Gemini Live API.")
        
#         async with client.aio.live.connect(model=MODEL_NAME, config=gemini_config) as gemini_session:
#             logging.info(f"[{interview_id}] Gemini connection successful.")
            
#             conversation_turns = [ConversationTurn("ai")]

#             # The two-task model is correct for simultaneous I/O.
#             # The problem was the payload generation, which is now fixed.
#             c_to_g_task = asyncio.create_task(client_to_gemini_task(websocket, gemini_session, interview_id))
#             g_to_c_task = asyncio.create_task(gemini_to_client_task(websocket, gemini_session, conversation_turns, interview_id, background_tasks))
            
#             await asyncio.gather(c_to_g_task, g_to_c_task)

#     except WebSocketDisconnect:
#         logging.info(f"[{interview_id}] Client disconnected gracefully.")
#     except Exception as e:
#         logging.error(f"[{interview_id}] An unexpected error occurred: {e}", exc_info=True)
#     finally:
#         logging.info(f"[{interview_id}] Closing WebSocket connection.")

###### ---------------------- SOLUTION 3 ---------------------- ######
# from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
# from app.services.supabase_service import SupabaseService
# from google import genai
# import os
# import asyncio
# import json
# import logging
# from fastapi.background import BackgroundTasks
# import base64

# # --- LOGGING AND CONSTANTS (UNCHANGED) ---
# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
# client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
# router = APIRouter()
# MODEL_NAME = "gemini-live-2.5-flash-preview"
# SYSTEM_PROMPT_TEMPLATE = """
# You are an expert interviewer named 'Alex'. You are conducting a professional job interview. Treat this like a real interview.
# Your persona is friendly, encouraging, and professional. Keep your responses concise and focused on the interview questions.
# You will be provided with the candidate's resume and the job description. Your task is to ask relevant questions based on these documents.
# Start by introducing yourself and the role, then ask the first question. Wait for the user's response before asking the next question. Ask follow-up questions based on the candidate's answers to keep the conversation flowing naturally.
# Ask behavioral, technical, and situational questions to assess the candidate's fit for the role.
# Do not ask questions that are not relevant to the job or the candidate's experience.

# Candidate's Resume:
# {resume}

# Job Description:
# {job_description}
# """

# # --- CONVERSATION TURN & DB HELPERS (UNCHANGED) ---
# class ConversationTurn:
#     def __init__(self, speaker: str):
#         self.speaker = speaker
#         self.text = ""
#         self.audio_chunks = []

# async def process_and_save_turn(turn: ConversationTurn, interview_id: str, turn_index: int):
#     if not turn.audio_chunks: return
#     try:
#         full_audio = b"".join(turn.audio_chunks)
#         audio_url = await SupabaseService.upload_audio_to_storage(interview_id, full_audio, turn_index, turn.speaker)
#         if audio_url:
#             await SupabaseService.save_conversation_turn(interview_id, turn_index, turn.speaker, turn.text, audio_url)
#             logging.info(f"[{interview_id}] Successfully saved turn {turn_index}.")
#         else:
#             logging.error(f"[{interview_id}] Failed to get audio URL for turn {turn_index}.")
#     except Exception as e:
#         logging.error(f"[{interview_id}] Error in background task for turn {turn_index}: {e}", exc_info=True)


# # =========================================================================
# # === FINAL, SIMPLIFIED WEBSOCKET ENDPOINT (USER-FIRST ARCHITECTURE) ===
# # =========================================================================
# @router.websocket("/ws/{interview_id}")
# async def websocket_endpoint(
#     websocket: WebSocket,
#     interview_id: str,
#     background_tasks: BackgroundTasks,
#     current_user: dict = Depends(SupabaseService.get_current_user_ws)
# ):
#     await websocket.accept()
#     logging.info(f"[{interview_id}] WebSocket connection accepted.")
    
#     try:
#         # --- 1. INITIAL SETUP ---
#         interview_data = await SupabaseService.get_interview_data(current_user.id, interview_id)
#         system_instruction_text = SYSTEM_PROMPT_TEMPLATE.format(
#             resume=interview_data.get("resume", {}).get("extracted_text", ""),
#             job_description=interview_data.get("job_description", {}).get("description", "")
#         )
#         gemini_config = {
#             "response_modalities": ["AUDIO"],
#             "system_instruction": { "parts": [{"text": system_instruction_text}] }
#         }
        
#         logging.info(f"[{interview_id}] Connecting to Gemini Live API.")
        
#         async with client.aio.live.connect(model=MODEL_NAME, config=gemini_config) as gemini_session:
#             logging.info(f"[{interview_id}] Gemini connection successful. Ready for user's first turn.")
            
#             turn_index = 0
            
#             # --- 2. MAIN CONVERSATION LOOP (USER ALWAYS GOES FIRST) ---
#             while True:
#                 # --- 2A. COLLECT USER'S ENTIRE TURN ---
#                 logging.info(f"[{interview_id}] Turn {turn_index}: Waiting for user to speak...")
#                 user_audio_chunks = []
#                 while True:
#                     event = await websocket.receive()
#                     if 'bytes' in event and event['bytes'] is not None:
#                         user_audio_chunks.append(event['bytes'])
#                     elif 'text' in event and event['text'] is not None:
#                         message = json.loads(event['text'])
#                         if message.get("type") == "USER_AUDIO_END":
#                             logging.info(f"[{interview_id}] User finished speaking.")
#                             break

#                 # --- 2B. PREPARE AND SEND TO GEMINI ---
#                 if not user_audio_chunks:
#                     logging.warning(f"[{interview_id}] No audio received for this turn. Ending session.")
#                     break
                
#                 full_audio = b"".join(user_audio_chunks)
#                 encoded_audio = base64.b64encode(full_audio).decode('utf-8')
                
#                 model_input = {
#                     "turns": [{"parts": [{"inlineData": {"data": encoded_audio, "mime_type": "audio/pcm"}}]}],
#                     "turn_complete": True
#                 }
#                 logging.info(f"[{interview_id}] Sending {len(full_audio)} bytes to Gemini.")
#                 await gemini_session.send(input=model_input, end_of_turn=True)
#                 # --- 2C. RECEIVE FROM GEMINI AND STREAM TO CLIENT ---
#                 logging.info(f"[{interview_id}] Listening for Gemini's response...")
#                 ai_turn = ConversationTurn("ai")
                
#                 async for response in gemini_session.receive():
#                     print(f"[{interview_id}] Received response from Gemini: {response.server_content}")
#                     content = response.server_content
#                     if content.model_turn and content.model_turn.parts:
#                         audio_part = next((p for p in content.model_turn.parts if p.audio), None)
#                         if audio_part:
#                             await websocket.send_bytes(audio_part.audio)
#                             ai_turn.audio_chunks.append(audio_part.audio)
#                     if content.output_transcription and content.output_transcription.text:
#                         ai_turn.text = content.output_transcription.text
                
#                 logging.info(f"[{interview_id}] AI response received: '{ai_turn.text}'")
#                 background_tasks.add_task(process_and_save_turn, ai_turn, interview_id, turn_index)
#                 turn_index += 1

#     except WebSocketDisconnect:
#         logging.info(f"[{interview_id}] Client disconnected gracefully.")
#     except Exception as e:
#         logging.error(f"[{interview_id}] An unexpected error occurred: {e}", exc_info=True)
#     finally:
#         logging.info(f"[{interview_id}] Closing WebSocket connection.")



###### Solution 4 ############################
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.services.supabase_service import SupabaseService
from google import genai
# IMPORTANT: The new library uses the 'types' module extensively.
from google.genai import types
import os
import asyncio
import json
import logging
from fastapi.background import BackgroundTasks
import wave
import io
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

async def process_and_save_turn(turn: ConversationTurn, interview_id: str, turn_index: int):
    # This background task logic remains valid.
    if not turn.audio_chunks:
        logging.warning(f"[{interview_id}] Skipping turn {turn_index} for {turn.speaker} due to no audio.")
        return
    try:
        full_audio = b"".join(turn.audio_chunks)
        audio_url = await SupabaseService.upload_audio_to_storage(
            interview_id, full_audio, turn_index, turn.speaker
        )
        if audio_url:
            await SupabaseService.save_conversation_turn(
                interview_id, turn.speaker, turn.text, audio_url
            )
            logging.info(f"[{interview_id}] Successfully saved turn {turn_index}.")
        else:
            logging.error(f"[{interview_id}] Failed to get audio URL for turn {turn_index}.")
    except Exception as e:
        logging.error(f"[{interview_id}] Error in background task for turn {turn_index}: {e}", exc_info=True)


# =========================================================================
# === FINAL, ROBUST ASYNC TASKS USING NEW SDK METHODS ===
# =========================================================================

async def client_to_gemini_task(websocket: WebSocket, session: genai.live.AsyncSession, interview_id: str, conversation_turns: list):
    """
    Handles streaming user audio to Gemini, while also storing it for later transcription.
    """
    logging.info(f"[{interview_id}] Starting client-to-gemini task.")
    try:
        while True:
            event = await websocket.receive()

            # For audio chunks, both send to Gemini and store locally
            if 'bytes' in event and event['bytes'] is not None:
                chunk = event['bytes']
                
                # 1. Store the chunk in the current user turn
                if conversation_turns and conversation_turns[-1].speaker == "user":
                    conversation_turns[-1].audio_chunks.append(chunk)
                    logging.info(f"[{interview_id}] Stored {len(chunk)} bytes of user audio.")
            
                # 2. Send to Gemini
                await session.send_realtime_input(
                    audio=types.Blob(data=chunk, mime_type="audio/pcm;rate=16000")
                )
                logging.info(f"[{interview_id}] Sent {len(chunk)} bytes of user audio to Gemini.")

            # When user finishes speaking, signal to Gemini
            elif 'text' in event and event['text'] is not None:
                message = json.loads(event['text'])
                if message.get("type") == "USER_AUDIO_END":
                    logging.info(f"[{interview_id}] User finished. Sending audio_stream_end signal.")
                    await session.send_realtime_input(audio_stream_end=True)

    except WebSocketDisconnect:
        logging.warning(f"[{interview_id}] Client disconnected from client-to-gemini task.")
    except Exception as e:
        logging.error(f"[{interview_id}] Error in client-to-gemini task: {e}", exc_info=True)


async def gemini_to_client_task(websocket: WebSocket, session: genai.live.AsyncSession, interview_id: str, background_tasks: BackgroundTasks, conversation_turns: list):
    """Receives audio chunks from Gemini, converts them to WAV, and alternates between speakers."""
    logging.info(f"[{interview_id}] Starting gemini-to-client task.")
    turn_index = 0
    
    # FIX: Remove this line since conversation_turns is now passed as a parameter
    # conversation_turns = [ConversationTurn("ai")]
    
    try:
        async for response in session.receive():
            # Handle AI audio data
            if response.data:
                # Create a WAV wrapper for the PCM data
                pcm_data = response.data
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
                conversation_turns[-1].audio_chunks.append(pcm_data)
                logging.info(f"[{interview_id}] Sent {len(wav_data)} bytes of WAV audio to client.")
            
            # When AI turn is complete, save it and prepare for user's turn
            if response.server_content and response.server_content.turn_complete:
                ai_turn = conversation_turns[-1]
                # Store text if available (will be empty with AUDIO-only modality)
                if response.text:
                    ai_turn.text = response.text
                
                # logging.info(f"[{interview_id}] AI Turn {turn_index} complete. Storing audio with {len(ai_turn.audio_chunks)} chunks.")
                
                # Save the completed AI turn
                background_tasks.add_task(
                    process_and_save_turn, 
                    ai_turn, 
                    interview_id, 
                    turn_index
                )
                turn_index += 1
                
                # IMPORTANT: Create a USER turn next (not AI)
                conversation_turns.append(ConversationTurn("user"))
                logging.info(f"[{interview_id}] Ready for user turn {turn_index}.")
                
                # Signal frontend that it's time for user to speak
                await websocket.send_json({"type": "AI_TURN_COMPLETE"})

    except Exception as e:
        logging.error(f"[{interview_id}] Error in gemini-to-client task: {e}", exc_info=True)


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
            logging.info(f"[{interview_id}] Gemini connection successful. Ready for user.")
            
            # FIX: Create a shared conversation_turns list here
            conversation_turns = [ConversationTurn("ai")]  # Start with AI turn
            
            # Pass the shared list to both tasks
            c_to_g_task = asyncio.create_task(client_to_gemini_task(websocket, gemini_session, interview_id, conversation_turns))
            g_to_c_task = asyncio.create_task(gemini_to_client_task(websocket, gemini_session, interview_id, background_tasks, conversation_turns))
            
            await asyncio.gather(c_to_g_task, g_to_c_task)

    except WebSocketDisconnect:
        logging.info(f"[{interview_id}] Client disconnected gracefully.")
    except Exception as e:
        logging.error(f"[{interview_id}] An unexpected error occurred: {e}", exc_info=True)
    finally:
        logging.info(f"[{interview_id}] Closing WebSocket connection.")
