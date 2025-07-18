"""
Shared API Models
Common request/response models to eliminate redundancy across routers
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

# Base Models
class BaseRequest(BaseModel):
    """Base request model with common fields"""
    pass

class BaseResponse(BaseModel):
    """Base response model with common fields"""
    success: bool
    metadata: Optional[Dict[str, Any]] = None

# Search Models
class BaseSearchRequest(BaseRequest):
    """Base search request with common search fields"""
    query: str
    session_id: Optional[int] = None

class WebSearchRequest(BaseSearchRequest):
    """Web search request model"""
    num_results: Optional[int] = 5
    search_provider: Optional[str] = "auto"  # auto, duckduckgo, google, serpapi

class WebSearchResponse(BaseModel):
    """Individual search result"""
    title: str
    url: str
    snippet: str
    source: str = "web"

class DocumentSearchRequest(BaseSearchRequest):
    """Document search request model"""
    session_id: int  # Required for document search
    limit: Optional[int] = 5

class CombinedSearchRequest(BaseSearchRequest):
    """Combined search request model"""
    include_web: Optional[bool] = True
    include_documents: Optional[bool] = True
    web_results_limit: Optional[int] = 5
    doc_results_limit: Optional[int] = 3
    search_provider: Optional[str] = "auto"

# Chat Models
class ChatRequest(BaseRequest):
    """Chat request model"""
    message: str
    session_id: int
    enable_web_search: bool = True
    enable_document_search: bool = True

class ChatResponse(BaseResponse):
    """Chat response model"""
    response: str
    session_id: int
    tool_calls_made: List[str] = []
    metadata: Dict[str, Any] = {}

# Common Metadata Models
class SearchMetadata(BaseModel):
    """Standard search metadata"""
    total_results: int
    search_type: str
    provider_used: Optional[str] = None
    query_time: Optional[float] = None

class ExportMetadata(BaseModel):
    """Standard export metadata"""
    file_size: Optional[int] = None
    export_time: Optional[str] = None
    content_type: str
    file_extension: str

class ProviderInfo(BaseModel):
    """Search provider information"""
    name: str
    type: str  # free, paid
    available: bool
    description: str

class ProvidersResponse(BaseResponse):
    """Search providers response"""
    providers: Dict[str, ProviderInfo]
    recommended: str
    auto_selection_order: List[str]

# Tool Models
class ToolExecutionRequest(BaseRequest):
    """Tool execution request"""
    tool_name: str
    parameters: Dict[str, Any]

class ToolExecutionResponse(BaseResponse):
    """Tool execution response"""
    tool_name: str
    result: Any
    execution_time: Optional[float] = None

# Session Models
class SessionRequest(BaseRequest):
    """Session creation request"""
    name: Optional[str] = None

class SessionResponse(BaseResponse):
    """Session response"""
    session_id: int
    name: str
    created_at: str

# Upload Models
class UploadResponse(BaseResponse):
    """File upload response"""
    document_id: int
    filename: str
    file_size: int
    processing_status: str

