"""
Advanced Reasoning Service for SynthesisTalk
Implements Chain of Thought (CoT) and ReAct reasoning patterns
"""
import logging
import re
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
from models.api_models import ReasoningType, QuestionType
import asyncio
from services.self_correction_service import self_correct
from services.tool_manager import execute_tool
from sqlmodel import Session

logger = logging.getLogger("reasoning_logger")

def classify_question(user_message: str) -> QuestionType:
    """Classify the type of question to choose appropriate reasoning strategy"""
    message_lower = user_message.lower()
    
    # Analytical keywords
    analytical_keywords = ["analyze", "compare", "contrast", "evaluate", "assess", "why", "how", "explain"]
    if any(keyword in message_lower for keyword in analytical_keywords):
        return QuestionType.ANALYTICAL
    
    # Procedural keywords
    procedural_keywords = ["how to", "step", "process", "procedure", "method", "guide"]
    if any(keyword in message_lower for keyword in procedural_keywords):
        return QuestionType.PROCEDURAL
    
    # Creative keywords
    creative_keywords = ["create", "generate", "design", "brainstorm", "imagine", "suggest"]
    if any(keyword in message_lower for keyword in creative_keywords):
        return QuestionType.CREATIVE
    
    # Comparative keywords
    comparative_keywords = ["vs", "versus", "better", "difference", "similar", "compare"]
    if any(keyword in message_lower for keyword in comparative_keywords):
        return QuestionType.COMPARATIVE
    
    # Default to factual
    return QuestionType.FACTUAL

def extract_key_concepts(text: str) -> List[str]:
    """Extract key concepts from text for reasoning"""
    # Remove common stop words and extract meaningful terms
    stop_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"}
    
    # Simple extraction - can be enhanced with NLP libraries
    words = re.findall(r'\b\w+\b', text.lower())
    key_concepts = [word for word in words if len(word) > 3 and word not in stop_words]
    
    # Return unique concepts, limited to most relevant
    return list(set(key_concepts))[:10]

async def react_reasoning_with_correction(
    context: str, 
    user_message: str, 
    available_tools: List[str],
    db: Session = None  # Add db parameter
) -> str:
    """Enhanced ReAct reasoning with self-correction"""
    try:
        # Generate initial reasoning - use await here
        initial_reasoning = await react_reasoning(context, user_message, available_tools, db)
        
        # Apply self-correction for ReAct reasoning
        corrected_reasoning = await self_correct(
            query=f"Context: {context}\nQuestion: {user_message}\nTools: {available_tools}",
            initial_response=initial_reasoning,
            task_type="reasoning"
        )
        
        logger.info("Applied self-correction to ReAct reasoning")
        return corrected_reasoning
        
    except Exception as e:
        logger.error(f"Enhanced ReAct reasoning failed: {e}")
        # Fallback to original reasoning - also use await here
        return await react_reasoning(context, user_message, available_tools, db)

async def chain_of_thought_reasoning_with_correction(
    context: str, 
    user_message: str, 
    question_type: Optional[QuestionType] = None,
    db: Session = None
) -> str:
    """Enhanced CoT reasoning with self-correction"""
    try:
        # Generate initial reasoning
        initial_reasoning = await chain_of_thought_reasoning(context, user_message, question_type, db)
        
        # Apply self-correction specifically for reasoning
        corrected_reasoning = await self_correct(
            query=f"Context: {context}\nQuestion: {user_message}",
            initial_response=initial_reasoning,
            task_type="reasoning"
        )
        
        logger.info("Applied self-correction to CoT reasoning")
        return corrected_reasoning
        
    except Exception as e:
        logger.error(f"Enhanced CoT reasoning failed: {e}")
        # Fallback to original reasoning
        return await chain_of_thought_reasoning(context, user_message, question_type, db)

async def hybrid_reasoning_with_correction(
    context: str, 
    user_message: str, 
    available_tools: List[str],
    db: Session = None
) -> str:
    """Enhanced Hybrid reasoning with self-correction"""
    try:
        # Generate initial reasoning
        initial_reasoning = await hybrid_reasoning(context, user_message, available_tools, db)
        
        # Apply self-correction for hybrid reasoning
        corrected_reasoning = await self_correct(
            query=f"Context: {context}\nQuestion: {user_message}\nTools: {available_tools}",
            initial_response=initial_reasoning,
            task_type="reasoning"
        )
        
        logger.info("Applied self-correction to Hybrid reasoning")
        return corrected_reasoning
        
    except Exception as e:
        logger.error(f"Enhanced Hybrid reasoning failed: {e}")
        # Fallback to original reasoning
        return await hybrid_reasoning(context, user_message, available_tools, db)

async def chain_of_thought_reasoning(context: str, user_message: str, question_type: Optional[QuestionType] = None, db: Session = None) -> str:
    """
    Enhanced Chain of Thought reasoning with structured thinking process and tool execution
    """
    if question_type is None:
        question_type = classify_question(user_message)
    
    key_concepts = extract_key_concepts(user_message)
    
    reasoning_steps = []
    executed_tools = []
    available_tools = ["web_search", "document_search", "calculation", "analysis"]
    
    # Step 1: Problem Understanding
    reasoning_steps.append("Problem Analysis:")
    reasoning_steps.append(f"   - Question type: {question_type.value}")
    reasoning_steps.append(f"   - Key concepts: {', '.join(key_concepts[:5])}")
    reasoning_steps.append(f"   - User intent: {_analyze_intent(user_message)}")
    
    # Step 2: Context Analysis
    if context and context.strip():
        reasoning_steps.append("\nContext Analysis:")
        context_insights = _analyze_context(context)
        for insight in context_insights:
            reasoning_steps.append(f"   - {insight}")
    
    # NEW STEP: Tool Selection and Execution
    reasoning_steps.append("\nInformation Gathering:")
    
    # Check if additional information is needed
    if not _assess_context_sufficiency(context, user_message):
        reasoning_steps.append("   - Available context seems insufficient")
        reasoning_steps.append("   - Additional information may be needed")
        
        # Recommend and execute tools
        recommended_tools = _recommend_tools(user_message, available_tools)
        for tool in recommended_tools[:1]:  # Limit to 1 tool for CoT
            reasoning_steps.append(f"   - Executing tool: {tool}")
            
            if tool == "web_search" and db:
                # Execute web search
                try:
                    tool_result = await execute_tool("web_search", {"query": user_message}, db)
                    executed_tools.append(tool_result)
                    
                    if tool_result.get("success") and tool_result.get("results"):
                        reasoning_steps.append("   - Web search provided relevant information")
                    else:
                        reasoning_steps.append("   - Web search did not yield useful results")
                except Exception as e:
                    reasoning_steps.append(f"   - Error executing web search: {str(e)}")
            
            elif tool == "document_search" and db:
                # Extract session_id
                session_id = None
                try:
                    import re
                    session_match = re.search(r"session_id:\s*(\d+)", context)
                    if session_match:
                        session_id = int(session_match.group(1))
                except:
                    pass
                
                # Execute document search
                try:
                    tool_result = await execute_tool("document_search", {"query": user_message, "session_id": session_id}, db)
                    executed_tools.append(tool_result)
                    
                    if tool_result.get("success") and tool_result.get("results"):
                        reasoning_steps.append("   - Document search found relevant materials")
                    else:
                        reasoning_steps.append("   - Document search did not find useful materials")
                except Exception as e:
                    reasoning_steps.append(f"   - Error executing document search: {str(e)}")
    else:
        reasoning_steps.append("   - Available context appears sufficient")
        reasoning_steps.append("   - Proceeding with analysis of existing information")
    
    # Step 3: Reasoning Strategy
    reasoning_steps.append(f"\nReasoning Strategy for {question_type.value} question:")
    strategy_steps = _get_reasoning_strategy(question_type)
    for step in strategy_steps:
        reasoning_steps.append(f"   {step}")
    
    # Step 4: Information Synthesis
    reasoning_steps.append("\nInformation Synthesis:")
    reasoning_steps.append("   - Combining context knowledge with question requirements")
    reasoning_steps.append("   - Identifying gaps or areas needing clarification")
    reasoning_steps.append("   - Structuring response for clarity and completeness")
    
    return "\n".join(reasoning_steps)

async def react_reasoning(context: str, user_message: str, available_tools: Optional[List[str]] = None, db: Session = None) -> str:
    """
    Enhanced ReAct (Reasoning + Acting) with real tool execution
    """
    
    if available_tools is None:
        available_tools = ["web_search", "document_search", "calculation", "analysis"]
    
    question_type = classify_question(user_message)
    key_concepts = extract_key_concepts(user_message)
    
    react_steps = []
    executed_tools = []
    
    # Thought: Initial reasoning
    react_steps.append("Thought 1: Problem Assessment")
    react_steps.append(f"   The user is asking about: {', '.join(key_concepts[:3])}")
    react_steps.append(f"   This appears to be a {question_type.value} question.")
    
    # Action: Select tools and execute them
    react_steps.append("\nAction 1: Information Gathering")
    recommended_tools = _recommend_tools(user_message, available_tools)
    
    for tool in recommended_tools[:2]:  # Limit to 2 tools to avoid excessive API calls
        react_steps.append(f"   Executing tool: {tool}")
        
        if tool == "web_search":
            # Actually execute web search
            tool_result = await execute_tool("web_search", {"query": user_message}, db)
            executed_tools.append(tool_result)
            
            # Add observation about search results
            react_steps.append("\nObservation 1: Web Search Results")
            if tool_result["success"] and "results" in tool_result:
                if len(tool_result["results"]) > 0:
                    for idx, result in enumerate(tool_result["results"][:3]):
                        react_steps.append(f"   - {result.get('title', 'Untitled')}: {result.get('snippet', 'No snippet')}")
                else:
                    react_steps.append("   No relevant web search results found")
            else:
                react_steps.append("   Web search failed or returned no results")
        
        elif tool == "document_search":
            # Actually execute document search
            session_id = None  # This needs to be passed from the chat endpoint
            if "session_id" in context:
                # Try to extract session_id from context
                try:
                    import re
                    session_match = re.search(r"session_id:\s*(\d+)", context)
                    if session_match:
                        session_id = int(session_match.group(1))
                except:
                    pass
            
            tool_result = await execute_tool("document_search", {"query": user_message, "session_id": session_id}, db)
            executed_tools.append(tool_result)
            
            # Add observation about document results
            react_steps.append("\nObservation 2: Document Search Results")
            if tool_result["success"] and "results" in tool_result:
                if len(tool_result["results"]) > 0:
                    for idx, result in enumerate(tool_result["results"][:3]):
                        react_steps.append(f"   - Document '{result.get('filename')}': {result.get('snippet', 'No snippet')[:100]}...")
                else:
                    react_steps.append("   No relevant document results found")
            else:
                react_steps.append("   Document search failed or returned no results")
    
    # Thought: Process the information
    react_steps.append("\nThought 2: Information Analysis")
    react_steps.append("   Based on the gathered information:")
    if executed_tools:
        react_steps.append("   - Information was successfully gathered from tools")
        react_steps.append("   - The results provide relevant context for answering the question")
    else:
        react_steps.append("   - No tools were successfully executed")
        react_steps.append("   - Will rely on existing knowledge to answer the question")
    
    # Action: Final reasoning
    react_steps.append("\nAction 3: Formulating Response")
    react_steps.append("   - Synthesizing information from all sources")
    react_steps.append("   - Structuring a comprehensive answer")
    react_steps.append("   - Ensuring all aspects of the question are addressed")
    
    return "\n".join(react_steps)

async def hybrid_reasoning(context: str, user_message: str, available_tools: Optional[List[str]] = None, db: Session = None) -> str:
    """
    Combines CoT and ReAct for complex reasoning tasks with tool execution
    """
    if available_tools is None:
        available_tools = ["web_search", "document_search", "calculation", "analysis"]
        
    question_type = classify_question(user_message)
    
    # Use ReAct for information gathering and CoT for analysis
    if question_type in [QuestionType.FACTUAL, QuestionType.PROCEDURAL]:
        # Start with ReAct for gathering, then CoT for processing
        react_part = await react_reasoning(context, user_message, available_tools, db)
        cot_part = await chain_of_thought_reasoning(context, user_message, question_type, db)
        
        return f"HYBRID REASONING APPROACH\n\nPhase 1 - Information & Action Planning:\n{react_part}\n\nPhase 2 - Analytical Reasoning:\n{cot_part}"
    else:
        # Start with CoT for analysis, then ReAct for validation
        cot_part = await chain_of_thought_reasoning(context, user_message, question_type, db)
        react_part = await react_reasoning(context, user_message, available_tools, db)
        
        return f"HYBRID REASONING APPROACH\n\nPhase 1 - Analytical Reasoning:\n{cot_part}\n\nPhase 2 - Action & Validation:\n{react_part}"

# Helper functions
def _analyze_intent(user_message: str) -> str:
    """Analyze user intent from message"""
    if "?" in user_message:
        return "Seeking information or explanation"
    elif any(word in user_message.lower() for word in ["help", "how", "guide"]):
        return "Requesting assistance or guidance"
    elif any(word in user_message.lower() for word in ["analyze", "compare", "evaluate"]):
        return "Requesting analysis or evaluation"
    else:
        return "General inquiry or discussion"

def _analyze_context(context: str) -> List[str]:
    """Analyze context and extract key insights"""
    insights = []
    
    if len(context) > 1000:
        insights.append("Rich context available with detailed information")
    elif len(context) > 300:
        insights.append("Moderate context available")
    else:
        insights.append("Limited context available")
    
    # Check for different types of content
    if "===" in context:
        insights.append("Multiple information sources present")
    if "📄" in context:
        insights.append("Document-based information available")
    if "🌐" in context:
        insights.append("Web-based information available")
    
    return insights

def _get_reasoning_strategy(question_type: QuestionType) -> List[str]:
    """Get reasoning strategy based on question type"""
    strategies = {
        QuestionType.FACTUAL: [
            "1. Identify specific facts needed",
            "2. Cross-reference available information",
            "3. Provide accurate, verified information"
        ],
        QuestionType.ANALYTICAL: [
            "1. Break down the problem into components",
            "2. Analyze relationships and patterns",
            "3. Synthesize insights and conclusions"
        ],
        QuestionType.PROCEDURAL: [
            "1. Identify the goal or outcome",
            "2. Break down into sequential steps",
            "3. Provide clear, actionable instructions"
        ],
        QuestionType.CREATIVE: [
            "1. Generate multiple perspectives",
            "2. Combine ideas in novel ways",
            "3. Provide innovative solutions"
        ],
        QuestionType.COMPARATIVE: [
            "1. Identify comparison criteria",
            "2. Analyze similarities and differences",
            "3. Provide balanced evaluation"
        ]
    }
    return strategies.get(question_type, strategies[QuestionType.FACTUAL])

def _assess_context_sufficiency(context: str, user_message: str) -> bool:
    """Assess if available context is sufficient for the question"""
    if not context or len(context.strip()) < 50:
        return False
    
    key_concepts = extract_key_concepts(user_message)
    context_lower = context.lower()
    
    # Check if at least 30% of key concepts are mentioned in context
    concept_matches = sum(1 for concept in key_concepts if concept in context_lower)
    return concept_matches >= len(key_concepts) * 0.3

def _recommend_tools(user_message: str, available_tools: List[str]) -> List[str]:
    """Recommend tools based on user message"""
    recommendations = []
    message_lower = user_message.lower()
    
    if any(word in message_lower for word in ["current", "latest", "recent", "now", "today"]):
        if "web_search" in available_tools:
            recommendations.append("web_search")
    
    if any(word in message_lower for word in ["document", "file", "pdf", "text"]):
        if "document_search" in available_tools:
            recommendations.append("document_search")
    
    if any(word in message_lower for word in ["calculate", "compute", "math", "number"]):
        if "calculation" in available_tools:
            recommendations.append("calculation")
    
    return recommendations if recommendations else ["web_search"]

def _get_information_strategy(question_type: QuestionType) -> List[str]:
    """Get information gathering strategy based on question type"""
    strategies = {
        QuestionType.FACTUAL: [
            "Search for authoritative sources",
            "Verify information accuracy",
            "Get the most current data"
        ],
        QuestionType.ANALYTICAL: [
            "Gather comprehensive background information",
            "Look for multiple perspectives",
            "Find relevant case studies or examples"
        ],
        QuestionType.PROCEDURAL: [
            "Find step-by-step guides",
            "Look for best practices",
            "Search for common pitfalls to avoid"
        ],
        QuestionType.CREATIVE: [
            "Gather inspiration from various sources",
            "Look for innovative approaches",
            "Find diverse examples and ideas"
        ],
        QuestionType.COMPARATIVE: [
            "Gather information on all items being compared",
            "Find standardized comparison criteria",
            "Look for expert evaluations"
        ]
    }
    return strategies.get(question_type, strategies[QuestionType.FACTUAL])