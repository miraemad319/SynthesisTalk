import logging
from typing import Dict, Any, List
from services.web_search import search_web
from services.document_service import search_documents
from sqlmodel import Session

logger = logging.getLogger("tool_service")
async def execute_tool(tool_name: str, parameters: Dict[str, Any], db: Session = None) -> Dict[str, Any]:
    """Execute a tool and return its results"""
    logger.info(f"Executing tool: {tool_name} with parameters: {parameters}")
    
    try:
        if tool_name == "web_search":
            from services.web_search import search_web
            query = parameters.get("query", "")
            results = await search_web(query)
            logger.info(f"Web search results: {len(results) if results else 0} items")
            return {
                "tool": "web_search",
                "success": True,
                "results": results
            }
        
        elif tool_name == "document_search":
            from services.document_service import search_documents
            query = parameters.get("query", "")
            session_id = parameters.get("session_id")
            results = await search_documents(query, session_id, db)
            logger.info(f"Document search results: {len(results) if results else 0} items")
            return {
                "tool": "document_search",
                "success": True, 
                "results": results
            }
        
        else:
            logger.warning(f"Unknown tool: {tool_name}")
            return {
                "tool": tool_name,
                "success": False,
                "error": f"Unknown tool: {tool_name}"
            }
    except Exception as e:
        logger.error(f"Error executing tool {tool_name}: {str(e)}")
        return {
            "tool": tool_name,
            "success": False,
            "error": str(e)
        }