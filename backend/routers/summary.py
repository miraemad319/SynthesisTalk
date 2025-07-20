from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from datetime import datetime
import logging

from models.api_models import StructuredSummaryRequest, ChatResponse
from models.db_models import Message
from services.db_session import get_session
from services.embedding_service import generate_embedding, store_embedding
from services.summarize_service import generate_summary

router = APIRouter()

# Define logger
logger = logging.getLogger("summary_logger")

@router.post("/summarize")
def summarize_endpoint(request: StructuredSummaryRequest, db: Session = Depends(get_session)):
    """
    Generate a structured summary in the requested format.
    """
    try:
        # Validate the requested format
        valid_formats = {"bullet", "paragraph", "insight"}
        if request.format not in valid_formats:
            raise HTTPException(status_code=400, detail=f"Invalid format '{request.format}'. Valid formats are: {', '.join(valid_formats)}.")

        # Begin a transaction
        with db.begin():
            # Generate the summary
            summary_text = generate_summary(request.text, format=request.format)

            # Save the summary as a bot response
            bot_message = Message(
                session_id=request.session_id,
                sender="bot",
                content=summary_text,
                timestamp=datetime.utcnow()
            )
            db.add(bot_message)
            db.flush()  # Ensure bot_message.id is available

            # Generate and store embedding for the summary
            embedding_vector = generate_embedding(summary_text)
            if embedding_vector:
                store_embedding(bot_message.id, embedding_vector, db)

        return ChatResponse(
            response=summary_text,
            session_id=request.session_id,
            tool_calls_made=[],
            metadata={}
        )

    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        logger.error(f"Error in structured summary endpoint: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate structured summary")