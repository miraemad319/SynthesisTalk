from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlmodel import Session
from datetime import datetime
import logging
import traceback
from typing import Optional

from models.api_models import StructuredSummaryRequest, ChatResponse
from models.db_models import Message, Session as SessionModel
from services.db_session import get_session
from services.embedding_service import generate_embedding, store_embedding
from services.summarize_service import generate_summary, generate_message_summary, generate_document_summary

router = APIRouter()

logger = logging.getLogger("summary_logger")

@router.post("/summarize-message")
def summarize_message_endpoint(
    message_id: int = Form(..., description="Message ID to summarize"),
    format: str = Form(..., description="Summary format: bullet, paragraph, or insight"),
    db: Session = Depends(get_session)
):
    """
    Generate a structured summary of an existing message.
    
    - **message_id**: ID of the message to summarize
    - **format**: Summary format (bullet, paragraph, or insight)
    """
    try:
        # Validate the requested format
        valid_formats = {"bullet", "paragraph", "insight"}
        if format not in valid_formats:
            raise HTTPException(status_code=400, detail=f"Invalid format '{format}'. Valid formats are: {', '.join(valid_formats)}.")

        # Fetch the message content from the database
        message = db.get(Message, message_id)
        if not message:
            raise HTTPException(status_code=404, detail="Message not found.")

        # Generate summary using just the message text content
        summary_text = generate_summary(
            input_data=message.content,
            format=format,
            input_type="text"
        )

        # Save the summary as a new bot response
        bot_message = Message(
            session_id=message.session_id,  # Use same session as original message
            sender="bot",
            content=summary_text,
            timestamp=datetime.utcnow()
        )
        db.add(bot_message)
        db.commit()
        db.refresh(bot_message)

        # Generate and store embedding for the summary
        embedding_vector = generate_embedding(summary_text)
        if embedding_vector:
            store_embedding(db, message.session_id, summary_text)

        return ChatResponse(
            success=True,
            response=summary_text,
            session_id=message.session_id,
            tool_calls_made=[],
            metadata={"input_type": "message", "source_message_id": message_id}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in summary endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(e)}")

@router.post("/summarize-document")
def summarize_document_endpoint(
    document_id: int = Form(..., description="Document ID to summarize"),
    format: str = Form(..., description="Summary format: bullet, paragraph, or insight"),
    db: Session = Depends(get_session)
):
    """
    Generate a structured summary of a specific document by its ID.
    
    - **document_id**: ID of the document to summarize
    - **format**: Summary format (bullet, paragraph, or insight)
    """
    try:
        # Validate the requested format
        valid_formats = {"bullet", "paragraph", "insight"}
        if format not in valid_formats:
            raise HTTPException(status_code=400, detail=f"Invalid format '{format}'. Valid formats are: {', '.join(valid_formats)}.")

        # Fetch the document from the database
        from models.db_models import Document
        document = db.get(Document, document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found.")

        # Generate summary using the document summary function
        summary_text = generate_document_summary(
            document_id=document_id,
            format=format,
            db=db
        )

        # Save the summary as a new bot response
        bot_message = Message(
            session_id=document.session_id,  # Use same session as document
            sender="bot",
            content=summary_text,
            timestamp=datetime.utcnow()
        )
        db.add(bot_message)
        db.commit()
        db.refresh(bot_message)

        # Generate and store embedding for the summary
        embedding_vector = generate_embedding(summary_text)
        if embedding_vector:
            store_embedding(db, document.session_id, summary_text)

        return ChatResponse(
            success=True,
            response=summary_text,
            session_id=document.session_id,
            tool_calls_made=[],
            metadata={"input_type": "document", "source_document_id": document_id, "filename": document.filename}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in document summary endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate document summary: {str(e)}")