# Interviewly Backend

This is the backend server for the Interviewly Intelligent Job Interview Preparation System. It's built with FastAPI and integrates with Supabase for data storage and authentication.

## Prerequisites

- Python 3.8 or higher
- pip (Python package installer)
- A Supabase account and project

## Setup

1. Create a virtual environment:

```cmd
python -m venv venv
```

2. Activate the virtual environment:

```cmd
.\venv\Scripts\activate
```

3. Install dependencies:

```cmd
pip install -r requirements.txt
```

4. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your Supabase credentials

## Project Structure

```
backend/
├── app/
│   ├── main.py          # FastAPI application entry point
│   └── routes/
│       └── auth.py      # Authentication routes
├── venv/                # Virtual environment (git-ignored)
├── .env                 # Environment variables (git-ignored)
├── .env.example         # Example environment variables
├── requirements.txt     # Python dependencies
└── README.md           # This file
```

## Running the Server

1. Make sure your virtual environment is activated:

```cmd
.\venv\Scripts\activate
```

2. Start the development server:

```cmd
uvicorn app.main:app --reload --port 8000
```

The server will be available at `http://localhost:8000`

## API Documentation

Once the server is running, you can access:

- Interactive API docs (Swagger UI): `http://localhost:8000/docs`
- Alternative API docs (ReDoc): `http://localhost:8000/redoc`

## Development Guidelines

1. **Dependencies**
   - Always update `requirements.txt` when adding new packages:
     ```cmd
     pip freeze > requirements.txt
     ```
2. **Environment Variables**
   - Never commit `.env` file
   - Update `.env.example` when adding new environment variables
3. **Code Style**
   - Follow PEP 8 guidelines
   - Use type hints where possible
   - Write docstrings for functions and classes

## Available Endpoints

- `GET /`: Health check endpoint
- `POST /auth/signup`: User registration
- `POST /auth/login`: User authentication

## Error Handling

The API uses standard HTTP status codes:

- 200: Success
- 400: Bad request
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 500: Internal server error

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## Troubleshooting

Common issues and solutions:

1. **Server won't start**
   - Check if the port is already in use
   - Verify virtual environment is activated
   - Confirm all dependencies are installed
2. **Environment variables not loading**
   - Verify `.env` file exists
   - Check file permissions
   - Ensure proper formatting in `.env` file
