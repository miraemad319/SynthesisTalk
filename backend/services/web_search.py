"""
Web Search Service for retrieving current information from the internet
"""
import asyncio
import aiohttp
import logging
from typing import List, Dict, Any, Optional
from settings.settings import settings

logger = logging.getLogger(__name__)

async def search_web(query: str, num_results: int = 5) -> List[Dict[str, Any]]:
    """
    Search the web using DuckDuckGo API (free alternative)
    """
    try:
        # Using DuckDuckGo Instant Answer API (free)
        url = "https://api.duckduckgo.com/"
        params = {
            "q": query,
            "format": "json",
            "no_redirect": "1",
            "no_html": "1",
            "skip_disambig": "1"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Log raw response for debugging
                    logger.debug(f"DuckDuckGo response: {data}")
                    logger.debug(f"DuckDuckGo raw response: {data}")

                    results = []
                    
                    # Extract instant answer if available
                    if data.get("Abstract"):
                        results.append({
                            "title": data.get("Heading", "Instant Answer"),
                            "url": data.get("AbstractURL", "Link not available"),
                            "snippet": data.get("Abstract", ""),
                            "source": "duckduckgo_instant"
                        })

                    # Extract related topics
                    for topic in data.get("RelatedTopics", [])[:num_results-len(results)]:
                        if isinstance(topic, dict) and "Text" in topic:
                            results.append({
                                "title": topic.get("FirstURL", "").split("/")[-1].replace("_", " "),
                                "url": topic.get("FirstURL", "Link not available"),
                                "snippet": topic.get("Text", ""),
                                "source": "duckduckgo_related"
                            })
                    
                    # If we don't have enough results, that's ok - return what we have
                    logger.info(f"Web search for '{query}' returned {len(results)} results")
                    return results[:num_results]
                else:
                    logger.error(f"Web search API returned status {response.status}")
                    return []
    
    except Exception as e:
        logger.error(f"Web search failed: {e}")
        # Return a fallback message
        return [{
            "title": "Search Unavailable",
            "url": "",
            "snippet": f"Web search for '{query}' is currently unavailable. Please try again later.",
            "source": "error"
        }]

async def search_with_custom_api(query: str, num_results: int = 5) -> List[Dict[str, Any]]:
    """
    Search using custom API if available (prioritized by reliability and cost)
    Configure in settings.py
    """
    # Try APIs in order of preference
    if hasattr(settings, 'GOOGLE_SEARCH_API_KEY') and settings.GOOGLE_SEARCH_API_KEY:
        return await search_google_custom(query, num_results)
    elif hasattr(settings, 'SERPAPI_API_KEY') and settings.SERPAPI_API_KEY:
        return await search_serpapi(query, num_results)
    else:
        return await search_web(query, num_results)

async def search_google_custom(query: str, num_results: int = 5) -> List[Dict[str, Any]]:
    """Google Custom Search API implementation"""
    try:
        if not hasattr(settings, 'GOOGLE_SEARCH_API_KEY') or not settings.GOOGLE_SEARCH_API_KEY:
            return await search_web(query, num_results)
        
        # Check if CSE ID is configured
        search_engine_id = getattr(settings, 'GOOGLE_CSE_ID', None)
        if not search_engine_id:
            logger.info("Google Custom Search Engine ID not configured, falling back to DuckDuckGo")
            return await search_web(query, num_results)
        
        url = settings.GOOGLE_URL or "https://www.googleapis.com/customsearch/v1"
        params = {
            "key": settings.GOOGLE_SEARCH_API_KEY,
            "cx": search_engine_id,
            "q": query,
            "num": min(num_results, 10)  # Max 10 per request
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    results = []
                    
                    # Log raw response for debugging
                    logger.debug(f"Google Custom Search response: {data}")
                    logger.debug(f"Google Custom Search raw response: {data}")

                    for item in data.get("items", []):
                        results.append({
                            "title": item.get("title", ""),
                            "url": item.get("link", ""),
                            "snippet": item.get("snippet", ""),
                            "source": "google_custom"
                        })
                    
                    logger.info(f"Google Custom Search for '{query}' returned {len(results)} results")
                    return results
                else:
                    logger.error(f"Google Custom Search API returned status {response.status}")
                    return await search_web(query, num_results)
    
    except Exception as e:
        logger.error(f"Google Custom Search failed: {e}")
        return await search_web(query, num_results)

async def search_serpapi(query: str, num_results: int = 5) -> List[Dict[str, Any]]:
    """SerpAPI Search implementation - Most reliable commercial option"""
    try:
        if not hasattr(settings, 'SERPAPI_API_KEY') or not settings.SERPAPI_API_KEY:
            return await search_web(query, num_results)

        url = settings.SERPAPI_URL or "https://serpapi.com/search"
        params = {
            "q": query,
            "api_key": settings.SERPAPI_API_KEY,
            "engine": "google",
            "num": min(num_results, 10)
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    results = []
                    
                    # Log raw response for debugging
                    logger.debug(f"SerpAPI response: {data}")
                    logger.debug(f"SerpAPI raw response: {data}")

                    for item in data.get("organic_results", []):
                        results.append({
                            "title": item.get("title", ""),
                            "url": item.get("link", ""),
                            "snippet": item.get("snippet", ""),
                            "source": "serpapi"
                        })
                    
                    logger.info(f"SerpAPI search for '{query}' returned {len(results)} results")
                    return results
                else:
                    logger.error(f"SerpAPI returned status {response.status}")
                    return await search_web(query, num_results)
    
    except Exception as e:
        logger.error(f"SerpAPI search failed: {e}")
        return await search_web(query, num_results)
