from typing import List, Union
import re
import asyncio
from services.document_service import get_documents_text
from llm_providers.llm_manager import get_llm_response
from sqlmodel import Session

# Import extractor functions individually to handle potential import errors
try:
    from services.extractor_service import extract_text_from_pdf
except ImportError:
    extract_text_from_pdf = None

try:
    from services.extractor_service import extract_text_from_txt
except ImportError:
    extract_text_from_txt = None

try:
    from services.extractor_service import extract_text_from_docx
except ImportError:
    extract_text_from_docx = None

try:
    from services.extractor_service import extract_text_from_md
except ImportError:
    extract_text_from_md = None

try:
    from services.extractor_service import extract_text_from_rtf
except ImportError:
    extract_text_from_rtf = None

def generate_summary(
    input_data: Union[str, bytes], 
    format: str, 
    db: Session = None, 
    session_id: int = None, 
    input_type: str = "text", 
    file_type: str = None
) -> str:
    """
    Generate a summary in the specified format.

    Args:
        input_data (Union[str, bytes]): The text to summarize or file bytes.
        format (str): The format of the summary ('bullet', 'paragraph', 'insight').
        db (Session, optional): Database session for fetching documents. Defaults to None.
        session_id (int, optional): Session ID for fetching documents. Defaults to None.
        input_type (str): Type of input ('text', 'file', 'documents'). Defaults to 'text'.
        file_type (str, optional): Type of file ('pdf', 'txt', 'docx', 'md', 'rtf'). Required if input_type is 'file'.

    Returns:
        str: The generated summary.
    """
    if input_type == "file":
        if not file_type:
            raise ValueError("File type must be specified when input_type is 'file'.")

        # Extract text based on file type
        if file_type in ['pdf']:
            if extract_text_from_pdf:
                text = extract_text_from_pdf(input_data)
            else:
                raise ValueError("PDF extraction not available")
        elif file_type in ['txt']:
            if extract_text_from_txt:
                text = extract_text_from_txt(input_data)
            else:
                # Fallback for text files
                text = input_data.decode('utf-8')
        elif file_type in ['docx']:
            if extract_text_from_docx:
                text = extract_text_from_docx(input_data)
            else:
                raise ValueError("DOCX extraction not available")
        elif file_type in ['md', 'markdown']:
            if extract_text_from_md:
                text = extract_text_from_md(input_data)
            else:
                # Fallback for markdown files
                text = input_data.decode('utf-8')
        elif file_type in ['rtf']:
            if extract_text_from_rtf:
                text = extract_text_from_rtf(input_data)
            else:
                raise ValueError("RTF extraction not available")
        else:
            # Try to decode as text for unknown file types
            try:
                text = input_data.decode('utf-8')
            except:
                raise ValueError(f"Unsupported file type: {file_type}")

    elif input_type == "documents":
        if not db or not session_id:
            raise ValueError("Database session and session ID are required for summarizing documents.")
        # Fetch text from documents
        text = get_documents_text(db, session_id)
    else:
        # Assume input_data is plain text
        text = input_data

    # Validate that we have text to summarize
    if not text or not text.strip():
        raise ValueError("No text content found to summarize")

    # Generate summary based on the format
    if format == "bullet":
        return generate_bullet_summary(text)
    elif format == "paragraph":
        return generate_paragraph_summary(text)
    elif format == "insight":
        return generate_insight_summary(text)
    else:
        raise ValueError("Unsupported summary format. Choose 'bullet', 'paragraph', or 'insight'.")

def generate_bullet_summary(text: str) -> str:
    """Generate a bullet-point summary using LLM."""
    # Clean the text to remove excessive whitespace
    clean_text = re.sub(r'\s+', ' ', text.strip())
    
    # Truncate text if too long (to avoid token limits)
    if len(clean_text) > 4000:
        clean_text = clean_text[:4000] + "..."
    
    prompt = f"""Please create a bullet-point summary of the following text. Focus on the key points and main ideas. Ignore any copyright notices, headers, or metadata. Return 5-7 bullet points starting with '•'.

Text to summarize:
{clean_text}

Summary (bullet points):"""

    try:
        # Get LLM response synchronously
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        summary = loop.run_until_complete(get_llm_response(prompt))
        loop.close()
        
        # Clean and format the response
        if summary and summary.strip():
            return summary.strip()
        else:
            return "• No meaningful content available for summary"
            
    except Exception as e:
        # Fallback to simple text processing if LLM fails
        return generate_simple_bullet_summary(clean_text)

def generate_paragraph_summary(text: str) -> str:
    """Generate a paragraph summary using LLM."""
    # Clean the text
    clean_text = re.sub(r'\s+', ' ', text.strip())
    
    # Truncate text if too long
    if len(clean_text) > 4000:
        clean_text = clean_text[:4000] + "..."
    
    prompt = f"""Please create a coherent paragraph summary of the following text. Focus on the main ideas and key concepts. Ignore any copyright notices, headers, or metadata. Write it as a flowing narrative summary in 3-4 sentences.

Text to summarize:
{clean_text}

Summary (paragraph):"""

    try:
        # Get LLM response synchronously
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        summary = loop.run_until_complete(get_llm_response(prompt))
        loop.close()
        
        # Clean and format the response
        if summary and summary.strip():
            return summary.strip()
        else:
            return "No meaningful content available for summary."
            
    except Exception as e:
        # Fallback to simple text processing if LLM fails
        return generate_simple_paragraph_summary(clean_text)

def generate_insight_summary(text: str) -> str:
    """Generate insights using LLM."""
    # Clean the text
    clean_text = re.sub(r'\s+', ' ', text.strip())
    
    # Truncate text if too long
    if len(clean_text) > 4000:
        clean_text = clean_text[:4000] + "..."
    
    prompt = f"""Please extract 3-5 key insights from the following text. Focus on important concepts, definitions, principles, or main ideas. Ignore any copyright notices, headers, or metadata. Format as numbered insights (1., 2., 3., etc.).

Text to analyze:
{clean_text}

Key insights:"""

    try:
        # Get LLM response synchronously
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        insights = loop.run_until_complete(get_llm_response(prompt))
        loop.close()
        
        # Clean and format the response
        if insights and insights.strip():
            return insights.strip()
        else:
            return "1. No specific insights found in the text."
            
    except Exception as e:
        # Fallback to simple text processing if LLM fails
        return generate_simple_insight_summary(clean_text)

# Fallback functions for when LLM is unavailable
def generate_simple_bullet_summary(text: str) -> str:
    """Simple fallback bullet summary without LLM."""
    sentences = re.split(r'[.!?]+', text)
    filtered_sentences = []
    
    for sentence in sentences:
        sentence = sentence.strip()
        if (len(sentence.split()) >= 4 and 
            not re.search(r'^\s*(copyright|@|email|page \d+)', sentence.lower())):
            filtered_sentences.append(sentence)
            if len(filtered_sentences) >= 5:
                break
    
    if not filtered_sentences:
        return "• No meaningful content available for summary"
    
    return "\n".join(f"• {sentence}" for sentence in filtered_sentences)

def generate_simple_paragraph_summary(text: str) -> str:
    """Simple fallback paragraph summary without LLM."""
    sentences = re.split(r'[.!?]+', text)
    meaningful_sentences = []
    
    for sentence in sentences:
        sentence = sentence.strip()
        if (len(sentence.split()) >= 4 and 
            not re.search(r'^\s*(copyright|@|email|page \d+)', sentence.lower())):
            meaningful_sentences.append(sentence)
            if len(meaningful_sentences) >= 3:
                break
    
    if not meaningful_sentences:
        return "No meaningful content available for summary."
    
    return f"Summary: {'. '.join(meaningful_sentences)}."

def generate_simple_insight_summary(text: str) -> str:
    """Simple fallback insight summary without LLM."""
    sentences = re.split(r'[.!?]+', text)
    insights = []
    
    for sentence in sentences:
        sentence = sentence.strip()
        if (len(sentence.split()) >= 5 and 
            not re.search(r'^\s*(copyright|@|email|page \d+)', sentence.lower())):
            insights.append(sentence)
            if len(insights) >= 3:
                break
    
    if not insights:
        return "1. No specific insights found in the text."
    
    return "\n".join(f"{i+1}. {insight}." for i, insight in enumerate(insights))