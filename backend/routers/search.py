"""
Search Router
Provides endpoints for web search functionality using unified services
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List
from sqlmodel import Session
from models.api_models import (
    WebSearchRequest,
    DocumentSearchRequest, 
    CombinedSearchRequest,
    WebSearchResponse,
    ProvidersResponse
)
from services.unified_search_service import search_service
from services.db_session import get_session
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/web", response_model=dict)
async def web_search(request: WebSearchRequest):
    """
    Perform web search using specified provider or auto-select best available
    """
    try:
        result = await search_service.web_search(
            query=request.query,
            provider=request.search_provider,
            num_results=request.num_results
        )
        
        return {
            "success": result["success"],
            "query": request.query,
            "provider_used": result["provider_used"],
            "results": result["results"],
            "metadata": result["metadata"]
        }
        
    except Exception as e:
        logger.error(f"Web search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/documents", response_model=dict)
async def document_search(request: DocumentSearchRequest, db: Session = Depends(get_session)):
    """
    Search through uploaded documents in a session
    """
    try:
        result = await search_service.document_search(
            query=request.query,
            session_id=request.session_id,
            db=db,
            limit=request.limit
        )
        
        return {
            "success": result["success"],
            "query": request.query,
            "session_id": request.session_id,
            "results": result["results"],
            "metadata": result["metadata"]
        }
        
    except Exception as e:
        logger.error(f"Document search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/combined", response_model=dict)
async def combined_search(request: CombinedSearchRequest, db: Session = Depends(get_session)):
    """
    Perform combined search across web and documents
    """
    try:
        # Perform web search if requested
        web_results = []
        if request.include_web:
            web_results = await search_service.web_search(
                query=request.query,
                provider=request.search_provider,
                num_results=request.web_results_limit
            )

        # Perform document search if requested
        doc_results = []
        if request.include_documents:
            doc_results = await search_service.document_search(
                query=request.query,
                session_id=request.session_id,
                db=db,
                limit=request.doc_results_limit
            )

        # Combine results
        combined_results = {
            "web_results": web_results.get("results", []),
            "doc_results": doc_results.get("results", [])
        }

        return {
            "success": True,
            "query": request.query,
            "session_id": request.session_id,
            "results": combined_results,
            "metadata": {
                "web_metadata": web_results.get("metadata", {}),
                "doc_metadata": doc_results.get("metadata", {})
            }
        }

    except Exception as e:
        logger.error(f"Combined search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
