
from app.services.supabase_service import SupabaseService


# Dependencies:
# pip install pytest-mock
import pytest

class TestSupabaseService:

    # Successfully create a new user with valid email and password
    def test_create_user_success(self, mocker):
        # Arrange
        mock_response = {"user": {"id": "123", "email": "test@example.com"}, "session": {"access_token": "test_token"}}
        mock_sign_up = mocker.patch('supabase_client.auth.sign_up', return_value=mock_response)
    
        # Act
        result = SupabaseService.create_user("test@example.com", "password123")
    
        # Assert
        mock_sign_up.assert_called_once_with({"email": "test@example.com", "password": "password123"})
        assert result == mock_response

    # Handle attempt to create user with invalid email format
    def test_create_user_invalid_email(self, mocker):
        # Arrange
        error_message = "Invalid email format"
        mock_sign_up = mocker.patch('supabase_client.auth.sign_up', side_effect=Exception(error_message))
    
        # Act
        result = SupabaseService.create_user("invalid-email", "password123")
    
        # Assert
        mock_sign_up.assert_called_once_with({"email": "invalid-email", "password": "password123"})
        assert result == {"error": {"message": error_message}}