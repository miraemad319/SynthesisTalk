import logging
from settings.settings import settings
from langchain_openai import ChatOpenAI

# Set up logging
logger = logging.getLogger(__name__)

# Initialize OpenAI client only if API key is available
openai_client = None
if settings.OPENAI_API_KEY:
    openai_client = ChatOpenAI(openai_api_key=settings.OPENAI_API_KEY, model_name=settings.OPENAI_MODEL or "gpt-4o")

async def call_openai(prompt: str) -> str:
    if not openai_client or not settings.OPENAI_API_KEY:
        raise Exception("OpenAI API key not configured")

    try:
        logger.info("🔹 [OpenAI] Making API call...")
        
        # Use the correct LangChain method and format
        from langchain_core.messages import HumanMessage, SystemMessage
        
        messages = [
            SystemMessage(content="You are a helpful research assistant."),
            HumanMessage(content=prompt)
        ]
        
        response = await openai_client.ainvoke(messages)
        
        logger.debug(f"🔍 [OpenAI] Response: {response}")

        if not response or not response.content:
            raise Exception("Empty response from OpenAI")

        result = response.content.strip()
        logger.info("✅ [OpenAI] Success")
        return result

    except Exception as e:
        logger.error(f"❌ [OpenAI] Error: {str(e)}")
        raise Exception(f"OpenAI API call failed: {str(e)}")