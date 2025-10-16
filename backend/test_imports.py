import sys
import os
import asyncio

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_job_description_import():
    try:
        print("Testing imports...")
        
        # Test FastAPI app import
        from app.main import app
        print("✓ FastAPI app imported successfully")
        
        # Test job description route import
        from app.routes.job_description import router
        print("✓ Job description router imported successfully")
        
        # Test workflow service import
        from app.services.workflow_service import WorkflowService
        workflow_service = WorkflowService()
        print("✓ Workflow service imported and instantiated successfully")
        
        # Test supabase service import
        from app.services.supabase_service import supabase_service
        print("✓ Supabase service imported successfully")
        
        # Check if the create_job_description method exists
        if hasattr(workflow_service, 'create_job_description'):
            print("✓ create_job_description method exists in workflow service")
        else:
            print("✗ create_job_description method not found in workflow service")
            
        # Check if the create_job_description method exists in supabase service
        if hasattr(supabase_service, 'create_job_description'):
            print("✓ create_job_description method exists in supabase service")
        else:
            print("✗ create_job_description method not found in supabase service")
        
        # Test route registration
        for route in app.routes:
            if hasattr(route, 'path') and 'job_description' in route.path:
                print(f"✓ Route found: {route.methods} {route.path}")
                
        print("\nAll imports successful! The issue might be with the server startup or environment.")
        return True
        
    except Exception as e:
        print(f"✗ Import error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_job_description_import())
    if success:
        print("\n=== Starting server test ===")
        try:
            import uvicorn
            from app.main import app
            # Test server startup (don't actually run, just check if it can be configured)
            config = uvicorn.Config(app, host="0.0.0.0", port=8000)
            print("✓ Server configuration successful")
        except Exception as e:
            print(f"✗ Server configuration error: {e}")