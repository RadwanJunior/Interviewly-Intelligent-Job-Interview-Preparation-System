import os
import json
import logging
import asyncio
from typing import Any, Callable, Dict, Optional
import redis.asyncio as redis

class UpstashRedisService:
    """Service for interacting with Upstash Redis"""
    
    def __init__(self, url: str = None):
        """Initialize with optional URL override"""
        self.url = url or os.getenv("UPSTASH_REDIS_URL")
        if not self.url:
            raise ValueError("UPSTASH_REDIS_URL environment variable not set")
            
        self.client = None
        self.pubsub = None
        self._subscribers = {}
        self._listener_task = None
    
    async def connect(self):
        """Connect to Upstash Redis"""
        try:
            logging.info(f"Connecting to Upstash Redis...")
            
            self.client = redis.from_url(
                self.url,
                decode_responses=True,  # Auto-decode responses to strings
                socket_timeout=5.0,     # 5 second timeout
                socket_keepalive=True,  # Keep connection alive
                health_check_interval=30  # Health check every 30s
            )
            
            # Test connection
            await self.client.ping()
            
            # Initialize pubsub client
            self.pubsub = self.client.pubsub()
            
            logging.info("Successfully connected to Upstash Redis")
            return True
            
        except Exception as e:
            logging.error(f"Failed to connect to Upstash Redis: {str(e)}")
            return False
    
    async def publish(self, channel: str, message: Any) -> int:
        """Publish message to a channel"""
        try:
            if isinstance(message, (dict, list)):
                message = json.dumps(message)
                
            return await self.client.publish(channel, message)
            
        except Exception as e:
            logging.error(f"Error publishing to channel {channel}: {str(e)}")
            return 0
    
    async def subscribe(self, channel: str, callback: Callable):
        """Subscribe to a channel with callback"""
        try:
            # Store callback
            if channel not in self._subscribers:
                self._subscribers[channel] = []
            self._subscribers[channel].append(callback)
            
            # Subscribe to channel
            await self.pubsub.subscribe(channel)
            logging.info(f"Subscribed to channel: {channel}")
            
            # Start message listener if not running
            if not self._listener_task or self._listener_task.done():
                self._listener_task = asyncio.create_task(self._message_listener())
                
        except Exception as e:
            logging.error(f"Error subscribing to channel {channel}: {str(e)}")
    
    async def unsubscribe(self, channel: str, callback: Optional[Callable] = None):
        """Unsubscribe from a channel"""
        try:
            if callback and channel in self._subscribers:
                # Remove specific callback
                if callback in self._subscribers[channel]:
                    self._subscribers[channel].remove(callback)
                    logging.info(f"Removed callback from channel: {channel}")
                
                # If no more callbacks, unsubscribe from channel
                if not self._subscribers[channel]:
                    await self.pubsub.unsubscribe(channel)
                    del self._subscribers[channel]
                    logging.info(f"Unsubscribed from channel: {channel}")
            elif not callback and channel in self._subscribers:
                # Remove all callbacks and unsubscribe
                await self.pubsub.unsubscribe(channel)
                del self._subscribers[channel]
                logging.info(f"Unsubscribed from channel: {channel}")
                
        except Exception as e:
            logging.error(f"Error unsubscribing from channel {channel}: {str(e)}")
    
    async def _message_listener(self):
        """Listen for messages in the background"""
        try:
            while True:
                message = await self.pubsub.get_message(ignore_subscribe_messages=True)
                if message:
                    channel = message["channel"]
                    data = message["data"]
                    
                    # Parse JSON if possible
                    if isinstance(data, str):
                        try:
                            if data.startswith("{") or data.startswith("["):
                                data = json.loads(data)
                        except json.JSONDecodeError:
                            pass  # Keep as string if not valid JSON
                    
                    # Invoke callbacks
                    if channel in self._subscribers:
                        for callback in self._subscribers[channel]:
                            try:
                                await callback({"channel": channel, "data": data})
                            except Exception as e:
                                logging.error(f"Error in callback for {channel}: {str(e)}")
                
                # Small sleep to prevent CPU hogging
                await asyncio.sleep(0.01)
                
        except Exception as e:
            logging.error(f"Error in message listener: {str(e)}")
            # Restart listener after a short delay
            await asyncio.sleep(1)
            self._listener_task = asyncio.create_task(self._message_listener())
    
    async def get(self, key: str) -> Any:
        """Get a value from Redis"""
        try:
            value = await self.client.get(key)
            if value and (isinstance(value, str) and (value.startswith("{") or value.startswith("["))):
                try:
                    return json.loads(value)
                except json.JSONDecodeError:
                    return value
            return value
        except Exception as e:
            logging.error(f"Error getting key {key}: {str(e)}")
            return None
    
    async def set(self, key: str, value: Any, expiry: Optional[int] = None) -> bool:
        """Set a value in Redis with optional expiry"""
        try:
            if isinstance(value, (dict, list)):
                value = json.dumps(value)
                
            if expiry:
                await self.client.setex(key, expiry, value)
            else:
                await self.client.set(key, value)
            return True
        except Exception as e:
            logging.error(f"Error setting key {key}: {str(e)}")
            return False
    
    async def close(self):
        """Close Redis connections"""
        try:
            if self.pubsub:
                await self.pubsub.close()
            if self.client:
                await self.client.close()
            logging.info("Upstash Redis connection closed")
        except Exception as e:
            logging.error(f"Error closing Redis connection: {str(e)}")


# Global redis client instance
redis_client = UpstashRedisService()

async def initialize_redis():
    """Initialize the Redis client"""
    await redis_client.connect()

async def setup_rag_listeners():
    """Setup listeners for RAG-related channels"""
    from app.services.supabase_service import SupabaseService
    
    async def handle_prompt_ready(message):
        """Handle prompt-ready messages from n8n workflow"""
        try:
            data = message["data"]
            interview_id = data.get("interview_id")
            enhanced_prompt = data.get("enhanced_prompt")
            
            logging.info(f"[Redis] Received prompt-ready message for interview {interview_id}")
            
            if not interview_id:
                logging.error("[Redis] Missing interview_id in prompt-ready message")
                return
            
            if not enhanced_prompt:
                logging.warning(f"[Redis] No enhanced_prompt in message for interview {interview_id}")
                # Mark as failed if no prompt provided
                status_update = await SupabaseService.update_interview_status(interview_id, "failed")
                if not status_update.get("success"):
                    logging.error(f"[Redis] Failed to update status to 'failed' for interview {interview_id}")
                return
            
            # Use atomic operation to store prompt AND update status
            # This prevents race conditions where prompt is stored but status update fails
            result = await SupabaseService.store_enhanced_prompt_and_update_status(
                interview_id=interview_id,
                enhanced_prompt=enhanced_prompt,
                source=data.get("source", "rag"),
                target_status="ready"
            )
            
            # Check the result
            if result.get("success"):
                logging.info(
                    f"[Redis] Successfully stored prompt and updated status to 'ready' "
                    f"for interview {interview_id}"
                )
            else:
                error_msg = result.get("error", "Unknown error")
                was_rolled_back = result.get("rollback", False)
                orphaned_prompt_id = result.get("orphaned_prompt_id")
                
                logging.error(
                    f"[Redis] Failed atomic operation for interview {interview_id}: {error_msg}. "
                    f"Rollback: {was_rolled_back}"
                )
                
                # If there's an orphaned prompt, log critical error
                if orphaned_prompt_id:
                    logging.critical(
                        f"[Redis] ORPHANED PROMPT DETECTED for interview {interview_id}. "
                        f"Prompt ID: {orphaned_prompt_id}. Manual cleanup may be required."
                    )
                
                # Mark interview as failed
                status_update = await SupabaseService.update_interview_status(interview_id, "failed")
                if not status_update.get("success"):
                    logging.critical(
                        f"[Redis] CRITICAL: Failed to mark interview {interview_id} as 'failed' "
                        f"after atomic operation failure. Interview may be stuck."
                    )
                
        except Exception as e:
            logging.error(f"[Redis] Error handling prompt-ready message: {str(e)}")
            # Try to mark interview as failed if we have the ID
            try:
                if "interview_id" in message.get("data", {}):
                    await SupabaseService.update_interview_status(
                        message["data"]["interview_id"],
                        "failed"
                    )
            except:
                pass
    
    async def handle_rag_status(message):
        """Handle RAG status updates from n8n workflow"""
        try:
            data = message["data"]
            interview_id = data.get("interview_id")
            status = data.get("status")
            
            if interview_id and status:
                logging.info(f"[Redis] RAG status update for {interview_id}: {status}")
                await SupabaseService.update_interview_status(interview_id, status)
        except Exception as e:
            logging.error(f"[Redis] Error handling rag-status message: {str(e)}")
    
    # Subscribe to both channels
    await redis_client.subscribe("interviewly:prompt-ready", handle_prompt_ready)
    await redis_client.subscribe("interviewly:rag-status", handle_rag_status)
    
    logging.info("[Redis] RAG listeners setup complete - listening on interviewly:prompt-ready and interviewly:rag-status")