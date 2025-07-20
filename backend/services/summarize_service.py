from typing import List
import re
from services.extractor_service import (
    extract_text_from_pdf,
    extract_text_from_txt,
    extract_text_from_docx,
    extract_text_from_md,
    extract_text_from_rtf
)
from sqlmodel import Session

def generate_summary(input_data: str, format: str, db: Session = None, session_id: int = None, input_type: str = "text", file_type: str = None) -> str:
    """
    Generate a summary in the specified format.

    Args:
        input_data (str): The text to summarize, file path, or file bytes.
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
        if file_type == "pdf":
            text = extract_text_from_pdf(input_data)
        elif file_type == "txt":
            text = extract_text_from_txt(input_data)
        elif file_type == "docx":
            text = extract_text_from_docx(input_data)
        elif file_type == "md":
            text = extract_text_from_md(input_data)
        elif file_type == "rtf":
            text = extract_text_from_rtf(input_data)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

    elif input_type == "documents":
        if not db or not session_id:
            raise ValueError("Database session and session ID are required for summarizing documents.")
        # Fetch text from documents
        text = get_documents_text(db, session_id)
    else:
        # Assume input_data is plain text
        text = input_data

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
    """Generate a bullet-point summary."""
    # Split the text into sentences and create bullet points for key sentences
    sentences = text.split('.')
    bullets = []
    for sentence in sentences:
        if sentence.strip():
            bullets.append(f"- {sentence.strip()}")
            if len(bullets) == 5:  # Stop after 5 sentences
                break
    return "\n".join(bullets)

def generate_paragraph_summary(text: str) -> str:
    """Generate a paragraph summary."""
    # Use the first few sentences to create a concise paragraph
    sentences = text.split('.')
    paragraph_sentences = []
    for sentence in sentences:
        if sentence.strip():
            paragraph_sentences.append(sentence.strip())
            if len(paragraph_sentences) == 3:  # Stop after 3 sentences
                break
    paragraph = " ".join(paragraph_sentences)
    return f"In summary, {paragraph}."

def generate_insight_summary(text: str) -> str:
    """Generate an insight-based summary."""
    # Extract key insights by identifying important phrases or keywords
    keyword_pattern = re.compile(r"\b(important|key|notable|critical)\b", re.IGNORECASE)
    insights = []
    for sentence in text.split('.'):
        if keyword_pattern.search(sentence):
            insights.append(sentence.strip())
    if not insights:
        insights = ["No specific insights found in the text."]
    return "\n".join(f"Key insight: {insight}" for insight in insights)
