import logging
from settings.settings import settings
from langchain_openai import ChatOpenAI

# Set up logging
logger = logging.getLogger("openai_logger")

# Initialize OpenAI client only if API key is available
openai_client = None
if settings.OPENAI_API_KEY:
    openai_client = ChatOpenAI(openai_api_key=settings.OPENAI_API_KEY, model_name=settings.OPENAI_MODEL or "gpt-4o")

async def call_openai(prompt: str) -> str:
    if not openai_client or not settings.OPENAI_API_KEY:
        raise Exception("OpenAI API key not configured")

    try:
        logger.info("🔹 [OpenAI] Making API call...")
        response = await openai_client.agenerate(
            messages=[
                {"role": "system", "content": "You are a helpful research assistant."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=500,
            temperature=0.7,
        )

        logger.debug(f"🔍 [OpenAI] Response: {response}")

        if not response or not response.choices or not response.choices[0].message.content:
            raise Exception("Empty response from OpenAI")

        result = response.choices[0].message.content.strip()
        logger.info("✅ [OpenAI] Success")
        return result

    except Exception as e:
        logger.error(f"❌ [OpenAI] Error: {str(e)}")
        raise Exception(f"OpenAI API call failed: {str(e)}")
