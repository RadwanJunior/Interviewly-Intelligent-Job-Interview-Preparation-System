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
            speaker = turn_data.get("speaker")
            audio_chunks = turn_data.get("audio_chunks", [])
            text_content = turn_data.get("text", "")
            
            logging.info(f"[{interview_id}] Processing {speaker} turn {turn_index} with {len(audio_chunks)} chunks")
            
            if not audio_chunks:
                return {"status": "skipped", "reason": "no_audio"}
                
            # 1. Concatenate all audio chunks
            full_audio = b"".join(audio_chunks)
            
            # 2. Create proper WAV file
            sample_rate = 24000 if speaker == "ai" else 16000
            wav_buffer = io.BytesIO()
            
            with wave.open(wav_buffer, 'wb') as wav_file:
                wav_file.setnchannels(1)  # Mono
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(full_audio)
                
            wav_buffer.seek(0)
            wav_data = wav_buffer.read()
            
            # 3. Calculate audio duration
            num_frames = len(full_audio) // 2  # 16-bit audio = 2 bytes per frame
            duration_seconds = num_frames / sample_rate
            
            # 4. Upload to Supabase
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
            # Normalize before saving
            audio_url = SupabaseService.normalize_public_url(audio_url)

            if not audio_url:
                logging.error(f"[{interview_id}] Failed to upload audio for turn {turn_index}")
                return {"status": "error", "reason": "upload_failed"}
                
            # 5. Save record to conversation_turns table
            turn_record = {
                "interview_id": interview_id,
                "turn_index": turn_index,
                "speaker": speaker,
                "text_content": text_content,
                "audio_url": audio_url,
                "audio_duration_seconds": round(duration_seconds, 2),
                "user_id": user_id 
            }
            
            logging.info(f"[{interview_id}] Saving turn {turn_index} to database")
            result = await SupabaseService.save_conversation_turn(turn_record)
            
            if isinstance(result, dict) and result.get("error"):
                logging.error(f"[{interview_id}] DB save error: {result.get('error')}")
                return {"status": "error", "reason": "db_save_failed", "details": str(result.get("error"))}
                
            logging.info(f"[{interview_id}] Successfully saved {speaker} turn {turn_index}")
            
            return {
                "status": "success",
                "turn_index": turn_index,
                "speaker": speaker,
                "audio_url": audio_url
            }
            
        except Exception as e:
            logging.error(f"[{interview_id}] Error processing turn {turn_index}: {str(e)}", exc_info=True)
            return {"status": "error", "reason": "processing_failed", "details": str(e)}