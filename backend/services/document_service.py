from sqlmodel import Session
from models.db_models import Document

def save_document(db: Session, session_id: int, filename: str, text: str) -> Document:
    doc = Document(session_id=session_id, filename=filename, text=text)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc
