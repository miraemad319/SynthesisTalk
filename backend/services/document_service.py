from sqlmodel import Session, select
from models.db_models import Document, Embedding
from services.embedding_service import generate_embedding
import logging
from typing import List, Dict, Any
import numpy as np

logger = logging.getLogger(__name__)

def save_document(db: Session, session_id: int, filename: str, text: str) -> Document:
    doc = Document(session_id=session_id, filename=filename, text=text)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

def get_documents_text(db: Session, session_id: int) -> str:
    statement = select(Document).where(Document.session_id == session_id)
    docs = db.execute(statement).scalars().all()  # Use execute() and scalars() for SQLModel compatibility
    return "\n\n".join([doc.text for doc in docs])

async def search_documents(query: str, session_id: int, db: Session = None, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Search through documents using semantic similarity
    """
    try:
        if not db:
            from services.db_session import get_session
            db = next(get_session())
        
        # Generate embedding for the query
        query_embedding = generate_embedding(query)
        if not query_embedding:
            logger.warning("Failed to generate embedding for query")
            return []
        
        # Get all documents for the session
        statement = select(Document).where(Document.session_id == session_id)
        documents = db.execute(statement).scalars().all()
        
        if not documents:
            return []
        
        # Simple text-based search as fallback if no embeddings
        results = []
        for doc in documents:
            # Calculate simple text similarity (can be enhanced with embeddings)
            similarity_score = calculate_text_similarity(query.lower(), doc.text.lower())
            
            if similarity_score > 0.1:  # Threshold for relevance
                # Extract relevant snippet
                snippet = extract_relevant_snippet(query, doc.text)
                
                results.append({
                    "document_id": doc.id,
                    "filename": doc.filename,
                    "snippet": snippet,
                    "similarity_score": similarity_score,
                    "source": "document"
                })
        
        # Sort by similarity score and return top results
        results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return results[:top_k]
        
    except Exception as e:
        logger.error(f"Document search failed: {e}")
        return []

def calculate_text_similarity(query: str, text: str) -> float:
    """
    Simple text similarity calculation
    Can be enhanced with more sophisticated NLP techniques
    """
    query_words = set(query.split())
    text_words = set(text.split())
    
    if not query_words or not text_words:
        return 0.0
    
    # Jaccard similarity
    intersection = query_words.intersection(text_words)
    union = query_words.union(text_words)
    
    return len(intersection) / len(union) if union else 0.0

def extract_relevant_snippet(query: str, text: str, max_length: int = 200) -> str:
    """
    Extract a relevant snippet from the text based on the query
    """
    query_words = query.lower().split()
    text_lower = text.lower()
    
    # Find the best position that contains most query words
    best_pos = 0
    best_score = 0
    
    words = text.split()
    for i in range(len(words)):
        # Check a window around position i
        window_start = max(0, i - 20)
        window_end = min(len(words), i + 20)
        window_text = " ".join(words[window_start:window_end]).lower()
        
        # Count query words in this window
        score = sum(1 for word in query_words if word in window_text)
        
        if score > best_score:
            best_score = score
            best_pos = window_start
    
    # Extract snippet around best position
    snippet_start = max(0, best_pos - 10)
    snippet_end = min(len(words), best_pos + 30)
    snippet = " ".join(words[snippet_start:snippet_end])
    
    # Truncate if too long
    if len(snippet) > max_length:
        snippet = snippet[:max_length] + "..."
    
    return snippet

def get_document_by_id(db: Session, document_id: int) -> Document:
    """Get a specific document by ID"""
    return db.get(Document, document_id)

def get_documents_by_session(db: Session, session_id: int) -> List[Document]:
    """Get all documents for a session"""
    statement = select(Document).where(Document.session_id == session_id)
    return db.execute(statement).scalars().all()

def delete_document(db: Session, document_id: int) -> bool:
    """Delete a document"""
    try:
        document = db.get(Document, document_id)
        if document:
            db.delete(document)
            db.commit()
            return True
        return False
    except Exception as e:
        logger.error(f"Failed to delete document {document_id}: {e}")
        return False