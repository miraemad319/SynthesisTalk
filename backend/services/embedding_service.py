from sqlmodel import Session
import logging
from fastapi import HTTPException
from sentence_transformers import SentenceTransformer
from models.db_models import Embedding

# Set up logging
logger = logging.getLogger(__name__)


# Load the Hugging Face model globally to avoid reloading it for every request
hf_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

def generate_embedding(text: str) -> list[float]:
    """
    Generate an embedding for the given text using Hugging Face's SentenceTransformer.
    """
    logger.info(f"Generating embedding for text: {text}")
    if not text:
        logger.warning("Input text is empty. Returning an empty embedding.")
        return []

    try:
        # Generate embeddings using Hugging Face's model
        embedding = hf_model.encode(text).tolist()
        logger.info(f"Generated embedding: {embedding}")
        return embedding
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        return []

def store_embedding(db: Session, session_id: int, text_content: str):
    """
    Store text and its embedding in the database using SQLModel.
    """
    try:
        embedding_vector = generate_embedding(text_content)
        if not embedding_vector:
            logger.warning(f"Empty embedding generated for text: {text_content[:50]}...")
            return None

        # Validate embedding vector
        if not isinstance(embedding_vector, list) or len(embedding_vector) != 384:
            logger.error(f"Invalid embedding vector: {embedding_vector}")
            raise HTTPException(status_code=400, detail="Invalid embedding vector format")

        # Create new embedding record using SQLModel
        embedding_record = Embedding(
            session_id=session_id,
            text=text_content,
            embedding=embedding_vector
        )
        
        db.add(embedding_record)
        db.commit()
        db.refresh(embedding_record)
        
        logger.info(f"Successfully stored embedding for session {session_id}")
        return embedding_record.id
        
    except Exception as e:
        logger.error(f"Error storing embedding: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to store embedding: {str(e)}")
