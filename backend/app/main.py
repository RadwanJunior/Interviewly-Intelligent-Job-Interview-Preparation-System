from fastapi import FastAPI

app = FastAPI(title="AI Mock Interview Backend", version="1.0")


@app.get("/")
def read_root():
    return {"message": "AI Mock Interview Backend is running!"}
