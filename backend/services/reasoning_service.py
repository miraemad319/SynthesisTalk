"""
Advanced Reasoning Service for SynthesisTalk
Implements Chain of Thought (CoT) and ReAct reasoning patterns
"""
import logging
import re
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
from models.api_models import ReasoningType, QuestionType

logger = logging.getLogger(__name__)


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

def chain_of_thought_reasoning(context: str, user_message: str, question_type: Optional[QuestionType] = None) -> str:
    """
    Enhanced Chain of Thought reasoning with structured thinking process
    """
    if question_type is None:
        question_type = classify_question(user_message)
    
    key_concepts = extract_key_concepts(user_message)
    
    reasoning_steps = []
    
    # Step 1: Problem Understanding
    reasoning_steps.append("🎯 **Problem Analysis:**")
    reasoning_steps.append(f"   - Question type: {question_type.value}")
    reasoning_steps.append(f"   - Key concepts: {', '.join(key_concepts[:5])}")
    reasoning_steps.append(f"   - User intent: {_analyze_intent(user_message)}")
    
    # Step 2: Context Analysis
    if context and context.strip():
        reasoning_steps.append("\n📚 **Context Analysis:**")
        context_insights = _analyze_context(context)
        for insight in context_insights:
            reasoning_steps.append(f"   - {insight}")
    
    # Step 3: Reasoning Strategy
    reasoning_steps.append(f"\n🧠 **Reasoning Strategy for {question_type.value} question:**")
    strategy_steps = _get_reasoning_strategy(question_type)
    for step in strategy_steps:
        reasoning_steps.append(f"   {step}")
    
    # Step 4: Information Synthesis
    reasoning_steps.append("\n🔄 **Information Synthesis:**")
    reasoning_steps.append("   - Combining context knowledge with question requirements")
    reasoning_steps.append("   - Identifying gaps or areas needing clarification")
    reasoning_steps.append("   - Structuring response for clarity and completeness")
    
    return "\n".join(reasoning_steps)

def react_reasoning(context: str, user_message: str, available_tools: Optional[List[str]] = None) -> str:
    """
    Enhanced ReAct (Reasoning + Acting) with tool selection and iterative thinking
    """
    if available_tools is None:
        available_tools = ["web_search", "document_search", "analysis"]
    
    question_type = classify_question(user_message)
    key_concepts = extract_key_concepts(user_message)
    
    react_steps = []
    
    # Thought: Initial reasoning
    react_steps.append("🤔 **Thought 1: Problem Assessment**")
    react_steps.append(f"   The user is asking about: {', '.join(key_concepts[:3])}")
    react_steps.append(f"   This appears to be a {question_type.value} question.")
    
    react_steps.append("\n🎯 **Action 1: Information Gathering**")
    recommended_tools = _recommend_tools(user_message, available_tools)
    react_steps.append(f"   Need to gather more information using: {', '.join(recommended_tools)}")
        
    react_steps.append("\n🤔 **Thought 2: Information Strategy**")
    react_steps.append("   Based on the question type, I should:")
    strategy = _get_information_strategy(question_type)
    for step in strategy:
        react_steps.append(f"   - {step}")
    
    # Action: Processing available information
    react_steps.append("\n🔍 **Action 2: Information Processing**")
    react_steps.append("   - Analyzing available context and information")
    react_steps.append("   - Identifying key relationships and patterns")
    react_steps.append("   - Structuring information for comprehensive response")
    
    # Thought: Final reasoning
    react_steps.append("\n🤔 **Thought 3: Response Strategy**")
    react_steps.append("   Now I can provide a comprehensive answer by:")
    react_steps.append("   - Using the processed information")
    react_steps.append("   - Addressing the specific question type")
    react_steps.append("   - Ensuring clarity and completeness")
    
    return "\n".join(react_steps)

def hybrid_reasoning(context: str, user_message: str, available_tools: Optional[List[str]] = None) -> str:
    """
    Combines CoT and ReAct for complex reasoning tasks
    """
    question_type = classify_question(user_message)
    
    # Use ReAct for information gathering and CoT for analysis
    if question_type in [QuestionType.FACTUAL, QuestionType.PROCEDURAL]:
        # Start with ReAct for gathering, then CoT for processing
        react_part = react_reasoning(context, user_message, available_tools)
        cot_part = chain_of_thought_reasoning(context, user_message, question_type)
        
        return f"**🔄 HYBRID REASONING APPROACH**\n\n**Phase 1 - Information & Action Planning:**\n{react_part}\n\n**Phase 2 - Analytical Reasoning:**\n{cot_part}"
    else:
        # Start with CoT for analysis, then ReAct for validation
        cot_part = chain_of_thought_reasoning(context, user_message, question_type)
        react_part = react_reasoning(context, user_message, available_tools)
        
        return f"**🔄 HYBRID REASONING APPROACH**\n\n**Phase 1 - Analytical Reasoning:**\n{cot_part}\n\n**Phase 2 - Action & Validation:**\n{react_part}"

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