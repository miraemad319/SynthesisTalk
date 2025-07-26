from sqlmodel import Session
from models.db_models import Message
from datetime import datetime
from typing import Optional
import asyncio
import re
from llm_providers.llm_manager import get_llm_response

def generate_explanation(db: Session, session_id: int, content: str) -> Message:
    """Generate an explanation for the given content using an LLM, focusing on simplicity."""
    try:
        # Clean the content to remove excessive whitespace
        clean_content = re.sub(r'\s+', ' ', content.strip())
        
        # Truncate content if too long (to avoid token limits)
        if len(clean_content) > 2000:
            clean_content = clean_content[:2000] + "..."
        
        prompt = f"""Please explain the following text to a complete beginner in simple, easy-to-understand terms. Use everyday language and avoid technical jargon where possible. Break down complex concepts into simple explanations.

Text to explain:
{clean_content}

Simple explanation:"""

        # Get LLM response synchronously
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        explanation = loop.run_until_complete(get_llm_response(prompt))
        loop.close()
        
        # Clean and format the response
        if explanation and explanation.strip():
            explanation_content = explanation.strip()
        else:
            explanation_content = "Unable to generate explanation for the provided content."
        
        # Save the explanation as a new message in the Message table
        explanation_message = Message(
            session_id=session_id,
            sender="bot",
            content=explanation_content,
            timestamp=datetime.utcnow()
        )
        db.add(explanation_message)
        db.commit()
        db.refresh(explanation_message)
        return explanation_message
    except Exception as e:
        # Fallback response if LLM fails
        fallback_explanation = generate_simple_explanation(content)
        explanation_message = Message(
            session_id=session_id,
            sender="bot",
            content=fallback_explanation,
            timestamp=datetime.utcnow()
        )
        db.add(explanation_message)
        db.commit()
        db.refresh(explanation_message)
        return explanation_message

def clarify(db: Session, session_id: int, content: str) -> Message:
    """Add more details or context to the given content using an LLM."""
    try:
        # Clean the content to remove excessive whitespace
        clean_content = re.sub(r'\s+', ' ', content.strip())
        
        # Truncate content if too long (to avoid token limits)
        if len(clean_content) > 2000:
            clean_content = clean_content[:2000] + "..."
        
        prompt = f"""Please provide additional context, details, and clarification for the following text. Add background information, expand on key concepts, and provide any relevant examples or connections that would help someone understand this better.

Text to clarify:
{clean_content}

Additional context and clarification:"""

        # Get LLM response synchronously
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        clarification = loop.run_until_complete(get_llm_response(prompt))
        loop.close()
        
        # Clean and format the response
        if clarification and clarification.strip():
            clarification_content = clarification.strip()
        else:
            clarification_content = "Unable to provide additional clarification for the provided content."
        
        # Save the clarification as a new message in the Message table
        clarification_message = Message(
            session_id=session_id,
            sender="bot",
            content=clarification_content,
            timestamp=datetime.utcnow()
        )
        db.add(clarification_message)
        db.commit()
        db.refresh(clarification_message)
        return clarification_message
    except Exception as e:
        # Fallback response if LLM fails
        fallback_clarification = generate_simple_clarification(content)
        clarification_message = Message(
            session_id=session_id,
            sender="bot",
            content=fallback_clarification,
            timestamp=datetime.utcnow()
        )
        db.add(clarification_message)
        db.commit()
        db.refresh(clarification_message)
        return clarification_message

# Fallback functions for when LLM is unavailable
def generate_simple_explanation(text: str) -> str:
    """Simple fallback explanation without LLM."""
    # Basic text processing for explanation
    sentences = re.split(r'[.!?]+', text)
    meaningful_sentences = []
    
    for sentence in sentences:
        sentence = sentence.strip()
        if len(sentence.split()) >= 4:
            meaningful_sentences.append(sentence)
            if len(meaningful_sentences) >= 2:
                break
    
    if not meaningful_sentences:
        return "The provided content appears to be complex and would benefit from additional context for a proper explanation."
    
    return f"This content discusses: {'. '.join(meaningful_sentences)}. For a more detailed explanation, please try again when the system is fully available."

def generate_simple_clarification(text: str) -> str:
    """Simple fallback clarification without LLM."""
    # Basic text processing for clarification
    word_count = len(text.split())
    
    if word_count < 10:
        return "This appears to be a brief statement that could benefit from additional context and examples to fully understand its implications."
    elif word_count < 50:
        return "This content covers several key points that could be expanded with more background information, examples, and related concepts."
    else:
        return "This is a comprehensive text that touches on multiple concepts. Additional clarification could include background context, detailed explanations of key terms, and practical examples."