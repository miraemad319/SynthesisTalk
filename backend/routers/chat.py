from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Dict, Any, Optional
from datetime import datetime
import requests
import logging
import json

from models.db_models import Message, Document, Session as ResearchSession
from services.db_session import get_session
from services.embedding_service import generate_embedding, store_embedding
from services.document_service import save_document, get_documents_text
from services.context_service import ContextBuilder, build_prompt
from settings.settings import settings

from utils.text_utils import trim_text_to_token_limit
from llm_providers.llm_manager import get_llm_response
from models.api_models import ChatRequest, ChatResponse, StructuredSummaryRequest

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/session/{session_id}/messages")
def get_messages(session_id: int, db: Session = Depends(get_session)):
    try:
        statement = select(Message).where(Message.session_id == session_id).order_by(Message.timestamp.asc())
        return db.execute(statement).scalars().all()
    except Exception as e:
        logger.error(f"❌ Get messages error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve messages: {str(e)}")

@router.post("/session/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_session)):
    """
    Handle user messages and generate bot responses.
    """
    try:
        # Store user message
        user_message = Message(
            session_id=request.session_id,
            sender="user",
            content=request.message
        )
        db.add(user_message)
        db.commit()
        db.refresh(user_message)

        # Check if the message is a 'summarize' request
        if "summarize" in request.message.lower():
            try: 
                # Generate a summary in the default format (e.g., 'paragraph')
                summary_text = generate_summary(request.message, format="paragraph")

                # Save the summary as a bot response
                bot_message = Message(
                    session_id=request.session_id,
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
                    store_embedding(bot_message.id, embedding_vector, db)

                return ChatResponse(
                    response=summary_text,
                    session_id=request.session_id,
                    tool_calls_made=[],
                    metadata={}
                )
            except Exception as e:
                logger.error(f"Error while processing summarize request: {e}")
                raise HTTPException(status_code=500, detail="Failed to process summarize request")

        # Determine if web search is needed (bot-driven logic)
        include_web = request.enable_web_search
        if not include_web:
            # Bot-driven logic: Check if query requires web search
            keywords = [
                "latest", "current", "news", "find", "search", "web", "online",
                "update", "trending", "breaking", "recent", "discover", "lookup"
            ]
            if any(keyword in request.message.lower() for keyword in keywords):
                include_web = True


        # Build context
        context_builder = ContextBuilder(db)
        context_result = await context_builder.build_context(
            session_id=request.session_id,
            user_message=request.message,
            include_web_search=request.enable_web_search,
            include_documents=request.enable_document_search
        )

        # Generate prompt
        prompt = await build_prompt(request.message, context_result)

        # Get LLM response
        bot_response = await get_llm_response(prompt)

        # Store bot response
        bot_message = Message(
            session_id=request.session_id,
            sender="bot",
            content=bot_response
        )
        db.add(bot_message)
        db.commit()

        # Generate and store embeddings
        store_embedding(db, request.session_id, request.message)
        store_embedding(db, request.session_id, bot_response)

        # Perform combined search if web search is enabled
        search_results = {}
        sources_used = []
        if include_web:
            from services.unified_search_service import search_service
            search_results = await search_service.combined_search(
                query=request.message,
                session_id=request.session_id,
                db=db,
                include_web=include_web,
                include_documents=request.enable_document_search
            )

            # Extract sources from web search results
            if search_results["success"] and search_results["results"]["web_results"]:
                sources_used = [
                    f"{source['title']} ({source['link']})"
                    for source in search_results["results"]["web_results"]
                ]

        # Include sources_used in the prompt
        if sources_used:
            prompt += "\n\nSources used in the search:\n" + "\n".join(sources_used)

        return ChatResponse(
            success=True,
            response=bot_response,
            session_id=request.session_id,
            tool_calls_made=context_result["metadata"].get("tool_calls", []),
            metadata={
                "search_results": search_results,
                "sources_used": sources_used  # Move sources_used into metadata
            }
        )

    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Provide feedback for a bot response
@router.post("/message/{message_id}/feedback")
def provide_feedback(message_id: int, thumbs_up: Optional[bool] = None, thumbs_down: Optional[bool] = None, db: Session = Depends(get_session)):
    # Validate message
    message = db.get(Message, message_id)
    if not message:
        return {"error": "Message not found"}

    # Update feedback
    if thumbs_up is not None:
        message.thumbs_up = thumbs_up
    if thumbs_down is not None:
        message.thumbs_down = thumbs_down

        # Log thumbs_down feedback
        logger.warning(f"Thumbs down received for message ID {message_id}: {message.content}")

        # Avoid similar responses in the same session
        session_messages = db.exec(
            select(Message).where(Message.session_id == message.session_id)
        ).all()
        for session_message in session_messages:
            if message.content in session_message.content:
                logger.info(f"Avoiding similar response: {session_message.content}")

    db.commit()
    return {"message": "Feedback recorded successfully"}

