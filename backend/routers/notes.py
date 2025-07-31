from fastapi import APIRouter, Depends, HTTPException, Form
from sqlmodel import Session, select
from typing import Optional
import logging
from typing import Union, List, Optional

from models.db_models import Notes

from services.note_service import create_note, get_notes, update_note, delete_note
from services.db_session import get_session

logger = logging.getLogger("notes_logger")

router = APIRouter()

@router.post("/notes")
def create_note_endpoint(
    session_id: int = Form(..., description="Session ID to associate the note with"),
    content: str = Form(..., description="Content of the note"),
    message_id: Optional[Union[int, str]] = Form(None, description="Message ID to associate the note with"),
    tags: Optional[str] = Form(None, description="Comma-separated tags for the note"),
    db: Session = Depends(get_session)
):
    """Create a new note."""
    try:
        # Convert message_id to int if it's a string
        if isinstance(message_id, str) and message_id.strip():
            message_id = int(message_id)
        elif not message_id:
            message_id = None

        note = create_note(db, session_id, content, message_id, tags)
        return {"success": True, "note": note}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid message_id. It must be a valid integer or omitted.")
    except Exception as e:
        logger.error(f"Error creating note: {e}")
        raise HTTPException(status_code=500, detail="Failed to create note")

@router.get("/notes")
def get_notes_endpoint(
    session_id: Optional[int] = None,
    message_id: Optional[int] = None,
    search_query: Optional[str] = None,
    db: Session = Depends(get_session)
):
    """Retrieve notes by session, message, or search query."""
    statement = select(Notes)

    if session_id:
        statement = statement.where(Notes.session_id == session_id)
    if message_id:
        statement = statement.where(Notes.message_id == message_id)
    if search_query:
        from sqlalchemy import or_
        statement = statement.where(
            or_(
                Notes.content.contains(search_query),
                Notes.tags.contains(search_query)
            )
        )
    results = db.exec(statement).all()
    return list(results)

@router.put("/notes/{id}")
def update_note_endpoint(
    id: int,
    content: Optional[str] = Form(None, description="Updated content of the note"),
    tags: Optional[str] = Form(None, description="Updated tags for the note"),
    db: Session = Depends(get_session)
):
    """Update an existing note."""
    try:
        from services.note_service import update_note
        note = update_note(db, id, content, tags)
        return {"success": True, "note": note}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating note: {e}")
        raise HTTPException(status_code=500, detail="Failed to update note")

@router.delete("/notes/{id}")
def delete_note_endpoint(
    id: int,
    db: Session = Depends(get_session)
):
    """Delete a note."""
    try:
        from services.note_service import delete_note
        delete_note(db, id)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting note: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete note")