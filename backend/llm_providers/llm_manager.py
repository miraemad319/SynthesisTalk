import logging
from .openai_provider import call_openai
from .groq_provider import call_groq
from .ngu_provider import call_ngu

# Set up logging
logger = logging.getLogger(__name__)

def get_llm_response(prompt: str) -> str:
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
            result = provider_func(prompt)
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

# Debug endpoint to check API configuration
# @router.get("/debug/api-status")
# def debug_api_status():
#     """Debug endpoint to check which APIs are configured"""
#     status = {
#         "openai": {
#             "configured": bool(settings.OPENAI_API_KEY),
#             "model": settings.OPENAI_MODEL or "gpt-4o"
#         },
#         "groq": {
#             "configured": bool(settings.GROQ_API_KEY),
#             "model": settings.GROQ_MODEL or "llama3-70b-8192",
#             "base_url": settings.GROQ_BASE_URL or "https://api.groq.com"
#         },
#         "ngu": {
#             "configured": bool(settings.NGU_API_KEY and settings.NGU_BASE_URL),
#             "model": settings.NGU_MODEL or "qwen2.5-coder:7b",
#             "base_url": settings.NGU_BASE_URL
#         }
#     }
#     return status
