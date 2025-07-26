import logging
import asyncio
from .openai_provider import call_openai
from .groq_provider import call_groq
from .ngu_provider import call_ngu

# Set up logging
logger = logging.getLogger(__name__)

async def get_llm_response(prompt: str) -> str:
    """Try LLM providers in order with proper error handling"""

    # List of LLM providers to try in order
    providers = [
        ("OpenAI", call_openai),
        ("Groq", call_groq),
        ("NGU", call_ngu)
    ]

    errors = []

    for provider_name, provider_func in providers:
        try:
            logger.info(f"🔄 Trying {provider_name}...")
            # Await the provider function if it's asynchronous
            if asyncio.iscoroutinefunction(provider_func):
                result = await provider_func(prompt)
            else:
                result = provider_func(prompt)

            logger.debug(f"🔍 {provider_name} Result: {result}")

            logger.info(f"✅ {provider_name} succeeded")
            return result
        except Exception as e:
            error_msg = f"{provider_name} failed: {str(e)}"
            logger.warning(f"⚠️ {error_msg}")
            errors.append(error_msg)

    # If all providers fail, return a helpful error message
    error_summary = "; ".join(errors)
    logger.error(f"❌ All LLM providers failed: {error_summary}")

    return f"I apologize, but I'm currently unable to process your request due to technical issues with the AI services. Please try again later. Error details: {error_summary}"

