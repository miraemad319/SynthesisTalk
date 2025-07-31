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
from services.context_service import ContextBuilder, build_prompt, build_context_with_reasoning
from services.feedback_analysis import analyze_feedback
from services.summarize_service import generate_summary
from services.unified_search_service import search_service
from services.visualization_service import generate_insights
from services.self_correction_service import self_correct
from settings.settings import settings

from utils.text_utils import trim_text_to_token_limit
from llm_providers.llm_manager import get_llm_response
from models.api_models import ChatRequest, ChatResponse, StructuredSummaryRequest, ReasoningType

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("chat_logger")

router = APIRouter()

@router.get("/session/{session_id}/messages")
def get_messages(session_id: int, db: Session = Depends(get_session)):
    try:
        # Fetch messages
        statement = select(Message).where(Message.session_id == session_id).order_by(Message.timestamp.asc())
        messages = db.execute(statement).scalars().all()

        # Include message IDs and parse insights
        messages_with_ids = [
            {
                "id": message.id,
                "content": message.content,
                "timestamp": message.timestamp,
                "sender": message.sender,
                "insights": message.insights  # Return structured insights
            }
            for message in messages
        ]

        # Fetch documents (uploaded files)
        document_statement = select(Document).where(Document.session_id == session_id).order_by(Document.uploaded_at.asc())
        documents = db.execute(document_statement).scalars().all()

        # Combine messages and documents
        combined_results = {
            "messages": messages_with_ids,
            "documents": documents
        }

        return combined_results
    except Exception as e:
        logger.error(f"❌ Get messages error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve messages and documents: {str(e)}")

@router.post("/session/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_session)):
    """
    Handle user messages and generate bot responses with optional reasoning.
    """
    try:
        # Default reasoning_type to 'auto' (Hybrid) if enable_reasoning is True and reasoning_type is not provided
        if request.enable_reasoning and not request.reasoning_type:
            request.reasoning_type = ReasoningType.HYBRID

        logger.info("Storing user message...")
        # Store user message
        user_message = Message(
            session_id=request.session_id,
            sender="user",
            content=request.message
        )
        db.add(user_message)
        db.commit()
        db.refresh(user_message)

        logger.info("Checking for summarize request...")
        # Check if the message is a 'summarize' request
        if "summarize" in request.message.lower():
            try: 
                logger.info("Generating summary...")
                # Generate a summary in the default format (e.g., 'paragraph')
                summary_text = generate_summary(request.message, format="paragraph")
                summary_text = await self_correct(
                    query=request.message,
                    initial_response=summary_text,
                    task_type="summarization"
                )

                logger.info("Storing summary as bot response...")
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

                logger.info("Generating and storing embedding for summary...")
                # Generate and store embedding for the summary
                embedding_vector = generate_embedding(summary_text)
                if embedding_vector:
                    store_embedding(db, request.session_id, summary_text)

                return ChatResponse(
                    success=True,
                    response=summary_text,
                    session_id=request.session_id,
                    tool_calls_made=[],
                    metadata={}
                )
            except Exception as e:
                logger.error(f"Error while processing summarize request: {e}")
                raise HTTPException(status_code=500, detail="Failed to process summarize request")

        logger.info("Building context...")
        # Build context with optional reasoning
        if request.enable_reasoning:
            logger.info(f"Using reasoning type: {request.reasoning_type.value}")
            context_result = await build_context_with_reasoning(
                db=db,
                session_id=request.session_id,
                user_message=request.message,
                reasoning_type=request.reasoning_type
            )
        else:
            context_builder = ContextBuilder(db, enable_reasoning=False)
            context_result = await context_builder.build_context(
                session_id=request.session_id,
                user_message=request.message,
                include_web_search=request.enable_web_search,
                include_documents=request.enable_document_search,
                include_insights=request.enable_insights,
                include_conversation_history=not request.enable_insights,  # Skip conversation history for insights
                max_history_messages=2 if request.enable_insights else 10  # Minimal history for insights
            )

        # Generate insights if enabled
        insights_data = None
        visualizations = []

        logger.info("Generating prompt...")
        # Generate prompt with optional reasoning
        prompt = build_prompt(
            context=context_result["context"], 
            user_message=request.message, 
            db=db,
            reasoning_output=context_result.get("reasoning")
        )

        logger.info("Getting LLM response...")
        try:
            # Get LLM response
            bot_response = await get_llm_response(prompt)

            # Ensure bot_response is handled correctly
            if isinstance(bot_response, str):
                bot_message_content = bot_response
            elif isinstance(bot_response, dict) and "content" in bot_response:
                bot_message_content = bot_response["content"]
            else:
                bot_message_content = "Unable to process the response from the AI service."

            # Apply self-correction mechanism
            logger.info("Applying self-correction mechanism...")
            original_response = bot_message_content
            bot_message_content = await self_correct(
                query=request.message,
                initial_response=bot_message_content,
                task_type="reasoning" if request.enable_reasoning else "general"
            )

            if bot_message_content != original_response:
                logger.info("✅ Response was improved by self-correction")
            else:
                logger.info("ℹ️ Response was already acceptable")

        except Exception as e:
            logger.debug(f"Raw LLM response: {locals().get('bot_response', 'No response received')}")
            logger.error(f"Error while getting LLM response: {e}")
            bot_message_content = (
                "I apologize, but I'm currently unable to process your request due to technical issues with the AI services. "
                "Please try again later."
            )

        logger.info("Storing bot response...")
        # Store bot response
        bot_message = Message(
            session_id=request.session_id,
            sender="bot",
            content=bot_message_content
        )
        db.add(bot_message)
        db.commit()
        db.refresh(bot_message)

        # Generate insights if enabled
        if request.enable_insights:
            logger.info("Generating insights...")
            try:
                # Prepare data for insights generation - focus on current query and response only
                insight_data = []
                
                # Add the current user query and bot response as primary insight sources
                insight_data.append({
                    "type": "current_query",
                    "content": f"User Query: {request.message}",
                    "source": "current_conversation"
                })
                
                insight_data.append({
                    "type": "current_response", 
                    "content": f"Assistant Response: {bot_message_content}",
                    "source": "current_conversation"
                })
                
                # Only add relevant document context if documents were searched
                if request.enable_document_search and context_result.get("context"):
                    # Extract only document-related sections, not conversation history
                    context_lines = context_result["context"].split("\n\n")
                    document_sections = [line for line in context_lines if "RELEVANT DOCUMENTS" in line or "SESSION DOCUMENTS" in line or "📄" in line]
                    if document_sections:
                        insight_data.append({
                            "type": "document_context",
                            "content": "\n\n".join(document_sections),
                            "source": "documents"
                        })
                
                # Use current conversation context instead of full context
                current_conversation_context = f"Query: {request.message}\nResponse: {bot_message_content}"
                
                # Generate insights
                insights_result = await generate_insights(
                    data=insight_data,
                    context=current_conversation_context,
                    user_message=request.message
                )
                
                insights_data = insights_result
                visualizations = insights_result.get("visualizations", [])
                
                logger.info(f"Generated insights with confidence: {insights_result.get('confidence_score', 0)}")
                
                # Log the insights result for debugging
                logger.info(f"Insights result: {insights_result}")
                
                # Save insights in the database
                try:
                    bot_message.insights = json.dumps(insights_result, ensure_ascii=False, default=str)
                    db.add(bot_message)
                    db.commit()
                    db.refresh(bot_message)
                except (TypeError, ValueError) as json_error:
                    logger.error(f"Error serializing insights: {json_error}")
                    bot_message.insights = json.dumps({"error": "Failed to serialize insights data"})
                    db.add(bot_message)
                    db.commit()
                    db.refresh(bot_message)

            except Exception as e:
                logger.error(f"Error generating insights: {e}")
                insights_data = {"error": f"Failed to generate insights: {str(e)}"}

        logger.info("Generating and storing embeddings...")
        # Generate and store embeddings
        store_embedding(db, request.session_id, request.message)
        store_embedding(db, request.session_id, bot_message_content)

        logger.info("Performing combined search if web search is enabled...")
        # Perform combined search if web search is enabled
        search_results = {}
        sources_used = []
        if request.enable_web_search:
            from services.unified_search_service import search_service
            search_results = await search_service.combined_search(
                query=request.message,
                session_id=request.session_id,
                db=db,
                include_web=request.enable_web_search,
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

        logger.info("Returning chat response...")
        try:
            return ChatResponse(
                success=True,
                response=bot_message_content,
                session_id=request.session_id,
                tool_calls_made=context_result["metadata"].get("tool_calls", []),
                reasoning_output=context_result.get("reasoning"),  # This should contain the actual reasoning text
                question_type=context_result.get("question_type").value if context_result.get("question_type") else None,
                insights=insights_data,
                visualizations=visualizations, 
                metadata={
                    "search_results": search_results,
                    "sources_used": sources_used,
                    "reasoning_applied": request.enable_reasoning,
                    "reasoning_type": request.reasoning_type.value if request.enable_reasoning else None,
                },
                message_id=bot_message.id
            )
        except Exception as response_error:
            logger.error(f"Error creating ChatResponse: {response_error}")
            # Return a simplified response if we can't create the full one
            return ChatResponse(
                success=True,
                response=bot_message_content,
                session_id=request.session_id,
                message_id=bot_message.id
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
    return {"message": "Feedback recorded successfully"}
