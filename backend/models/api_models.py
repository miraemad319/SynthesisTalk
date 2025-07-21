"""
Shared API Models
Common request/response models to eliminate redundancy across routers
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum

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

class CombinedSearchRequest(BaseSearchRequest):
    """Combined search request model"""
    include_web: Optional[bool] = True
    include_documents: Optional[bool] = True
    web_results_limit: Optional[int] = 5
    search_provider: Optional[str] = "auto"

# Reasoning Models
class ReasoningType(Enum):
    CHAIN_OF_THOUGHT = "cot"
    REACT = "react"
    HYBRID = "hybrid"

class QuestionType(Enum):
    FACTUAL = "factual"
    ANALYTICAL = "analytical"
    CREATIVE = "creative"
    PROCEDURAL = "procedural"
    COMPARATIVE = "comparative"

# Chat Models
class ChatRequest(BaseRequest):
    """Chat request model"""
    message: str
    session_id: int
    enable_web_search: bool = True
    enable_document_search: bool = True
    enable_reasoning: bool = False
    reasoning_type: Optional[ReasoningType] = ReasoningType.HYBRID

class ChatResponse(BaseResponse):
    """Chat response model"""
    response: str
    session_id: int
    tool_calls_made: List[str] = []
    reasoning_output: Optional[str] = None
    question_type: Optional[str] = None
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

# Structured Summary Models
class StructuredSummaryRequest(BaseRequest):
    """Request model for structured summaries"""
    session_id: int
    text: Optional[str] = None # Text to summarize
    format: str = Field(..., pattern="^(bullet|paragraph|insight)$", description="Summary format: 'bullet', 'paragraph', 'insight'")
