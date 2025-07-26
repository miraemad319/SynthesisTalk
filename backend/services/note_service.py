from sqlmodel import Session
from models.db_models import Notes
from typing import List, Optional

def create_note(db: Session, session_id: int, content: str, message_id: Optional[int] = None, tags: Optional[str] = None) -> Notes:
    """Create a new note."""
    note = Notes(session_id=session_id, content=content, message_id=message_id, tags=tags)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note

def get_notes(db: Session, session_id: Optional[int] = None, message_id: Optional[int] = None, search_query: Optional[str] = None) -> List[Notes]:
    """Retrieve notes by session, message, or search query."""
    query = db.query(Notes)
    if session_id:
        query = query.filter(Notes.session_id == session_id)
    if message_id:
        query = query.filter(Notes.message_id == message_id)
    if search_query:
        query = query.filter(Notes.content.contains(search_query))
    return query.all()

def update_note(db: Session, note_id: int, content: Optional[str] = None, tags: Optional[str] = None) -> Notes:
    """Update an existing note."""
    note = db.get(Notes, note_id)
    if not note:
        raise ValueError("Note not found")
    if content:
        note.content = content
    if tags:
        note.tags = tags
    db.commit()
    db.refresh(note)
    return note

def delete_note(db: Session, note_id: int) -> None:
    """Delete a note."""
    note = db.get(Notes, note_id)
    if not note:
        raise ValueError("Note not found")
    db.delete(note)
    db.commit()