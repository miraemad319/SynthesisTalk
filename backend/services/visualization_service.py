import matplotlib.pyplot as plt
import io
import base64
import re
import logging
from collections import Counter
from typing import List, Dict, Any, Tuple

# Import existing text extraction functions
from services.extractor_service import (
    extract_text_from_pdf,
    extract_text_from_txt, 
    extract_text_from_docx,
    extract_text_from_md,
    extract_text_from_rtf
)

logger = logging.getLogger(__name__)

from sqlalchemy.orm import Session
import json

def generate_insights(
    data: List[Dict[str, Any]],
    context: str = "",
    user_message: str = "",
    db: Session = None,
    message_id: int = None
) -> Dict[str, Any]:
    """
    Advanced insight generation that analyzes patterns, trends, and relationships in collected data.
    
    Args:
        data (List[Dict[str, Any]]): A list of dictionaries containing research findings.
        context (str): Additional context from documents and web search.
        user_message (str): The original user query for relevance scoring.
        db (Session, optional): The database session for saving insights.
        message_id (int, optional): The ID of the message to update in the database.
    
    Returns:
        Dict[str, Any]: A comprehensive insights report with patterns, trends, and visualizations.
    """
    try:
        insights_report = {
            "summary": "",
            "key_patterns": [],
            "trends": [],
            "relationships": [],
            "statistics": {},
            "recommendations": [],
            "confidence_score": 0.0,
            "visualizations": []
        }
        
        # Extract all text content for analysis
        all_text = _extract_text_content(data, context)
        
        # 1. Identify key patterns and themes
        patterns = _identify_patterns(all_text, user_message)
        insights_report["key_patterns"] = patterns
        
        # 2. Analyze trends and frequencies
        trends = _analyze_trends(data, all_text)
        insights_report["trends"] = trends
        
        # 3. Find relationships between concepts
        relationships = _find_relationships(all_text, patterns)
        insights_report["relationships"] = relationships
        
        # 4. Generate statistics
        statistics = _generate_statistics(data, all_text)
        insights_report["statistics"] = statistics
        
        # 5. Create visualizations based on findings
        visualizations = _create_insight_visualizations(patterns, trends, statistics)
        insights_report["visualizations"] = visualizations
        
        # 6. Generate recommendations
        recommendations = _generate_recommendations(patterns, trends, relationships, user_message)
        insights_report["recommendations"] = recommendations
        
        # 7. Calculate confidence score
        confidence = _calculate_confidence_score(data, patterns, trends)
        insights_report["confidence_score"] = confidence
        
        # 8. Create comprehensive summary
        summary = _create_insight_summary(insights_report)
        insights_report["summary"] = summary
        
        # Save insights to the database if db and message_id are provided
        if db and message_id:
            message = db.query(Message).filter_by(id=message_id).first()
            if not message:
                raise ValueError("Message not found")
            message.insights = json.dumps(insights_report)
            db.commit()
        
        return insights_report
        
    except Exception as e:
        logger.error(f"Error generating insights: {e}")
        return {
            "summary": "Unable to generate comprehensive insights due to data processing error.",
            "error": str(e)
        }

def _extract_text_content(data: List[Dict[str, Any]], context: str) -> str:
    """Extract all text content from data sources using existing extractors."""
    text_parts = [context] if context else []
    
    for item in data:
        if isinstance(item, dict):
            # Extract from various possible fields
            for field in ['content', 'text', 'snippet', 'description', 'summary']:
                if field in item and isinstance(item[field], str):
                    text_parts.append(item[field])
            
            # Extract from nested structures
            if 'documents' in item and isinstance(item['documents'], list):
                for doc in item['documents']:
                    if isinstance(doc, dict) and 'text' in doc:
                        text_parts.append(doc['text'])
            
            # Extract from file content if present
            if 'file_content' in item and 'file_type' in item:
                try:
                    file_content = item['file_content']
                    file_type = item['file_type'].lower()
                    
                    if isinstance(file_content, bytes):
                        if file_type == 'pdf':
                            extracted_text = extract_text_from_pdf(file_content)
                        elif file_type == 'txt':
                            extracted_text = extract_text_from_txt(file_content)
                        elif file_type == 'docx':
                            extracted_text = extract_text_from_docx(file_content)
                        elif file_type == 'md':
                            extracted_text = extract_text_from_md(file_content)
                        elif file_type == 'rtf':
                            extracted_text = extract_text_from_rtf(file_content)
                        else:
                            extracted_text = str(file_content)
                        
                        if extracted_text:
                            text_parts.append(extracted_text)
                except Exception as e:
                    logger.warning(f"Failed to extract text from file: {e}")
    
    return " ".join(text_parts)

def _identify_patterns(text: str, user_message: str) -> List[Dict[str, Any]]:
    """Identify key patterns and themes in the text."""
    if not text:
        return []
    
    # Normalize text
    text_lower = text.lower()
    user_lower = user_message.lower()
    
    # Extract key terms from user message for relevance
    user_terms = set(re.findall(r'\b\w{3,}\b', user_lower))
    
    # Enhanced stop words list
    stop_words = {
        'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 
        'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 
        'do', 'does', 'did', 'will', 'would', 'could', 'should', 'this', 'that', 
        'these', 'those', 'they', 'them', 'their', 'there', 'then', 'than', 'can', 
        'cannot', 'may', 'might', 'must', 'shall', 'from', 'into', 'through', 'during',
        'before', 'after', 'above', 'below', 'up', 'down', 'out', 'off', 'over', 
        'under', 'again', 'further', 'once', 'here', 'where', 'when', 'why', 'how',
        'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
        'only', 'own', 'same', 'so', 'also', 'just', 'now', 'very', 'well', 'about'
    }
    
    words = re.findall(r'\b\w{4,}\b', text_lower)
    word_freq = Counter([word for word in words if word not in stop_words])
    
    patterns = []
    for word, freq in word_freq.most_common(15):  # Increased to 15 for better coverage
        relevance = 1.0 if word in user_terms else 0.5
        if freq > 2:  # Only include words that appear multiple times
            patterns.append({
                "term": word,
                "frequency": freq,
                "relevance_score": relevance,
                "context_snippets": _extract_context_snippets(text, word, 1)  # Reduced to 1 snippet
            })
    
    return patterns

def _analyze_trends(data: List[Dict[str, Any]], text: str) -> List[Dict[str, Any]]:
    """Analyze trends in the data."""
    trends = []
    
    # Look for temporal indicators
    temporal_words = ['increase', 'decrease', 'grow', 'decline', 'rise', 'fall', 'trend', 'change', 
                     'improved', 'deteriorated', 'enhanced', 'reduced', 'expanded', 'contracted']
    for word in temporal_words:
        if word in text.lower():
            trends.append({
                "type": "temporal",
                "indicator": word,
                "confidence": 0.7  # Removed detailed contexts
            })
    
    # Look for numerical trends
    numbers = re.findall(r'\b\d+(?:\.\d+)?%?\b', text)
    if len(numbers) > 2:
        trends.append({
            "type": "numerical",
            "indicator": "statistical_data",
            "data_points": numbers[:5],  # Reduced to first 5 numbers
            "confidence": 0.8
        })
    
    # Look for comparative language
    comparative_words = ['better', 'worse', 'higher', 'lower', 'greater', 'less', 'more', 'fewer']
    for word in comparative_words:
        if word in text.lower():
            trends.append({
                "type": "comparative",
                "indicator": word,
                "confidence": 0.6  # Removed detailed contexts
            })
    
    return trends

def _find_relationships(text: str, patterns: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Find relationships between concepts."""
    relationships = []
    
    if len(patterns) < 2:
        return relationships
    
    # Look for co-occurrence of pattern terms
    pattern_terms = [p["term"] for p in patterns[:8]]  # Increased to top 8 patterns
    
    for i, term1 in enumerate(pattern_terms):
        for term2 in pattern_terms[i+1:]:
            # Find sentences containing both terms
            sentences = re.split(r'[.!?]+', text)
            co_occurrences = [
                sentence.strip() for sentence in sentences
                if term1 in sentence.lower() and term2 in sentence.lower()
            ]
            
            if co_occurrences:
                # Calculate relationship strength based on frequency and proximity
                strength = len(co_occurrences)
                relationships.append({
                    "term1": term1,
                    "term2": term2,
                    "relationship_type": "co_occurrence",
                    "strength": strength,
                    "confidence": min(strength * 0.2, 1.0)  # Confidence based on co-occurrence frequency
                })
    
    # Sort by strength and return top relationships
    relationships.sort(key=lambda x: x["strength"], reverse=True)
    return relationships[:5]  # Reduced to top 5 relationships

def _generate_statistics(data: List[Dict[str, Any]], text: str) -> Dict[str, Any]:
    """Generate statistical insights."""
    stats = {
        "total_sources": len(data),
        "text_length": len(text),
        "word_count": len(text.split()),
        "sentence_count": len(re.split(r'[.!?]+', text)),
        "unique_words": len(set(re.findall(r'\b\w+\b', text.lower()))),
        "readability_score": _calculate_readability(text),
        "average_word_length": _calculate_average_word_length(text),
        "sentiment_indicators": _detect_sentiment_indicators(text)
    }
    
    # Count different types of sources
    source_types = Counter()
    for item in data:
        if isinstance(item, dict) and 'source' in item:
            source_types[item['source']] += 1
        elif isinstance(item, dict) and 'type' in item:
            source_types[item['type']] += 1
    
    stats["source_distribution"] = dict(source_types)
    
    # Calculate vocabulary richness
    if stats["word_count"] > 0:
        stats["vocabulary_richness"] = stats["unique_words"] / stats["word_count"]
    else:
        stats["vocabulary_richness"] = 0.0
    
    return stats

def _create_insight_visualizations(patterns: List[Dict], trends: List[Dict], statistics: Dict) -> List[Dict[str, Any]]:
    """Create visualizations based on insights."""
    visualizations = []
    
    # Pattern frequency visualization
    if patterns:
        pattern_data = {p["term"]: p["frequency"] for p in patterns[:8]}
        if pattern_data:
            viz_data = generate_bar_chart(pattern_data, "Key Terms Frequency")
            visualizations.append({
                "type": "bar_chart",
                "title": "Key Terms Frequency",
                "data": viz_data,
                "description": "Frequency of important terms found in the research data"
            })
    
    # Source distribution visualization
    if "source_distribution" in statistics and statistics["source_distribution"]:
        viz_data = generate_pie_chart(statistics["source_distribution"], "Source Distribution")
        visualizations.append({
            "type": "pie_chart",
            "title": "Source Distribution",
            "data": viz_data,
            "description": "Distribution of information sources"
        })
    
    # Trends visualization if numerical data exists
    if trends:
        numerical_trends = [t for t in trends if t["type"] == "numerical"]
        if numerical_trends:
            # Create a simple trend visualization using available numerical data
            trend_data = {"Numerical Indicators": [len(t.get("data_points", [])) for t in numerical_trends]}
            if trend_data["Numerical Indicators"]:
                viz_data = generate_line_chart(trend_data, "Numerical Trends")
                visualizations.append({
                    "type": "line_chart",
                    "title": "Numerical Trends",
                    "data": viz_data,
                    "description": "Trends in numerical data found in research"
                })
    
    return visualizations

def _generate_recommendations(patterns: List[Dict], trends: List[Dict], relationships: List[Dict], user_message: str) -> List[str]:
    """Generate actionable recommendations based on insights."""
    recommendations = []
    
    # Based on patterns
    if patterns:
        top_pattern = patterns[0]["term"]
        recommendations.append(f"Focus on '{top_pattern}' as it appears most frequently in your research")
        
        # Recommend exploring high-relevance terms
        relevant_patterns = [p for p in patterns if p["relevance_score"] > 0.8]
        if relevant_patterns and len(relevant_patterns) > 1:
            recommendations.append(f"Pay special attention to: {', '.join([p['term'] for p in relevant_patterns[:3]])}")
    
    # Based on trends
    if trends:
        temporal_trends = [t for t in trends if t["type"] == "temporal"]
        if temporal_trends:
            recommendations.append(f"Monitor {temporal_trends[0]['indicator']} patterns for deeper understanding")
        
        numerical_trends = [t for t in trends if t["type"] == "numerical"]
        if numerical_trends:
            recommendations.append("Analyze the numerical data points for quantitative insights")
    
    # Based on relationships
    if relationships:
        strong_rels = [r for r in relationships if r["strength"] > 1]
        if strong_rels:
            rel = strong_rels[0]
            recommendations.append(f"Explore the connection between '{rel['term1']}' and '{rel['term2']}'")
    
    # General recommendations
    recommendations.append("Consider gathering more diverse sources for comprehensive analysis")
    
    if len(patterns) < 5:
        recommendations.append("Expand your research to identify more key themes and patterns")
    
    return recommendations

def _calculate_confidence_score(data: List[Dict], patterns: List[Dict], trends: List[Dict]) -> float:
    """Calculate confidence score for the insights."""
    score = 0.0
    
    # Base score from data quantity
    score += min(len(data) * 0.1, 0.4)
    
    # Score from pattern strength
    if patterns:
        pattern_strength = sum(p["frequency"] for p in patterns[:3]) / 3 if patterns else 0
        score += min(pattern_strength * 0.03, 0.3)
    
    # Score from trend detection
    score += min(len(trends) * 0.08, 0.2)
    
    # Bonus for pattern relevance
    if patterns:
        relevant_patterns = [p for p in patterns if p["relevance_score"] > 0.8]
        score += min(len(relevant_patterns) * 0.05, 0.1)
    
    # Cap at 1.0
    return min(score, 1.0)

def _create_insight_summary(insights_report: Dict[str, Any]) -> str:
    """Create a comprehensive summary of insights."""
    summary_parts = []
    
    # Patterns summary
    if insights_report["key_patterns"]:
        top_patterns = [p["term"] for p in insights_report["key_patterns"][:3]]
        summary_parts.append(f"Key themes identified: {', '.join(top_patterns)}")
    
    # Trends summary
    if insights_report["trends"]:
        summary_parts.append(f"Detected {len(insights_report['trends'])} trend indicators")
    
    # Relationships summary
    if insights_report["relationships"]:
        summary_parts.append(f"Found {len(insights_report['relationships'])} conceptual relationships")
    
    # Statistics summary
    if insights_report["statistics"]:
        stats = insights_report["statistics"]
        summary_parts.append(f"Analyzed {stats.get('word_count', 0)} words from {stats.get('total_sources', 0)} sources")
    
    # Confidence summary
    confidence = insights_report.get("confidence_score", 0)
    confidence_level = "high" if confidence > 0.7 else "medium" if confidence > 0.4 else "low"
    summary_parts.append(f"Analysis confidence: {confidence_level} ({confidence:.2f})")
    
    return ". ".join(summary_parts) + "."

def _extract_context_snippets(text: str, term: str, max_snippets: int = 3) -> List[str]:
    """Extract context snippets around a term."""
    snippets = []
    sentences = re.split(r'[.!?]+', text)
    
    for sentence in sentences:
        if term.lower() in sentence.lower() and len(snippets) < max_snippets:
            snippets.append(sentence.strip())
    
    return snippets

def _calculate_readability(text: str) -> float:
    """Simple readability score calculation."""
    if not text:
        return 0.0
    
    words = len(text.split())
    sentences = len(re.split(r'[.!?]+', text))
    
    if sentences == 0:
        return 0.0
    
    avg_sentence_length = words / sentences
    # Simple readability approximation (lower is better)
    readability = max(0, 100 - (avg_sentence_length * 2))
    return min(readability, 100) / 100  # Normalize to 0-1

def _calculate_average_word_length(text: str) -> float:
    """Calculate average word length."""
    if not text:
        return 0.0
    
    words = re.findall(r'\b\w+\b', text)
    if not words:
        return 0.0
    
    return sum(len(word) for word in words) / len(words)

def _detect_sentiment_indicators(text: str) -> Dict[str, int]:
    """Detect basic sentiment indicators."""
    positive_words = ['good', 'great', 'excellent', 'positive', 'success', 'beneficial', 'effective', 'improved']
    negative_words = ['bad', 'poor', 'negative', 'failure', 'problem', 'issue', 'decline', 'worse']
    
    text_lower = text.lower()
    positive_count = sum(1 for word in positive_words if word in text_lower)
    negative_count = sum(1 for word in negative_words if word in text_lower)
    
    return {
        "positive_indicators": positive_count,
        "negative_indicators": negative_count,
        "sentiment_ratio": positive_count / (positive_count + negative_count) if (positive_count + negative_count) > 0 else 0.5
    }

# Your existing visualization functions remain the same
def generate_bar_chart(data: Dict[str, int], title: str = "Bar Chart") -> str:
    """
    Generate a bar chart from the given data.

    Args:
        data (Dict[str, int]): A dictionary where keys are labels and values are numbers.
        title (str): The title of the chart.

    Returns:
        str: A base64-encoded string of the chart image.
    """
    labels = list(data.keys())
    values = list(data.values())

    plt.figure(figsize=(10, 6))
    plt.bar(labels, values, color='skyblue')
    plt.title(title)
    plt.xlabel("Categories")
    plt.ylabel("Values")
    plt.tight_layout()

    # Save the plot to a BytesIO object
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    plt.close()

    # Encode the image to base64
    image_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    buf.close()

    return image_base64

def generate_pie_chart(data: Dict[str, int], title: str = "Pie Chart") -> str:
    """
    Generate a pie chart from the given data.

    Args:
        data (Dict[str, int]): A dictionary where keys are labels and values are numbers.
        title (str): The title of the chart.

    Returns:
        str: A base64-encoded string of the chart image.
    """
    labels = list(data.keys())
    values = list(data.values())

    plt.figure(figsize=(8, 8))
    plt.pie(values, labels=labels, autopct='%1.1f%%', startangle=140, colors=plt.cm.Paired.colors)
    plt.title(title)
    plt.tight_layout()

    # Save the plot to a BytesIO object
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    plt.close()

    # Encode the image to base64
    image_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    buf.close()

    return image_base64

def generate_line_chart(data: Dict[str, List[int]], title: str = "Line Chart") -> str:
    """
    Generate a line chart from the given data.

    Args:
        data (Dict[str, List[int]]): A dictionary where keys are labels and values are lists of numbers.
        title (str): The title of the chart.

    Returns:
        str: A base64-encoded string of the chart image.
    """
    plt.figure(figsize=(10, 6))

    for label, values in data.items():
        plt.plot(values, label=label)

    plt.title(title)
    plt.xlabel("X-axis")
    plt.ylabel("Y-axis")
    plt.legend()
    plt.tight_layout()

    # Save the plot to a BytesIO object
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    plt.close()

    # Encode the image to base64
    image_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    buf.close()

    return image_base64