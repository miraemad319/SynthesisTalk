from sqlmodel import Session, select
from models.db_models import Document

def save_document(db: Session, session_id: int, filename: str, text: str) -> Document:
    doc = Document(session_id=session_id, filename=filename, text=text)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

def get_documents_text(db: Session, session_id: int) -> str:
    statement = select(Document).where(Document.session_id == session_id)
    docs = db.execute(statement).scalars().all()  # Use execute() and scalars() for SQLModel compatibility
    return "\n\n".join([doc.text for doc in docs])
