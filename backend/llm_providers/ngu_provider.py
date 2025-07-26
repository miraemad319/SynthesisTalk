import logging
import httpx
from settings.settings import settings

# Set up logging
logger = logging.getLogger("ngu_logger")

async def call_ngu(prompt: str) -> str:
    if not settings.NGU_API_KEY or not settings.NGU_BASE_URL:
        raise Exception("NGU API key or base URL not configured")

    try:
        logger.info("🔹 [NGU] Making API call...")

        url = f"{settings.NGU_BASE_URL}/v1/chat/completions"

        headers = {
            "Authorization": f"Bearer {settings.NGU_API_KEY}",
            "Content-Type": "application/json; charset=utf-8"
        }

        payload = {
            "model": settings.NGU_MODEL or "qwen2.5-coder:7b",
            "messages": [
                {"role": "system", "content": "You are a helpful research assistant."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 500,
            "temperature": 0.7
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload, timeout=30)

        logger.info(f"NGU response status: {response.status_code}")
        response.raise_for_status()

        response_data = response.json()

        if not response_data.get("choices") or not response_data["choices"][0].get("message", {}).get("content"):
            raise Exception("Empty response from NGU")

        result = response_data["choices"][0]["message"]["content"].strip()
        logger.info("✅ [NGU] Success")
        return result

    except httpx.RequestError as e:
        logger.error(f"❌ [NGU] Request error: {str(e)}")
        raise Exception(f"NGU API request failed: {str(e)}")
    except Exception as e:
        logger.error(f"❌ [NGU] Error: {str(e)}")
        raise Exception(f"NGU API call failed: {str(e)}")
