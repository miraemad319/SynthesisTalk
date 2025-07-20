"""
Unified Search Service
Centralizes all search functionality to eliminate redundancy
"""
import logging
from typing import Dict, List, Any, Optional
from sqlmodel import Session
from services.web_search import (
    search_web,
    search_with_custom_api,
    search_google_custom,
    search_serpapi
)
from services.document_service import search_documents
from models.api_models import WebSearchResponse

logger = logging.getLogger(__name__)

class SearchService:
    """Unified search service that handles all search operations"""
    
    def __init__(self):
        self.provider_functions = {
            "duckduckgo": search_web,
            "google": search_google_custom,
            "serpapi": search_serpapi,
            "auto": search_with_custom_api
        }
    
    async def web_search(
        self, 
        query: str, 
        provider: str = "auto", 
        num_results: int = 5,
        priority_sources: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Perform web search with specified provider
        """
        try:
            # Handle enforce mode with priority sources
            if priority_sources:
                return await self._enforce_web_search(query, provider, num_results, priority_sources)
            
            # Regular search
            search_func = self.provider_functions.get(provider, search_with_custom_api)
            raw_results = await search_func(query, num_results)

            # Format results to include title, link, and snippet
            formatted_results = [
                {
                    "title": str(result.get("title", "No Title")),
                    "link": str(result.get("url", result.get("link", "No Link"))),  # Ensure 'link' is populated
                    "snippet": str(result.get("snippet", "No Snippet"))
                }
                for result in raw_results
            ]

            # Ensure sources_used are strings
            sources_used = [
                f"{result['title']} ({result['link']})"
                for result in formatted_results
            ]
            
            return {
                "success": True,
                "provider_used": provider,
                "results": formatted_results,
                "metadata": {
                    "total_results": len(formatted_results),
                    "search_type": "web"
                }
            }
            
        except Exception as e:
            logger.error(f"Web search failed for provider {provider}: {e}")
            return {
                "success": False,
                "provider_used": provider,
                "results": [],
                "error": str(e)
            }
    
    async def document_search(
        self, 
        query: str, 
        session_id: int, 
        db: Session,
    ) -> Dict[str, Any]:
        """
        Search through uploaded documents
        """
        try:
            results = await search_documents(
                query=query,
                session_id=session_id,
                db=db
            )
            
            return {
                "success": True,
                "results": results,
                "metadata": {
                    "total_results": len(results) if results else 0,
                    "search_type": "documents"
                }
            }
            
        except Exception as e:
            logger.error(f"Document search failed: {e}")
            return {
                "success": False,
                "results": [],
                "error": str(e)
            }
    
    async def combined_search(
        self,
        query: str,
        session_id: Optional[int] = None,
        db: Optional[Session] = None,
        include_web: bool = True,
        include_documents: bool = True,
        web_provider: str = "auto",
        web_results_limit: int = 5,
    ) -> Dict[str, Any]:
        """
        Perform combined search across web and documents
        """
        results = {
            "web_results": [],
            "document_results": []
        }
        
        # Web search
        if include_web:
            web_result = await self.web_search(query, web_provider, web_results_limit)
            if web_result["success"]:
                results["web_results"] = web_result["results"]
        
        # Document search
        if include_documents and session_id and db:
            doc_result = await self.document_search(query, session_id, db)
            if doc_result["success"]:
                results["document_results"] = doc_result["results"]
        
        return {
            "success": True,
            "results": results,
            "metadata": {
                "web_results_count": len(results["web_results"]),
                "document_results_count": len(results["document_results"]),
                "search_provider": web_provider,
                "included_sources": {
                    "web": include_web,
                    "documents": include_documents
                }
            }
        }
    
    async def _enforce_web_search(
        self, 
        query: str, 
        provider: str, 
        num_results: int,
        priority_sources: List[str]
    ) -> Dict[str, Any]:
        """
        Enforce web search with priority fallback
        """
        results = []
        used_provider = None
        
        # Try providers in priority order
        for prov in priority_sources:
            if prov == provider or provider == "auto":
                try:
                    search_func = self.provider_functions.get(prov)
                    if search_func:
                        results = await search_func(query, num_results)
                        used_provider = prov
                        
                        # Check if we got good results
                        if results and len(results) > 0 and not all(r.get("title") == "Search Unavailable" for r in results):
                            break
                            
                except Exception as e:
                    logger.warning(f"Provider {prov} failed: {e}")
                    continue
        
        # Final fallback to DuckDuckGo
        if not results:
            results = await search_web(query, num_results)
            used_provider = "duckduckgo_fallback"
        
        return {
            "success": True,
            "enforced": True,
            "provider_used": used_provider,
            "results": results,
            "metadata": {
                "total_results": len(results),
                "requested_provider": provider,
                "priority_sources": priority_sources,
                "forced_web_search": True
            }
        }
    
    def get_available_providers(self) -> Dict[str, Any]:
        """
        Get available search providers and their status
        """
        from settings.settings import settings
        
        providers = {
            "duckduckgo": {
                "name": "DuckDuckGo",
                "type": "free",
                "available": True,
                "description": "Free search API with basic results"
            },
            "google": {
                "name": "Google Custom Search",
                "type": "paid",
                "available": bool(getattr(settings, 'GOOGLE_SEARCH_API_KEY', None) and 
                                  getattr(settings, 'GOOGLE_CSE_ID', None)),
                "description": "Google Custom Search Engine (requires API key and CSE ID)"
            },
            "serpapi": {
                "name": "SerpAPI",
                "type": "paid",
                "available": bool(getattr(settings, 'SERPAPI_API_KEY', None)),
                "description": "Professional search API with high-quality results"
            }
        }
        
        # Determine recommended provider
        recommended = "duckduckgo"
        if providers["serpapi"]["available"]:
            recommended = "serpapi"
        elif providers["google"]["available"]:
            recommended = "google"
        
        return {
            "providers": providers,
            "recommended": recommended,
            "auto_selection_order": ["serpapi", "google", "duckduckgo"]
        }
    
    async def test_provider(self, provider: str, query: str = "python programming") -> Dict[str, Any]:
        """
        Test a specific search provider
        """
        try:
            search_func = self.provider_functions.get(provider, search_with_custom_api)
            results = await search_func(query, 3)
            
            return {
                "success": True,
                "provider": provider,
                "test_query": query,
                "results": results,
                "status": "working" if results and len(results) > 0 else "no_results"
            }
            
        except Exception as e:
            logger.error(f"Provider test failed for {provider}: {e}")
            return {
                "success": False,
                "provider": provider,
                "test_query": query,
                "error": str(e),
                "status": "error"
            }

# Global search service instance
search_service = SearchService()
