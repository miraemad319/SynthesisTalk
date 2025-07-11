from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlmodel import Session
from services.db_session import get_session
from services.extractor_service import extract_text_from_pdf, extract_text_from_txt, extract_text_from_docx, extract_text_from_md, extract_text_from_rtf
from services.document_service import save_document
from typing import List

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".docx", ".md", ".rtf"}  # Added Markdown (.md) and Rich Text Format (.rtf)

@router.post("/upload")
async def upload_files(
    session_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_session)
):
    uploaded_files = []

    for file in files:
        filename = file.filename.lower()
        if not any(filename.endswith(ext) for ext in ALLOWED_EXTENSIONS):
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {filename}")

        contents = await file.read()

        try:
            if filename.endswith(".pdf"):
                text = extract_text_from_pdf(contents)
            elif filename.endswith(".txt"):
                text = extract_text_from_txt(contents)
            elif filename.endswith(".docx"):
                text = extract_text_from_docx(contents)
            elif filename.endswith(".md"):
                text = contents.decode("utf-8")  # Markdown files are plain text
            elif filename.endswith(".rtf"):
                import pyth.plugins.rtf15.reader as rtf_reader
                import pyth.plugins.plaintext.writer as plaintext_writer
                doc = rtf_reader.read(contents)
                text = plaintext_writer.write(doc).getvalue()
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported file type: {filename}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to extract text from {filename}: {str(e)}")

        doc = save_document(db, session_id, file.filename, text)
        uploaded_files.append({"document_id": doc.id, "filename": file.filename, "text_preview": text[:500]})

    return {"uploaded_files": uploaded_files}
