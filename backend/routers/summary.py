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
from services.summarize_service import generate_summary

router = APIRouter()

# Define logger
logger = logging.getLogger("summary_logger")

# TODO: Fix summarize text through null file upload
@router.post("/summarize")
def summarize_endpoint(
    session_id: int = Form(..., description="Session ID (must be >= 1)"),
    format: str = Form(..., description="Summary format: bullet, paragraph, or insight"),
    text: Optional[str] = Form(None, description="Text to summarize (optional if file provided)"),
    file: Optional[UploadFile] = File(None, description="File to summarize (optional if text provided)"),
    db: Session = Depends(get_session)
):
    """
    Generate a structured summary in the requested format.
    Can accept either text input or file upload.
    
    - **session_id**: Session ID (must be >= 1)
    - **format**: Summary format (bullet, paragraph, or insight)
    - **text**: Text to summarize (optional if file provided)
    - **file**: File to upload and summarize (optional if text provided)
    """
    try:
        # Check if we have either text or file input
        has_text = bool(text and text.strip())
        has_file = bool(file and file.filename)
        
        # Validate that either text or file is provided (but not both)
        if not has_text and not has_file:
            raise HTTPException(status_code=400, detail="Either text or file must be provided")
        
        if has_text and has_file:
            raise HTTPException(status_code=400, detail="Provide either text or file, not both")

        # Validate the requested format
        valid_formats = {"bullet", "paragraph", "insight"}
        if format not in valid_formats:
            raise HTTPException(status_code=400, detail=f"Invalid format '{format}'. Valid formats are: {', '.join(valid_formats)}.")

        # Validate session_id is valid (must be >= 1)
        if session_id < 1:
            raise HTTPException(status_code=400, detail="Session ID must be >= 1")

        # Validate session exists or create a default session
        existing_session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
        if not existing_session:
            # If session doesn't exist, create it
            new_session = SessionModel(
                name=f"Summary Session {session_id}",
                created_at=datetime.utcnow()
            )
            db.add(new_session)
            db.commit()
            db.refresh(new_session)
            # Use the actual ID from the database
            session_id = new_session.id

        # Generate the summary based on input type
        if has_file:
            # Handle file upload
            file_content = file.file.read()
            file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
            
            summary_text = generate_summary(
                input_data=file_content,
                format=format,
                input_type="file",
                file_type=file_extension
            )
            metadata = {"input_type": "file", "filename": file.filename}
        else:
            # Handle text input
            summary_text = generate_summary(
                input_data=text,
                format=format,
                input_type="text"
            )
            metadata = {"input_type": "text", "filename": None}
        
        logger.debug(f"File parameter type: {type(file)}")

        # Save the summary as a bot response
        bot_message = Message(
            session_id=session_id,
            sender="bot",
            content=summary_text,
            timestamp=datetime.utcnow()
        )
        db.add(bot_message)
        db.commit()  # Commit the transaction
        db.refresh(bot_message)  # Refresh to get the ID

        # Generate and store embedding for the summary
        embedding_vector = generate_embedding(summary_text)
        if embedding_vector:
            store_embedding(db, session_id, summary_text)

        return ChatResponse(
            success=True,
            response=summary_text,
            session_id=session_id,
            tool_calls_made=[],
            metadata=metadata
        )

    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        error_details = traceback.format_exc()
        logger.error(f"Error in structured summary endpoint: {e}")
        logger.error(f"Full traceback: {error_details}")
        raise HTTPException(status_code=500, detail=f"Failed to generate structured summary: {str(e)}")