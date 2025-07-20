from fastapi import APIRouter, Depends, Request
from sqlmodel import Session, select, delete
from sqlalchemy import text
from services.db_session import get_session
from models.db_models import Session as ResearchSession, Message, Document, Embedding
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Create a new session
@router.post("/session/create")
def create_session(name: str, db: Session = Depends(get_session)):
    new_session = ResearchSession(name=name)
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session

@router.get("/session/current")
def get_current_session(db: Session = Depends(get_session)):
    # Check if a session already exists
    existing_session = db.exec(select(ResearchSession).order_by(ResearchSession.created_at.desc())).first()
    if existing_session:
        return {"session_id": existing_session.id, "name": existing_session.name}

    # If no session exists, create a new one
    new_session = ResearchSession(name="New Session")
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return {"session_id": new_session.id, "name": new_session.name}

# List all session to select session
@router.get("/session/all")
def list_sessions(db: Session = Depends(get_session)):
    return db.exec(select(ResearchSession).order_by(ResearchSession.created_at.desc())).all()

# Rename a session
@router.patch("/session/{session_id}")
def rename_session(session_id: int, new_name: str, db: Session = Depends(get_session)):
    session = db.get(ResearchSession, session_id)
    if not session:
        return {"error": "Session not found"}
    session.name = new_name
    db.commit()
    return {"message": "Session renamed successfully"}

# Clear all sessions and their related data
@router.delete("/session/clear")
async def clear_all_sessions(request: Request, db: Session = Depends(get_session)):
    # Log the incoming request
    logger.info("Received request to clear all sessions")
    
    # Check if the request has a payload
    try:
        body = await request.json()
        if body:
            return {"error": "This endpoint does not accept a payload."}
    except Exception:
        # No payload, proceed with clearing sessions
        pass

    # Delete child data first to avoid foreign key conflicts
    db.exec(delete(Message))
    db.exec(delete(Document))
    db.exec(delete(Embedding))
    db.exec(delete(ResearchSession))
    db.commit()

    # Reset the ID sequences for all tables
    db.exec(text("ALTER SEQUENCE message_id_seq RESTART WITH 1;"))
    db.exec(text("ALTER SEQUENCE document_id_seq RESTART WITH 1;"))
    db.exec(text("ALTER SEQUENCE embedding_id_seq RESTART WITH 1;"))
    db.exec(text("ALTER SEQUENCE session_id_seq RESTART WITH 1;"))
    db.commit()

    return {"message": "All sessions and related data cleared"}

# Delete a session and its related data
@router.delete("/session/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_session)):
    session = db.get(ResearchSession, session_id)
    if not session:
        return {"error": "Session not found"}

    # Delete child data first to avoid foreign key conflicts
    db.exec(delete(Message).where(Message.session_id == session_id))
    db.exec(delete(Document).where(Document.session_id == session_id))
    db.exec(delete(Embedding).where(Embedding.session_id == session_id))
    db.delete(session)
    db.commit()

    return {"message": "Session and related data deleted"}

