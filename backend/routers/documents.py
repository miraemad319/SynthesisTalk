from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from services.db_session import get_session
from models.db_models import Document
import logging

router = APIRouter()

@router.get("/documents/{session_id}")
async def get_documents(session_id: int, db: Session = Depends(get_session)):
    try:
        query = select(Document).where(Document.session_id == session_id)
        documents = db.exec(query).all()
        if not documents:
            logging.warning(f"No documents found for session_id: {session_id}")
            raise HTTPException(status_code=404, detail="No documents found")
        logging.info(f"Documents retrieved: {len(documents)} documents for session_id {session_id}")
        return [
            {"id": doc.id, "filename": doc.filename, "text_preview": doc.text[:500]}
            for doc in documents
        ]
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logging.error(f"Error retrieving documents for session_id {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve documents")