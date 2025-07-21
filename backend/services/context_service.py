"""
Context Service for building comprehensive context from multiple sources
Integrated with advanced reasoning capabilities
"""
import logging
from typing import List, Dict, Any, Optional
from sqlmodel import Session, select
from sqlalchemy.sql import text
from models.db_models import Message, Document
from models.api_models import ReasoningType, QuestionType
from services.document_service import search_documents, get_documents_by_session, get_document_by_id
from services.web_search import search_web
from services.embedding_service import generate_embedding
from services.feedback_analysis import analyze_feedback
from services.reasoning_service import (
    chain_of_thought_reasoning, 
    react_reasoning, 
    hybrid_reasoning,
    classify_question
)
from utils.text_utils import trim_text_to_token_limit
import asyncio

logger = logging.getLogger(__name__)

class ContextBuilder:
    """Builds context from multiple sources for LLM conversations with advanced reasoning"""
    
    def __init__(self, db: Session, enable_reasoning: bool = True, reasoning_type: ReasoningType = ReasoningType.HYBRID):
        self.db = db
        self.max_context_tokens = 8000  # Adjust based on your model's context limit
        self.enable_reasoning = enable_reasoning
        self.reasoning_type = reasoning_type
    
    async def build_context(
        self,
        session_id: int,
        user_message: str,
        include_web_search: bool = True,
        include_documents: bool = True,
        include_conversation_history: bool = True,
        max_history_messages: int = 10,
        reasoning_type: Optional[ReasoningType] = None
    ) -> Dict[str, Any]:
        """
        Build comprehensive context from all available sources with advanced reasoning
        """
        # Use provided reasoning type or fall back to instance default
        if reasoning_type is None:
            reasoning_type = self.reasoning_type
            
        context_parts = []
        metadata = {
            "sources_used": [],
            "token_usage": {},
            "search_results": {},
            "reasoning_applied": self.enable_reasoning,
            "reasoning_type": reasoning_type.value if reasoning_type else None,
            "question_type": None
        }
        
        # Classify the question type for reasoning
        question_type = None
        if self.enable_reasoning:
            question_type = classify_question(user_message)
            metadata["question_type"] = question_type.value
        
        try:
            # 1. Get conversation history
            if include_conversation_history:
                history_context = await self._get_conversation_history(
                    session_id, max_history_messages
                )
                if history_context:
                    context_parts.append({
                        "type": "conversation_history",
                        "content": history_context,
                        "priority": 1
                    })
                    metadata["sources_used"].append("conversation_history")
            
            # 2. Search documents if available
            if include_documents:
                doc_results = await search_documents(user_message, session_id, self.db)
                if doc_results:
                    doc_context = self._format_document_results(doc_results)
                    context_parts.append({
                        "type": "documents",
                        "content": doc_context,
                        "priority": 2
                    })
                    metadata["sources_used"].append("documents")
                    metadata["search_results"]["documents"] = len(doc_results)
                else:
                    # Fallback: get general document context if no search results
                    general_docs = self._get_all_documents_for_context(session_id, max_docs=2)
                    if general_docs:
                        context_parts.append({
                            "type": "general_documents",
                            "content": general_docs,
                            "priority": 4  # Lower priority than search results
                        })
                        metadata["sources_used"].append("general_documents")
            
            # 3. Web search for current information
            if include_web_search:
                web_results = await search_web(user_message, num_results=3)
                if web_results and any(r.get("title") != "Search Unavailable" for r in web_results):
                    web_context = self._format_web_results(web_results)
                    context_parts.append({
                        "type": "web_search",
                        "content": web_context,
                        "priority": 3
                    })
                    metadata["sources_used"].append("web_search")
                    metadata["search_results"]["web"] = len(web_results)
            
            # 4. Enhance context with additional document details if needed
            context_parts = self._enhance_context_with_document_details(context_parts)
            
            # 5. Build final context within token limits
            final_context = self._combine_context_parts(context_parts, user_message)
            
            # 6. Apply reasoning if enabled
            reasoning_output = None
            if self.enable_reasoning and reasoning_type:
                reasoning_output = self._apply_reasoning(
                    final_context, user_message, reasoning_type, question_type
                )
                metadata["reasoning_output"] = "Applied"
                # Store the actual reasoning text
                metadata["reasoning_text"] = reasoning_output

            
            # Log the final context and metadata
            logger.info("Final context built:")
            logger.info(final_context)
            logger.info("Metadata:")
            logger.info(metadata)

            return {
                "context": final_context,
                "reasoning": reasoning_output,
                "metadata": metadata,
                "user_message": user_message,
                "question_type": question_type
            }
            
        except Exception as e:
            logger.error(f"Failed to build comprehensive context: {e}")
            return {
                "context": f"I'll help you with: {user_message}",
                "reasoning": None,
                "metadata": {"sources_used": [], "error": str(e)},
                "user_message": user_message,
                "question_type": None
            }
    
    async def _get_conversation_history(self, session_id: int, max_messages: int) -> str:
        """Get recent conversation history"""
        try:
            statement = (
                select(Message)
                .where(Message.session_id == session_id)
                .order_by(Message.timestamp.desc())
                .limit(max_messages)
            )
            messages = self.db.execute(statement).scalars().all()
            
            if not messages:
                return ""
            
            # Reverse to get chronological order
            messages = list(reversed(messages))
            
            history_parts = []
            for msg in messages:
                role = "You" if msg.sender == "user" else "Assistant"
                history_parts.append(f"{role}: {msg.content}")
            
            return "\n".join(history_parts)
            
        except Exception as e:
            logger.error(f"Failed to get conversation history: {e}")
            return ""
    
    def _format_document_results(self, doc_results: List[Dict[str, Any]]) -> str:
        """Format document search results into context"""
        if not doc_results:
            return ""
        
        formatted_parts = ["=== RELEVANT DOCUMENTS ==="]
        
        for doc in doc_results:
            # Extract information safely with defaults
            filename = doc.get('filename', 'Unknown Document')
            snippet = doc.get('snippet', doc.get('text', 'No content available'))
            similarity_score = doc.get('similarity_score', 0.0)
            document_id = doc.get('document_id', None)
            
            # Format with additional metadata if available
            doc_info = f"📄 {filename}"
            if similarity_score > 0:
                doc_info += f" (relevance: {similarity_score:.2f})"
            if document_id:
                doc_info += f" [ID: {document_id}]"
            
            formatted_parts.append(f"{doc_info}:\n{snippet}\n")
        
        return "\n".join(formatted_parts)
    
    def _get_all_documents_for_context(self, session_id: int, max_docs: int = 3) -> str:
        """Get all documents for broad context when no specific search results"""
        try:
            documents = get_documents_by_session(self.db, session_id)
            if not documents:
                return ""
            
            formatted_parts = ["=== SESSION DOCUMENTS ==="]
            
            for doc in documents[:max_docs]:
                # Get a brief excerpt from the document
                excerpt = doc.text[:200] + "..." if len(doc.text) > 200 else doc.text
                formatted_parts.append(f"📄 {doc.filename}:\n{excerpt}\n")
            
            if len(documents) > max_docs:
                formatted_parts.append(f"... and {len(documents) - max_docs} more documents")
            
            return "\n".join(formatted_parts)
            
        except Exception as e:
            logger.error(f"Failed to get session documents: {e}")
            return ""
    
    def _get_document_details(self, document_id: int) -> Dict[str, Any]:
        """Get detailed information about a specific document"""
        try:
            document = get_document_by_id(self.db, document_id)
            if document:
                return {
                    "id": document.id,
                    "filename": document.filename,
                    "text": document.text,
                    "session_id": document.session_id,
                    "created_at": getattr(document, 'created_at', None)
                }
            return {}
        except Exception as e:
            logger.error(f"Failed to get document details for ID {document_id}: {e}")
            return {}
    
    def _enhance_context_with_document_details(self, context_parts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Enhance context parts with additional document details if needed"""
        for part in context_parts:
            if part["type"] == "documents":
                # Could add additional processing here
                # For example, expanding snippets, adding metadata, etc.
                pass
        return context_parts
    
    def _format_web_results(self, web_results: List[Dict[str, Any]]) -> str:
        """Format web search results into context"""
        if not web_results:
            return ""
        
        formatted_parts = ["=== CURRENT WEB INFORMATION ==="]
        
        for result in web_results:
            if result.get("title") != "Search Unavailable":
                formatted_parts.append(
                    f"🌐 {result['title']}:\n{result['snippet']}\n"
                )
        
        return "\n".join(formatted_parts)
    
    def _combine_context_parts(
        self, 
        context_parts: List[Dict[str, Any]], 
        user_message: str
    ) -> str:
        """Combine context parts within token limits"""
        
        # Sort by priority (lower number = higher priority)
        context_parts.sort(key=lambda x: x["priority"])
        
        combined_context = []
        current_tokens = len(user_message.split()) * 1.3  # Rough token estimation
        
        for part in context_parts:
            part_tokens = len(part["content"].split()) * 1.3
            
            if current_tokens + part_tokens < self.max_context_tokens:
                combined_context.append(part["content"])
                current_tokens += part_tokens
            else:
                # Try to fit a truncated version
                remaining_tokens = self.max_context_tokens - current_tokens - 100  # Buffer
                if remaining_tokens > 50:
                    truncated = trim_text_to_token_limit(
                        part["content"], 
                        int(remaining_tokens / 1.3)
                    )
                    combined_context.append(truncated + "\n[Content truncated...]")
                break
        
        return "\n\n".join(combined_context)
    
    def _apply_reasoning(
        self, 
        context: str, 
        user_message: str, 
        reasoning_type: ReasoningType,
        question_type: Optional[QuestionType] = None
    ) -> str:
        """Apply selected reasoning technique to the context and user message"""
        try:
            available_tools = ["web_search", "document_search", "calculation", "analysis"]
            
            logger.info(f"Applying reasoning type: {reasoning_type.value}")

            if reasoning_type == ReasoningType.CHAIN_OF_THOUGHT:
                return chain_of_thought_reasoning(context, user_message, question_type)
            elif reasoning_type == ReasoningType.REACT:
                return react_reasoning(context, user_message, available_tools)
            elif reasoning_type == ReasoningType.HYBRID:
                return hybrid_reasoning(context, user_message, available_tools)
            else:
                logger.warning(f"Unknown reasoning type: {reasoning_type}")
                return chain_of_thought_reasoning(context, user_message, question_type)
            
            logger.info(f"Reasoning result generated: {reasoning_result[:200]}...")  # Log first 200 chars
            return reasoning_result
                
        except Exception as e:
            logger.error(f"Failed to apply reasoning: {e}")
            return f"Reasoning Error: {str(e)}"

# Enhanced functions with reasoning support
async def build_context_with_reasoning(
    db: Session, 
    session_id: int, 
    user_message: str,
    reasoning_type: ReasoningType = ReasoningType.HYBRID
) -> Dict[str, Any]:
    """
    Build comprehensive context with reasoning output
    """
    builder = ContextBuilder(db, enable_reasoning=True, reasoning_type=reasoning_type)
    return await builder.build_context(session_id, user_message)

async def build_context_with_cot(db: Session, session_id: int, user_message: str) -> Dict[str, Any]:
    """Build context with Chain of Thought reasoning"""
    return await build_context_with_reasoning(db, session_id, user_message, ReasoningType.CHAIN_OF_THOUGHT)

async def build_context_with_react(db: Session, session_id: int, user_message: str) -> Dict[str, Any]:
    """Build context with ReAct reasoning"""
    return await build_context_with_reasoning(db, session_id, user_message, ReasoningType.REACT)

async def build_context_with_hybrid(db: Session, session_id: int, user_message: str) -> Dict[str, Any]:
    """Build context with Hybrid reasoning"""
    return await build_context_with_reasoning(db, session_id, user_message, ReasoningType.HYBRID)

# Legacy functions for backward compatibility
def retrieve_context(db: Session, session_id: int, query_embedding: list[float]) -> str:
    """
    Retrieve the most relevant documents and messages using semantic search.
    """
    if not query_embedding:
        raise ValueError("query_embedding cannot be empty")

    # Convert query_embedding to a string representation of an array
    query_embedding_str = "ARRAY[" + ",".join(map(str, query_embedding)) + "]::vector"

    try:
        results = db.execute(
            text(
                f"""
                SELECT text
                FROM embedding
                WHERE session_id = :session_id
                ORDER BY embedding <-> {query_embedding_str}
                LIMIT 5
                """
            ),
            {"session_id": session_id}
        ).fetchall()
        return "\n\n".join([row["text"] for row in results])
    except Exception as e:
        logger.error(f"Semantic search failed: {e}")
        return ""

def get_recent_messages(db: Session, session_id: int, limit=10) -> list[Message]:
    statement = select(Message).where(Message.session_id == session_id).order_by(Message.timestamp.desc()).limit(limit)
    results = db.execute(statement).scalars().all()
    return list(reversed(results))  # Oldest first

async def build_context(
    db: Session, 
    session_id: int, 
    user_message: str, 
    enable_reasoning: bool = True,
    reasoning_type: ReasoningType = ReasoningType.HYBRID
) -> str:
    """
    Build comprehensive context (enhanced version with reasoning)
    """
    builder = ContextBuilder(db, enable_reasoning, reasoning_type)
    result = await builder.build_context(session_id, user_message)
    return result["context"]

def build_prompt(
    context: str, 
    user_message: str, 
    system_prompt: str = None, 
    db: Session = None,
    reasoning_output: str = None
) -> str:
    """
    Build the final prompt for the LLM, incorporating feedback patterns, system guidance, and reasoning.
    """
    if system_prompt is None:
        system_prompt = """You are SynthesisTalk, an intelligent research assistant with advanced reasoning capabilities. You help users by:

1. 📚 Analyzing uploaded documents and extracting key insights
2. 🔍 Searching the web for current information when needed
3. 💡 Synthesizing information from multiple sources
4. 🧠 Applying structured reasoning (Chain of Thought, ReAct, Hybrid approaches)
5. 🎯 Providing clear, well-structured responses
6. 🔗 Maintaining context across conversations

When responding:
- Use the provided reasoning analysis to structure your thinking
- Be concise but comprehensive
- Cite sources when referencing specific information
- Ask clarifying questions if the request is ambiguous
- Offer to search for additional information if needed
- Maintain conversation context and remember previous discussions"""

    # Analyze feedback patterns if db is provided
    avoid_phrases = []
    encourage_phrases = []
    if db:
        feedback_patterns = analyze_feedback(db)
        avoid_phrases = [word for word, count in feedback_patterns["thumbs_down"] if count > 2]  # Avoid frequent negative patterns
        encourage_phrases = [word for word, count in feedback_patterns["thumbs_up"] if count > 2]  # Encourage frequent positive patterns

    # Build the base prompt
    prompt_parts = [system_prompt]

    if context and context.strip():
        prompt_parts.append(f"CONTEXT:\n{context}")
    
    # Add reasoning output if available
    if reasoning_output and reasoning_output.strip():
        prompt_parts.append(f"REASONING ANALYSIS:\n{reasoning_output}")

    prompt_parts.append(f"USER MESSAGE: {user_message}")

    # Add a note to avoid certain phrases if necessary
    if avoid_phrases:
        prompt_parts.append("(Note: Avoid using the following phrases: " + ", ".join(avoid_phrases) + ")")

    # Add a note to encourage certain phrases if necessary
    if encourage_phrases:
        prompt_parts.append("(Note: Consider using the following phrases: " + ", ".join(encourage_phrases) + ")")

    prompt_parts.append("RESPONSE:")

    return "\n\n".join(prompt_parts)