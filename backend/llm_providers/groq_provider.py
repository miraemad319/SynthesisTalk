import logging
import requests
from settings.settings import settings

# Set up logging
logger = logging.getLogger(__name__)

def call_groq(prompt: str) -> str:
    if not settings.GROQ_API_KEY:
        raise Exception("Groq API key not configured")
    
    try:
        logger.info("🔹 [Groq] Making API call...")
        
        url = f"{settings.GROQ_BASE_URL}/v1/chat/completions" if settings.GROQ_BASE_URL else "https://api.groq.com/openai/v1/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json; charset=utf-8",
        }
        
        payload = {
            "model": settings.GROQ_MODEL or "llama3-70b-8192",
            "messages": [
                {"role": "system", "content": "You are a helpful research assistant."},
                {"role": "user", "content": prompt},
            ],
            "max_tokens": 500,
            "temperature": 0.7,
        }
        
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        
        logger.info(f"Groq response status: {response.status_code}")
        if response.status_code != 200:
            logger.error(f"Groq response text: {response.text}")
        
        response.raise_for_status()
        
        response_data = response.json()
        
        if not response_data.get("choices") or not response_data["choices"][0].get("message", {}).get("content"):
            raise Exception("Empty response from Groq")
            
        result = response_data["choices"][0]["message"]["content"].strip()
        logger.info("✅ [Groq] Success")
        return result
        
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ [Groq] Request error: {str(e)}")
        raise Exception(f"Groq API request failed: {str(e)}")
    except Exception as e:
        logger.error(f"❌ [Groq] Error: {str(e)}")
        raise Exception(f"Groq API call failed: {str(e)}")
