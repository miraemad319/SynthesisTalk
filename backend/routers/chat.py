from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from typing import List
from datetime import datetime
import requests
import logging

from models.db_models import Message, Document, Session as ResearchSession
from services.db_session import get_session
from services.embedding_service import generate_embedding, store_embedding
from services.document_service import save_document, get_documents_text
from services.context_service import build_context, build_prompt
from settings.settings import settings

from utils.text_utils import trim_text_to_token_limit
from llm_providers.llm_manager import get_llm_response

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Include the embedding router
router.include_router(router, prefix="/embedding")

# Request body schema
class ChatRequest(BaseModel):
    session_id: int
    user_message: str

# Response schema
class ChatResponse(BaseModel):
    bot_message: str

@router.get("/session/{session_id}/messages")
def get_messages(session_id: int, db: Session = Depends(get_session)):
    try:
        statement = select(Message).where(Message.session_id == session_id).order_by(Message.timestamp.asc())
        return db.execute(statement).scalars().all()  # Use execute() and scalars() for SQLModel compatibility
    except Exception as e:
        logger.error(f"❌ Get messages error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve messages: {str(e)}")

@router.post("/session/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest, db: Session = Depends(get_session)):
    try:
        # Validate session exists
        session_obj = db.get(ResearchSession, request.session_id)
        if not session_obj:
            raise HTTPException(status_code=404, detail="Session not found")

        # Log the user message
        logger.info(f"User message: {request.user_message}")

        # Build unified context
        context = build_context(db, request.session_id, request.user_message)

        # Log the generated context
        logger.info(f"Generated context: {context}")

        # Generate response using LLM
        bot_reply = get_llm_response(context)

        # Save user message with timestamp
        user_msg = Message(session_id=request.session_id, sender="user", content=request.user_message, timestamp=datetime.utcnow())
        db.add(user_msg)
        db.commit()
        db.refresh(user_msg)

        # Save bot response with timestamp
        bot_msg = Message(session_id=request.session_id, sender="assistant", content=bot_reply, timestamp=datetime.utcnow())
        db.add(bot_msg)
        db.commit()

        # Generate and store embeddings asynchronously
        try:
            user_embedding = generate_embedding(request.user_message)
            store_embedding(db, request.session_id, request.user_message)
            bot_embedding = generate_embedding(bot_reply)
            store_embedding(db, request.session_id, bot_reply)
        except Exception as e:
            logger.warning(f"Embedding generation failed: {e}")

        return ChatResponse(bot_message=bot_reply)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Chat endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")