"""
Pydantic models for validating Redis messages from n8n workflow.
Ensures type safety, data integrity, and security.
"""
from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, Literal
from uuid import UUID
import re


class PromptReadyMessage(BaseModel):
    """
    Validates messages from n8n on the 'interviewly:prompt-ready' channel.
    
    This message is sent when the RAG workflow has processed resume/JD
    and generated an enhanced interview prompt.
    """
    interview_id: UUID = Field(
        ...,
        description="UUID of the interview session"
    )
    
    enhanced_prompt: str = Field(
        ...,
        min_length=10,
        max_length=50000,
        description="AI-enhanced interview prompt (10-50k chars)"
    )
    
    source: Literal["rag", "existing_data", "new_data", "fallback"] = Field(
        default="rag",
        description="Source of the prompt generation"
    )
    
    @field_validator('enhanced_prompt', mode='after')
    @classmethod
    def sanitize_prompt(cls, v: str) -> str:
        """
        Sanitize prompt to prevent injection attacks.
        
        Checks for:
        - SQL injection patterns
        - XSS attempts (script tags)
        - Command injection
        """
        v_lower = v.lower()
        
        # Check for SQL injection patterns
        sql_patterns = [
            'drop table',
            'delete from',
            'insert into',
            'update ',
            'truncate',
            'alter table',
            '; drop',
            '-- ',
            '/*',
            'xp_cmdshell',
            'exec(',
            'execute(',
            'union select',
            'union all select',
            'or 1=1',
            'or true',
            "' or '",
            '" or "',
            ';--',
            '/**/select',
            'information_schema',
            'sys.tables'
        ]
        
        for pattern in sql_patterns:
            if pattern in v_lower:
                raise ValueError(f"Prompt contains suspicious SQL pattern: {pattern}")
        
        # Check for XSS patterns
        xss_patterns = [
            '<script',
            'javascript:',
            'onerror=',
            'onload=',
            '<iframe',
            'eval(',
            'expression(',
            'onmouseover=',
            'onmouseout=',
            'onclick=',
            '<img',
            '<body',
            '<div',
            '<span'
        ]
        
        # More strict checking for HTML/JS
        if '<' in v and '>' in v:
            # Check if it looks like HTML tags with event handlers
            if re.search(r'<[^>]+(on\w+|javascript:|eval\()', v_lower):
                raise ValueError("Prompt contains suspicious HTML/JS pattern")
        
        for pattern in xss_patterns:
            if pattern in v_lower:
                raise ValueError(f"Prompt contains suspicious XSS pattern: {pattern}")
        
        # Check for command injection
        command_patterns = [
            r';\s*(rm|del|format|shutdown|reboot|wget|curl|bash|sh|cmd)',
            r'`[^`]+`',  # Backtick command substitution
            r'\$\([^)]+\)',  # $(command) substitution
            r'\|\s*(bash|sh|cmd)',  # Pipe to shell
        ]
        
        for pattern in command_patterns:
            if re.search(pattern, v_lower):
                raise ValueError("Prompt contains suspicious command injection pattern")
        
        return v
    
    @field_validator('interview_id')
    @classmethod
    def validate_interview_id(cls, v: UUID) -> UUID:
        """Ensure interview_id is a valid UUID."""
        # Pydantic already validates UUID format, but we can add extra checks
        if v.version not in [1, 4]:  # Accept UUID v1 or v4
            raise ValueError(f"Invalid UUID version: {v.version}")
        return v


class RAGStatusMessage(BaseModel):
    """
    Validates status update messages from n8n on the 'interviewly:rag-status' channel.
    
    This message is sent to update interview status during RAG processing.
    """
    interview_id: UUID = Field(
        ...,
        description="UUID of the interview session"
    )
    
    status: Literal[
        "pending",
        "processing", 
        "ready",
        "failed",
        "completed",
        "cancelled"
    ] = Field(
        ...,
        description="Interview status"
    )
    
    error_message: Optional[str] = Field(
        None,
        description="Error message if status is 'failed'"
    )
    
    @field_validator('error_message', mode='after')
    @classmethod
    def sanitize_error_message(cls, v: Optional[str]) -> Optional[str]:
        """Sanitize error message to prevent log injection."""
        if v is None:
            return v
        
        # Remove newlines and control characters that could break logs
        v = re.sub(r'[\n\r\t\x00-\x1f\x7f]', ' ', v)
        
        # Limit length
        if len(v) > 1000:
            v = v[:997] + "..."
        
        return v
    
    @field_validator('interview_id')
    @classmethod
    def validate_interview_id(cls, v: UUID) -> UUID:
        """Ensure interview_id is a valid UUID."""
        if v.version not in [1, 4]:
            raise ValueError(f"Invalid UUID version: {v.version}")
        return v


class RedisMessage(BaseModel):
    """
    Validates the envelope structure of Redis pub/sub messages.
    
    This is the outer message structure received from Redis,
    containing channel info and the actual data payload.
    """
    channel: str = Field(
        ...,
        pattern=r'^interviewly:[a-z\-]+$',
        description="Redis channel name (must start with 'interviewly:')"
    )
    
    data: dict = Field(
        ...,
        description="Message payload (will be validated by specific message models)"
    )
    
    @field_validator('channel')
    @classmethod
    def validate_channel(cls, v: str) -> str:
        """Ensure channel follows naming convention."""
        if not v.startswith('interviewly:'):
            raise ValueError("Channel must start with 'interviewly:'")
        
        # Validate channel name format
        valid_channels = [
            'interviewly:prompt-ready',
            'interviewly:rag-status',
            'interviewly:interview-start',
            'interviewly:interview-end'
        ]
        
        if v not in valid_channels:
            raise ValueError(f"Unknown channel: {v}. Must be one of {valid_channels}")
        
        return v
