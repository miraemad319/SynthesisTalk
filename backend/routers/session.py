from fastapi import APIRouter, Depends
from sqlmodel import Session, select, delete
from services.db_session import get_session
from models.db_models import Session as ResearchSession, Message, Document, Summary

router = APIRouter()

# Create a new session
@router.post("/session/create")
def create_session(name: str, db: Session = Depends(get_session)):
    new_session = ResearchSession(name=name)
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session

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

# Delete a session and its related data
@router.delete("/session/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_session)):
    session = db.get(ResearchSession, session_id)
    if not session:
        return {"error": "Session not found"}

    # Delete child data first to avoid foreign key conflicts
    db.exec(delete(Message).where(Message.session_id == session_id))
    db.exec(delete(Document).where(Document.session_id == session_id))
    db.exec(delete(Summary).where(Summary.session_id == session_id))
    db.delete(session)
    db.commit()

    return {"message": "Session and related data deleted"}
