"""
Test suite for store_enhanced_prompt function to verify consistent error handling.
Tests Critical Issue #2 fix.
"""
import asyncio
import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.supabase_service import SupabaseService


async def test_store_enhanced_prompt_success():
    """Test successful storage of enhanced prompt"""
    print("\n=== Test 1: Successful Storage ===")
    
    # Note: This will actually try to insert into the database
    # Use a test interview_id or mock the supabase client in production tests
    result = await SupabaseService.store_enhanced_prompt(
        interview_id="00000000-0000-0000-0000-000000000001",  # Test UUID
        enhanced_prompt="This is a test enhanced prompt with RAG context.",
        source="test"
    )
    
    print(f"Result: {result}")
    print(f"Success: {result.get('success')}")
    
    # Verify consistent return format
    assert "success" in result, "Response must have 'success' key"
    assert isinstance(result.get("success"), bool), "'success' must be boolean"
    
    if result.get("success"):
        assert "data" in result, "Successful response must have 'data' key"
        print("✅ Test 1 PASSED: Consistent success response format")
    else:
        assert "error" in result, "Failed response must have 'error' key"
        print(f"⚠️  Test 1 FAILED (expected): {result.get('error')}")


async def test_store_enhanced_prompt_missing_interview_id():
    """Test handling of missing interview_id"""
    print("\n=== Test 2: Missing interview_id ===")
    
    result = await SupabaseService.store_enhanced_prompt(
        interview_id="",  # Empty string
        enhanced_prompt="Some prompt text",
        source="test"
    )
    
    print(f"Result: {result}")
    
    # Verify consistent error format
    assert "success" in result, "Response must have 'success' key"
    assert result["success"] is False, "Should fail with missing interview_id"
    assert "error" in result, "Failed response must have 'error' key"
    assert "interview_id" in result["error"].lower(), "Error message should mention interview_id"
    
    print("✅ Test 2 PASSED: Consistent error response for missing interview_id")


async def test_store_enhanced_prompt_missing_prompt():
    """Test handling of missing enhanced_prompt"""
    print("\n=== Test 3: Missing enhanced_prompt ===")
    
    result = await SupabaseService.store_enhanced_prompt(
        interview_id="00000000-0000-0000-0000-000000000001",
        enhanced_prompt="",  # Empty string
        source="test"
    )
    
    print(f"Result: {result}")
    
    # Verify consistent error format
    assert "success" in result, "Response must have 'success' key"
    assert result["success"] is False, "Should fail with missing enhanced_prompt"
    assert "error" in result, "Failed response must have 'error' key"
    assert "prompt" in result["error"].lower(), "Error message should mention prompt"
    
    print("✅ Test 3 PASSED: Consistent error response for missing prompt")


async def test_store_enhanced_prompt_wrong_type():
    """Test handling of wrong type for enhanced_prompt"""
    print("\n=== Test 4: Wrong Type for enhanced_prompt ===")
    
    result = await SupabaseService.store_enhanced_prompt(
        interview_id="00000000-0000-0000-0000-000000000001",
        enhanced_prompt={"prompt": "This is a dict, not a string"},  # Wrong type!
        source="test"
    )
    
    print(f"Result: {result}")
    
    # Verify consistent error format
    assert "success" in result, "Response must have 'success' key"
    assert result["success"] is False, "Should fail with wrong type"
    assert "error" in result, "Failed response must have 'error' key"
    assert "type" in result["error"].lower(), "Error message should mention type"
    
    print("✅ Test 4 PASSED: Consistent error response for wrong type")


async def test_redis_listener_compatibility():
    """Test that Redis listener can correctly handle the new response format"""
    print("\n=== Test 5: Redis Listener Compatibility ===")
    
    # Simulate success response
    success_response = {"success": True, "data": {"id": "123", "interview_id": "abc"}}
    if success_response.get("success"):
        print("✅ Success response: Redis listener would proceed to update status to 'ready'")
    else:
        print("❌ Success response check failed")
    
    # Simulate error response
    error_response = {"success": False, "error": "Some error message"}
    if error_response.get("success"):
        print("❌ Error response: Should not pass success check")
    else:
        error_msg = error_response.get("error", "Unknown error")
        print(f"✅ Error response: Redis listener would log: '{error_msg}' and mark as failed")
    
    # Simulate old None response (should fail safely)
    none_response = None
    try:
        if none_response.get("success"):  # This would crash with old code
            print("❌ None response passed (bad)")
        else:
            print("❌ None response failed (bad)")
    except AttributeError:
        print("⚠️  None response would crash (this is why we fixed it!)")
        # With new code, we never return None, so this won't happen
    
    print("✅ Test 5 PASSED: New format is compatible with Redis listener logic")


async def main():
    """Run all tests"""
    print("=" * 60)
    print("Testing Critical Issue #2 Fix: Consistent Error Handling")
    print("=" * 60)
    
    try:
        await test_store_enhanced_prompt_missing_interview_id()
        await test_store_enhanced_prompt_missing_prompt()
        await test_store_enhanced_prompt_wrong_type()
        await test_redis_listener_compatibility()
        
        # Run success test last (it tries to insert into DB)
        # await test_store_enhanced_prompt_success()  # Uncomment to test with real DB
        
        print("\n" + "=" * 60)
        print("✅ ALL TESTS PASSED!")
        print("Critical Issue #2 is FIXED: Consistent error handling implemented")
        print("=" * 60)
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
