from sqlmodel import Session, select
from sqlalchemy.sql import text
from services.embedding_service import generate_embedding
from models.db_models import Message
from utils.text_utils import trim_text_to_token_limit

def retrieve_context(db: Session, session_id: int, query_embedding: list[float]) -> str:
    """
    Retrieve the most relevant documents and messages using semantic search.
    """
    if not query_embedding:
        raise ValueError("query_embedding cannot be empty")

    # Convert query_embedding to a string representation of an array
    query_embedding_str = "ARRAY[" + ",".join(map(str, query_embedding)) + "]::vector"

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

def get_recent_messages(db: Session, session_id: int, limit=10) -> list[Message]:
    statement = select(Message).where(Message.session_id == session_id).order_by(Message.timestamp.desc()).limit(limit)
    results = db.execute(statement).scalars().all()  # Use execute() and scalars() for SQLModel compatibility
    return list(reversed(results))  # Oldest first

def build_context(db: Session, session_id: int, user_message: str) -> str:
    """
    Build a unified context by combining recent messages and relevant documents
    using semantic search.
    """
    # Retrieve recent messages
    recent_msgs = get_recent_messages(db, session_id, limit=5)

    # Retrieve relevant documents using semantic search
    query_embedding = generate_embedding(user_message)
    expected_dimensionality = 768  # Dimensionality of your vector column
    if len(query_embedding) < expected_dimensionality:
        query_embedding += [0.0] * (expected_dimensionality - len(query_embedding))
    elif len(query_embedding) > expected_dimensionality:
        query_embedding = query_embedding[:expected_dimensionality]

    docs_text = retrieve_context(db, session_id, query_embedding)

    # Format recent messages
    formatted_msgs = "\n".join([f"{msg.sender}: {msg.content}" for msg in recent_msgs])

    # Combine into a single context
    context = f"Recent Messages:\n{formatted_msgs}\n\nRelevant Documents:\n{docs_text}"
    return context

def build_prompt(user_message: str, context: str) -> str:
    """
    Build a structured prompt for the LLM using the provided context and user message.
    """
    prompt = "You are a helpful research assistant.\n"
    prompt += f"Context:\n{context}\n\n"
    prompt += f"User: {user_message}\nAssistant:"
    return prompt
