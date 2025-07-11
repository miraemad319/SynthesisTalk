from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # <-- Import this
from services.db_session import create_db_and_tables
from routers import upload, session, chat

app = FastAPI()

app.add_middleware(
  CORSMiddleware,
  allow_origins=["http://localhost:3000"],  # frontend origin
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

@app.get("/")
def read_root():
    return {"message": "SynthesisTalk backend is running!"}

app.include_router(session.router)
app.include_router(upload.router)
app.include_router(chat.router)
