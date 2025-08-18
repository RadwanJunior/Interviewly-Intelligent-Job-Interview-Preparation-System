import logging
import io
import wave
from app.services.supabase_service import SupabaseService
from datetime import datetime
from typing import Dict, Any, List

class ConversationService:
    @staticmethod
    async def process_turn_audio(
        turn_data: Dict[str, Any],
        interview_id: str,
        user_id: str,
        turn_index: int
    ) -> Dict[str, Any]:
        """
        Process and save a turn's audio data to Supabase.
        """
        try:
            speaker = turn_data.get("speaker", "unknown")
            audio_chunks = turn_data.get("audio_chunks", [])
            text_content = turn_data.get("text", "")
            
            logging.info(f"[{interview_id}] Processing audio for {speaker} turn {turn_index}")
            
            # Skip processing if no audio chunks and no text
            if not audio_chunks and not text_content:
                logging.warning(f"[{interview_id}] No audio chunks or text for {speaker} turn {turn_index}")
                return {"status": "skipped", "reason": "no_content"}
            
            # Handle text-only turns (this helps with AI turns that might not have audio)
            if not audio_chunks and text_content:
                logging.info(f"[{interview_id}] Processing text-only turn for {speaker}")
                turn_record = {
                    "interview_id": interview_id,
                    "turn_index": turn_index,
                    "speaker": speaker,
                    "text_content": text_content,
                    "audio_url": None,
                    "audio_duration_seconds": 0,
                    "user_id": user_id
                }
                
                try:
                    result = await SupabaseService.save_conversation_turn(turn_record)
                    if isinstance(result, dict) and result.get("error"):
                        return {"status": "error", "reason": "db_save_failed", "details": str(result.get("error"))}
                    logging.info(f"[{interview_id}] Successfully saved text-only turn {turn_index} for {speaker}")
                    return {"status": "success", "turn_index": turn_index, "speaker": speaker, "audio_url": None}
                except Exception as db_err:
                    logging.error(f"[{interview_id}] Database error saving text-only turn: {str(db_err)}")
                    raise
            
            # Process audio for turns with audio chunks
            if audio_chunks:
                # Concatenate audio chunks and convert to WAV
                try:
                    logging.info(f"[{interview_id}] Processing {len(audio_chunks)} audio chunks totaling {sum(len(c) for c in audio_chunks)} bytes")
                    
                    import wave
                    import tempfile
                    from datetime import datetime
                    
                    # Create a temporary WAV file
                    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_wav:
                        temp_path = temp_wav.name
                        
                    # Convert audio chunks to WAV format
                    with wave.open(temp_path, 'wb') as wf:
                        wf.setnchannels(1)
                        wf.setsampwidth(2)
                        wf.setframerate(16000)  # Default sample rate for web audio
                        for chunk in audio_chunks:
                            wf.writeframes(chunk)
                    
                    # Read the WAV data for upload
                    with open(temp_path, 'rb') as f:
                        wav_data = f.read()
                    
                    # Clean up temp file
                    import os
                    os.unlink(temp_path)
                    
                    # Check if we actually got some audio data
                    if not wav_data or len(wav_data) < 100:  # Tiny files are probably corrupt
                        logging.warning(f"[{interview_id}] Generated WAV file is too small/empty: {len(wav_data)} bytes")
                        return {"status": "error", "reason": "empty_audio_file"}
                    
                    # Create filename with timestamp to avoid collisions
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    filename = f"{speaker}_turn_{turn_index}_{timestamp}.wav"
                    
                    # Upload the audio file to storage and get URL
                    logging.info(f"[{interview_id}] Uploading audio for turn {turn_index}")
                    audio_url = await SupabaseService.upload_audio_to_storage(
                        user_id=user_id,
                        interview_id=interview_id,
                        audio_data=wav_data,
                        filename=filename
                    )
                    
                    # Verify the URL before continuing
                    if not audio_url:
                        logging.error(f"[{interview_id}] Failed to get URL after upload for turn {turn_index}")
                        return {"status": "error", "reason": "upload_url_missing"}
                    
                    # Normalize before saving
                    audio_url = SupabaseService.normalize_public_url(audio_url)
                    
                    if not audio_url:
                        logging.error(f"[{interview_id}] Failed to upload audio for turn {turn_index}")
                        return {"status": "error", "reason": "upload_failed"}
                    
                    # Log success of the upload step
                    logging.info(f"[{interview_id}] Successfully uploaded audio for turn {turn_index} to {audio_url}")
                    
                    # Create DB record with audio URL and any available text
                    turn_record = {
                        "interview_id": interview_id,
                        "turn_index": turn_index,
                        "speaker": speaker,
                        "text_content": text_content,
                        "audio_url": audio_url,
                        "audio_duration_seconds": len(wav_data) / 16000 / 2,  # Rough estimate based on mono 16-bit PCM
                        "user_id": user_id
                    }
                    
                    # Save to database
                    logging.info(f"[{interview_id}] Saving turn {turn_index} to database")
                    result = await SupabaseService.save_conversation_turn(turn_record)
                    
                    if isinstance(result, dict) and result.get("error"):
                        logging.error(f"[{interview_id}] Database save error: {result.get('error')}")
                        return {"status": "error", "reason": "db_save_failed", "details": str(result.get("error"))}
                        
                    logging.info(f"[{interview_id}] Successfully saved {speaker} turn {turn_index}")
                    
                    return {
                        "status": "success",
                        "turn_index": turn_index,
                        "speaker": speaker,
                        "audio_url": audio_url
                    }
                    
                except Exception as audio_err:
                    logging.error(f"[{interview_id}] Error processing audio: {str(audio_err)}", exc_info=True)
                    # Try to save text-only record as fallback
                    if text_content:
                        try:
                            logging.info(f"[{interview_id}] Falling back to text-only save after audio processing error")
                            fallback_record = {
                                "interview_id": interview_id,
                                "turn_index": turn_index,
                                "speaker": speaker,
                                "text_content": text_content,
                                "audio_url": None,
                                "audio_duration_seconds": 0,
                                "user_id": user_id
                            }
                            await SupabaseService.save_conversation_turn(fallback_record)
                            return {"status": "partial_success", "reason": "audio_failed_text_saved"}
                        except Exception:
                            pass  # Already in exception handler, just continue to final error
                    
                    raise  # Re-raise the original exception
                
        except Exception as e:
            logging.error(f"[{interview_id}] Error processing turn {turn_index}: {str(e)}", exc_info=True)
            return {"status": "error", "reason": "processing_failed", "details": str(e)}