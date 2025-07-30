import logging
import google.generativeai as genai
from settings.settings import settings

# Set up logging
logger = logging.getLogger("gemini_logger")

# Initialize Gemini client only if API key is available
gemini_model = None
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel(settings.GEMINI_MODEL or "gemini-1.5-flash")

async def call_gemini(prompt: str) -> str:
    """
    Call Google Gemini API with the given prompt.
    
    Args:
        prompt (str): The prompt to send to Gemini
        
    Returns:
        str: The response from Gemini
        
    Raises:
        Exception: If API key is not configured or API call fails
    """
    if not gemini_model or not settings.GEMINI_API_KEY:
        raise Exception("Gemini API key not configured")

    try:
        logger.info("🔹 [Gemini] Making API call...")
        
        # Generate content using Gemini
        response = gemini_model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=2048,
                temperature=0.7,
                top_p=0.8,
                top_k=40
            )
        )

        logger.debug(f"🔍 [Gemini] Response: {response}")

        if not response or not response.text:
            raise Exception("Empty response from Gemini")

        result = response.text.strip()
        logger.info("✅ [Gemini] Success")
        return result

    except Exception as e:
        logger.error(f"❌ [Gemini] Error: {str(e)}")
        raise Exception(f"Gemini API call failed: {str(e)}")