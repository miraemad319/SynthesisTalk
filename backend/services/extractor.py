import fitz
from io import BytesIO
from docx import Document as DocxDocument

def extract_text_from_pdf(file_bytes: bytes) -> str:
    text = ""
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        for page in doc:
            text += page.get_text()
    return text

def extract_text_from_txt(file_bytes: bytes) -> str:
    return file_bytes.decode("utf-8")

def extract_text_from_docx(file_bytes: bytes) -> str:
    file_stream = BytesIO(file_bytes)
    doc = DocxDocument(file_stream)
    full_text = []
    for para in doc.paragraphs:
        full_text.append(para.text)
    return "\n".join(full_text)
