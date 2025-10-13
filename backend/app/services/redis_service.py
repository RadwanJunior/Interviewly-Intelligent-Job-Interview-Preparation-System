import os
import json
import logging
import asyncio
import time
from typing import Any, Callable, Dict, Optional
from enum import Enum
from pydantic import ValidationError
import redis.asyncio as redis
from app.models.redis_messages import PromptReadyMessage, RAGStatusMessage


class ListenerHealth(str, Enum):
    """Health status of Redis listener"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    STOPPED = "stopped"


class UpstashRedisService:
    """Service for interacting with Upstash Redis with health monitoring and circuit breaker"""
    
    def __init__(self, url: str = None):
        """Initialize with optional URL override"""
        self.url = url or os.getenv("UPSTASH_REDIS_URL")
        if not self.url:
            raise ValueError("UPSTASH_REDIS_URL environment variable not set")
            
        self.client = None
        self.pubsub = None
        self._subscribers = {}
        self._listener_task = None
        
        # Health monitoring
        self._listener_failures = 0
        self._max_failures = 10
        self._last_health_check = None
        self._last_message_received = None
        self._total_messages_processed = 0
        self._health_status = ListenerHealth.STOPPED
        
        # Circuit breaker
        self._circuit_open = False
        self._circuit_open_time = None
        self._circuit_reset_timeout = 60  # Reset circuit after 60 seconds
    
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
        """
        Listen for messages in the background with health monitoring and circuit breaker.
        Implements exponential backoff on failures.
        """
        try:
            self._health_status = ListenerHealth.HEALTHY
            logging.info("[Redis Listener] Starting message listener with health monitoring")
            
            while True:
                # Check circuit breaker
                if self._circuit_open:
                    elapsed = time.time() - self._circuit_open_time
                    if elapsed < self._circuit_reset_timeout:
                        logging.warning(
                            f"[Redis Listener] Circuit breaker OPEN. "
                            f"Waiting {self._circuit_reset_timeout - elapsed:.1f}s before retry"
                        )
                        await asyncio.sleep(10)
                        continue
                    else:
                        # Try to reset circuit
                        logging.info("[Redis Listener] Attempting to reset circuit breaker")
                        self._circuit_open = False
                        self._listener_failures = 0
                
                try:
                    message = await self.pubsub.get_message(ignore_subscribe_messages=True)
                    
                    if message:
                        # Message received - update health metrics
                        self._listener_failures = 0  # Reset failure count on success
                        self._last_health_check = time.time()
                        self._last_message_received = time.time()
                        self._total_messages_processed += 1
                        self._health_status = ListenerHealth.HEALTHY
                        
                        # The message dictionary is now the source of truth
                        
                        # Parse JSON data in-place if possible
                        if isinstance(message["data"], str):
                            try:
                                data_str = message["data"].strip()  # Strip leading/trailing whitespace

                                # Find the first occurrence of '{' which marks the start of the JSON object
                                json_start_index = data_str.find('{')
                                
                                # If a '{' is found, attempt to parse from that point onwards
                                if json_start_index != -1:
                                    json_str = data_str[json_start_index:]
                                    # Modify the dictionary directly with the parsed, cleaned JSON
                                    message["data"] = json.loads(json_str)
                                else:
                                    # If no '{' is found, it's not the JSON we expect.
                                    logging.warning(f"[Redis Listener] Received a non-JSON string on channel '{message['channel']}'. Data: '{data_str}'")

                            except json.JSONDecodeError:
                                # If parsing fails even after cleaning, log it but pass the original string
                                logging.warning(f"[Redis Listener] Could not parse JSON from channel '{message['channel']}'. Original Data: '{message['data']}'")
                        
                        # Invoke callbacks with the modified message object
                        if message["channel"] in self._subscribers:
                            for callback in self._subscribers[message["channel"]]:
                                try:
                                    await callback(message)
                                except Exception as e:
                                    logging.error(
                                        f"[Redis Listener] Error in callback for {message['channel']}: {str(e)}"
                                    )
                                    # Callback errors don't count as listener failures
                    else:
                        # No message - update health check timestamp
                        self._last_health_check = time.time()
                    
                    # Small sleep to prevent CPU hogging
                    await asyncio.sleep(0.01)
                    
                except asyncio.CancelledError:
                    # Task was cancelled - clean shutdown
                    logging.info("[Redis Listener] Message listener cancelled")
                    self._health_status = ListenerHealth.STOPPED
                    raise
                    
                except Exception as e:
                    # Connection or processing error
                    self._listener_failures += 1
                    self._last_health_check = time.time()
                    
                    # Update health status based on failures
                    if self._listener_failures >= self._max_failures:
                        self._health_status = ListenerHealth.UNHEALTHY
                    elif self._listener_failures >= 3:
                        self._health_status = ListenerHealth.DEGRADED
                    
                    logging.error(
                        f"[Redis Listener] Error in message listener "
                        f"(failure {self._listener_failures}/{self._max_failures}): {str(e)}"
                    )
                    
                    # Check if we should open circuit breaker
                    if self._listener_failures >= self._max_failures:
                        self._circuit_open = True
                        self._circuit_open_time = time.time()
                        self._health_status = ListenerHealth.UNHEALTHY
                        
                        logging.critical(
                            f"[Redis Listener] Circuit breaker OPENED after {self._max_failures} "
                            f"consecutive failures. Will retry after {self._circuit_reset_timeout}s. "
                            f"MANUAL INTERVENTION MAY BE REQUIRED."
                        )
                        continue
                    
                    # Exponential backoff (1s, 2s, 4s, 8s, 16s, max 30s)
                    backoff = min(2 ** self._listener_failures, 30)
                    logging.warning(
                        f"[Redis Listener] Backing off for {backoff}s before retry "
                        f"(attempt {self._listener_failures}/{self._max_failures})"
                    )
                    await asyncio.sleep(backoff)
                
        except asyncio.CancelledError:
            # Clean shutdown
            self._health_status = ListenerHealth.STOPPED
            logging.info("[Redis Listener] Message listener stopped cleanly")
            raise
            
        except Exception as e:
            # Unexpected fatal error
            self._health_status = ListenerHealth.STOPPED
            logging.critical(
                f"[Redis Listener] FATAL ERROR in message listener: {str(e)}. "
                f"Listener has STOPPED. Manual restart required."
            )
            raise
    
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
    
    async def get_health_status(self) -> Dict[str, Any]:
        """
        Get comprehensive health status of Redis listener.
        Returns detailed metrics for monitoring and alerting.
        """
        now = time.time()
        
        # Calculate time since last message
        time_since_last_message = None
        if self._last_message_received:
            time_since_last_message = now - self._last_message_received
        
        # Determine if listener is running
        listener_running = (
            self._listener_task is not None 
            and not self._listener_task.done()
        )
        
        # Calculate uptime
        uptime = None
        if self._last_health_check and listener_running:
            uptime = now - self._last_health_check
        
        return {
            "status": self._health_status.value,
            "listener_running": listener_running,
            "circuit_breaker_open": self._circuit_open,
            "failures": self._listener_failures,
            "max_failures": self._max_failures,
            "total_messages_processed": self._total_messages_processed,
            "last_health_check": self._last_health_check,
            "last_message_received": self._last_message_received,
            "time_since_last_message_seconds": time_since_last_message,
            "uptime_seconds": uptime,
            "subscribed_channels": list(self._subscribers.keys()),
            "timestamp": now
        }
    
    async def reset_circuit_breaker(self) -> bool:
        """
        Manually reset the circuit breaker.
        Use this for administrative recovery.
        """
        try:
            self._circuit_open = False
            self._circuit_open_time = None
            self._listener_failures = 0
            self._health_status = ListenerHealth.HEALTHY
            
            logging.warning("[Redis Listener] Circuit breaker manually reset")
            return True
        except Exception as e:
            logging.error(f"[Redis Listener] Error resetting circuit breaker: {str(e)}")
            return False
    
    async def close(self):
        """Close Redis connections and stop listener"""
        try:
            # Cancel listener task if running
            if self._listener_task and not self._listener_task.done():
                self._listener_task.cancel()
                try:
                    await self._listener_task
                except asyncio.CancelledError:
                    pass
            
            if self.pubsub:
                await self.pubsub.close()
            if self.client:
                await self.client.close()
            
            self._health_status = ListenerHealth.STOPPED
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
        """
        Handle prompt-ready messages from n8n workflow.
        Now with Pydantic validation for security and data integrity.
        """
        interview_id = None  # Initialize for error handling
        
        try:
            data = message["data"]
            
            # CRITICAL: Add type check to ensure data is a dictionary
            if not isinstance(data, dict):
                # This is a contract violation. The message is not in the expected format.
                channel = message.get("channel", "unknown")
                logging.error(
                    f"[Redis] ❌ VALIDATION FAILED for prompt-ready message on channel '{channel}'. "
                    f"Expected a JSON object (dict), but received type '{type(data).__name__}'. "
                    f"Data: '{str(data)[:200]}'" # Log a snippet of the invalid data
                )
                # Attempt to find an interview_id if possible, though unlikely
                if isinstance(data, str) and "interview_id" in data: # A desperate attempt
                    # This part is unlikely to succeed but is a fallback
                    pass
                return # Stop processing this malformed message

            # CRITICAL: Validate message structure with Pydantic
            # This prevents:
            # - SQL injection attacks
            # - XSS attacks
            # - Invalid UUIDs
            # - Oversized prompts (memory issues)
            # - Missing required fields
            logging.debug(f"[Redis] Validating prompt-ready message: {data}")
            try:
                validated_data = PromptReadyMessage(**data)
                interview_id = str(validated_data.interview_id)
                enhanced_prompt = validated_data.enhanced_prompt
                source = validated_data.source
                
                logging.info(
                    f"[Redis] ✓ Validated prompt-ready message for interview {interview_id} "
                    f"(source: {source}, prompt_length: {len(enhanced_prompt)} chars)"
                )
                
            except ValidationError as validation_error:
                # Message failed validation - log detailed error and reject
                error_details = validation_error.errors()
                
                # Try to extract interview_id for error tracking (if present)
                interview_id = data.get("interview_id", "unknown")
                
                logging.error(
                    f"[Redis] ❌ VALIDATION FAILED for prompt-ready message. "
                    f"Interview: {interview_id}. Errors: {error_details}"
                )
                
                # If we have a valid interview_id, mark it as failed
                if interview_id != "unknown":
                    try:
                        status_update = await SupabaseService.update_interview_status(
                            interview_id, 
                            "failed"
                        )
                        if status_update.get("success"):
                            logging.info(
                                f"[Redis] Marked interview {interview_id} as 'failed' "
                                f"due to invalid message"
                            )
                    except Exception as e:
                        logging.error(
                            f"[Redis] Failed to update status for invalid message: {str(e)}"
                        )
                
                return  # Stop processing invalid message
            
            except Exception as e:
                # Unexpected validation error
                logging.error(
                    f"[Redis] Unexpected error during message validation: {str(e)}"
                )
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
        """
        Handle RAG status updates from n8n workflow.
        Now with Pydantic validation for security and data integrity.
        """
        try:
            data = message["data"]
            
            # CRITICAL: Validate message structure with Pydantic
            try:
                validated_data = RAGStatusMessage(**data)
                interview_id = str(validated_data.interview_id)
                status = validated_data.status
                error_message = validated_data.error_message
                
                logging.info(
                    f"[Redis] ✓ Validated RAG status update for {interview_id}: {status}"
                )
                
                # Update interview status
                result = await SupabaseService.update_interview_status(interview_id, status)
                
                if result.get("success"):
                    logging.info(f"[Redis] Successfully updated status to '{status}'")
                else:
                    logging.error(
                        f"[Redis] Failed to update status: {result.get('error')}"
                    )
                
                # Log error message if present
                if error_message and status == "failed":
                    logging.warning(
                        f"[Redis] Interview {interview_id} failed with message: {error_message}"
                    )
                
            except ValidationError as validation_error:
                # Message failed validation
                error_details = validation_error.errors()
                interview_id = data.get("interview_id", "unknown")
                
                logging.error(
                    f"[Redis] ❌ VALIDATION FAILED for rag-status message. "
                    f"Interview: {interview_id}. Errors: {error_details}"
                )
                
                # Don't try to update status if validation failed
                return
                
        except Exception as e:
            logging.error(f"[Redis] Error handling rag-status message: {str(e)}")
    
    # Subscribe to both channels
    await redis_client.subscribe("interviewly:prompt-ready", handle_prompt_ready)
    await redis_client.subscribe("interviewly:rag-status", handle_rag_status)
    
    logging.info("[Redis] RAG listeners setup complete - listening on interviewly:prompt-ready and interviewly:rag-status")