from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from typing import List
from datetime import datetime
from openai import OpenAI
import requests

from models.db_models import Message, Document, Session as ResearchSession
from services.db_session import get_session
from settings.settings import settings

router = APIRouter()

# Request body schema
class ChatRequest(BaseModel):
    session_id: int
    user_message: str

# Response schema
class ChatResponse(BaseModel):
    bot_message: str

def get_recent_messages(db: Session, session_id: int, limit=10) -> List[Message]:
    statement = select(Message).where(Message.session_id == session_id).order_by(Message.timestamp.desc()).limit(limit)
    results = db.exec(statement).all()
    return list(reversed(results))  # oldest first

def get_documents_text(db: Session, session_id: int) -> str:
    statement = select(Document).where(Document.session_id == session_id)
    docs = db.exec(statement).all()
    return "\n\n".join([doc.text for doc in docs])

def build_prompt(user_message: str, messages: List[Message], docs_text: str) -> str:
    prompt = "You are a helpful research assistant.\n"
    if docs_text:
        prompt += f"Here are some documents related to the discussion:\n{docs_text}\n\n"
    prompt += "Conversation history:\n"
    for msg in messages:
        prompt += f"{msg.sender}: {msg.content}\n"
    prompt += f"User: {user_message}\nAssistant:"
    return prompt

from openai import OpenAI

client = OpenAI(api_key=settings.OPENAI_API_KEY)

def call_openai(prompt: str) -> str:
    try:
        print("🔹 [OpenAI] Calling with prompt:", prompt[:100])
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL or "gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful research assistant."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=500,
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print("❌ OpenAI error:", e)
        raise e

def call_groq(prompt: str) -> str:
    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": "You are a helpful research assistant."},
                    {"role": "user", "content": prompt},
                ],
                "max_tokens": 500,
                "temperature": 0.7,
            }
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        print("Groq Error:", e)
        raise e

def call_ngu(prompt: str) -> str:
    try:
        response = requests.post(
            f"{settings.NGU_BASE_URL}/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.NGU_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": settings.NGU_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 500,
                "temperature": 0.7
            }
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        print("NGU Error:", e)
        return f"NGU LLM call failed: {str(e)}"

@router.post("/session/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest, db: Session = Depends(get_session)):
    session_obj = db.get(ResearchSession, request.session_id)
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    user_msg = Message(session_id=request.session_id, sender="user", content=request.user_message)
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    recent_msgs = get_recent_messages(db, request.session_id, limit=5)
    docs_text = get_documents_text(db, request.session_id)[:2000]
    prompt = build_prompt(request.user_message, recent_msgs, docs_text)

    # Multi-LLM fallback with logs
    try:
        print("🔹 Trying OpenAI...")
        bot_reply = call_openai(prompt)
    except Exception as e:
        print(f"⚠️ OpenAI failed: {e}")
        try:
            print("🔹 Trying Groq...")
            bot_reply = call_groq(prompt)
        except Exception as e:
            print(f"⚠️ Groq failed: {e}")
            print("🔹 Trying NGU...")
            bot_reply = call_ngu(prompt)

    bot_msg = Message(session_id=request.session_id, sender="assistant", content=bot_reply)
    db.add(bot_msg)
    db.commit()

    return ChatResponse(bot_message=bot_reply)


@router.get("/session/{session_id}/messages")
def get_messages(session_id: int, db: Session = Depends(get_session)):
    statement = select(Message).where(Message.session_id == session_id).order_by(Message.timestamp.asc())
    return db.exec(statement).all()

