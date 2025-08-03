from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.db_session import create_db_and_tables
from routers import (
    upload, session, chat, documents, summary, export, notes, explain
)

app = FastAPI(
    title="SynthesisTalk API",
    description="Intelligent Research Assistant with Multi-Source Context",
    version="2.0.0"
)

# CORS middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup on startup
@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# Root route
@app.get("/")
def read_root():
    return {"message": "SynthesisTalk backend is running!"}

# Include API routers
app.include_router(session.router, tags=["Session"])
app.include_router(upload.router, tags=["Upload"])
app.include_router(chat.router, tags=["Chat"])
app.include_router(documents.router, tags=["Documents"])
app.include_router(summary.router, tags=["Summary"])
app.include_router(export.router, tags=["Export"])
app.include_router(notes.router, tags=["Notes"])
app.include_router(explain.router, tags=["Explain"])
