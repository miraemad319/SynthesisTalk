from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from datetime import datetime
from sqlalchemy import Column
from pgvector.sqlalchemy import Vector

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

    embedding: Optional["Embedding"] = Relationship(back_populates="messages")

class Document(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="session.id")
    embedding_id: Optional[int] = Field(default=None, foreign_key="embedding.id")
    filename: str
    text: str

    embedding: Optional["Embedding"] = Relationship(back_populates="documents")

class Summary(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="session.id")
    summary_type: str  # e.g. "bullet", "paragraph", "insight"
    text: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Embedding(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="session.id")
    text: str
    embedding: list[float] = Field(sa_column=Column(Vector(1536)))  # TODDO: Adjust dimension based on your embedding model
    created_at: datetime = Field(default_factory=datetime.utcnow)

    messages: list[Message] = Relationship(back_populates="embedding")
    documents: list[Document] = Relationship(back_populates="embedding")
