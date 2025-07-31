import re

def strip_markdown(text: str) -> str:
    """Remove markdown formatting from text."""
    if not text:
        return text
        
    # Remove bold/italic formatting
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)  # Remove **bold**
    text = re.sub(r'\*(.*?)\*', r'\1', text)      # Remove *italic*
    text = re.sub(r'__(.*?)__', r'\1', text)      # Remove __bold__
    text = re.sub(r'_(.*?)_', r'\1', text)        # Remove _italic_
    
    # Remove headers
    text = re.sub(r'^#{1,6}\s+(.+)$', r'\1', text, flags=re.MULTILINE)
    
    # Remove blockquotes
    text = re.sub(r'^>\s+(.+)$', r'\1', text, flags=re.MULTILINE)
    
    # Remove code blocks but keep content
    text = re.sub(r'```[\w]*\n(.*?)\n```', r'\1', text, flags=re.DOTALL)
    text = re.sub(r'`(.*?)`', r'\1', text)
    
    # Convert markdown lists to plain text
    text = re.sub(r'^\s*[-*+]\s+(.+)$', r'• \1', text, flags=re.MULTILINE)  # Convert - * + lists to • 
    text = re.sub(r'^\s*\d+\.\s+(.+)$', r'\1', text, flags=re.MULTILINE)   # Keep numbered lists but remove numbers
    
    # Remove link formatting
    text = re.sub(r'\[(.*?)\]\((.*?)\)', r'\1 (\2)', text)
    
    return text