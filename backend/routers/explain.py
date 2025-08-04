from fastapi import APIRouter, Depends, HTTPException, Form
from sqlmodel import Session
from models.db_models import Message
from services.db_session import get_session
from services.explanation_service import generate_explanation, clarify
import logging

router = APIRouter()

logger = logging.getLogger("explain_logger")

@router.post("/explain-message")
async def explain_message_endpoint(
    message_id: int = Form(..., description="Message ID to explain"),
    db: Session = Depends(get_session)
):
    """Generate an explanation for a specific message."""
    try:
        # Fetch the message content
        message = db.get(Message, message_id)
        if not message:
            raise HTTPException(status_code=404, detail="Message not found.")

        # Generate explanation using the explanation service
        explanation_message = await generate_explanation(db, message.session_id, message.content)

        return {"success": True, "explanation": explanation_message}
    except Exception as e:
        logger.error(f"Error generating explanation: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate explanation.")

@router.post("/clarify-message")
async def clarify_message_endpoint(
    message_id: int = Form(..., description="Message ID to clarify"),
    db: Session = Depends(get_session)
):
    """Provide additional context or details for a message."""
    try:
        # Fetch the message content
        message = db.get(Message, message_id)
        if not message:
            raise HTTPException(status_code=404, detail="Message not found.")

        # Generate clarification using the explanation service
        clarification_message = await clarify(db, message.session_id, message.content)

        return {"success": True, "clarification": clarification_message}
    except Exception as e:
        logger.error(f"Error generating clarification: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate clarification.")