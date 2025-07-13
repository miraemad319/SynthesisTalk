from sqlmodel import Session
from sqlalchemy.sql import text  # Import the text function for raw SQL queries
import logging
from fastapi import HTTPException
from sentence_transformers import SentenceTransformer

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

def store_embedding(db: Session, session_id: int, text: str):
    embedding = generate_embedding(text)
    query = text(
        "INSERT INTO embeddings (session_id, text, embedding) VALUES (:session_id, :text, :embedding)"
    )
    db.execute(query, {"session_id": session_id, "text": text, "embedding": embedding})
    db.commit()
