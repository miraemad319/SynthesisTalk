from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from datetime import datetime
from sqlalchemy import Column
from pgvector.sqlalchemy import Vector
from typing import Dict, Any
from sqlalchemy.types import JSON

class Session(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Message(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="session.id")
    embedding_id: Optional[int] = Field(default=None, foreign_key="embedding.id")
    sender: str
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    thumbs_up: Optional[bool] = None  # User feedback: thumbs up
    thumbs_down: Optional[bool] = None  # User feedback: thumbs down
    embedding: Optional["Embedding"] = Relationship(back_populates="messages")
    insights: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))

class Document(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="session.id")
    embedding_id: Optional[int] = Field(default=None, foreign_key="embedding.id")
    filename: str
    text: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    embedding: Optional["Embedding"] = Relationship(back_populates="documents")

class Embedding(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="session.id")
    text: str
    embedding: list[float] = Field(sa_column=Column(Vector(384)))  # Dimension for all-MiniLM-L6-v2 model
    created_at: datetime = Field(default_factory=datetime.utcnow)
    messages: list[Message] = Relationship(back_populates="embedding")
    documents: list[Document] = Relationship(back_populates="embedding")

class Notes(SQLModel, table=True):
    id: int = Field(primary_key=True)
    session_id: int = Field(foreign_key="session.id")
    message_id: Optional[int] = Field(foreign_key="message.id")
    content: str
    tags: Optional[str]  # Comma-separated tags for organization
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)
