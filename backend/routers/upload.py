from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlmodel import Session
from services.db_session import get_session
from services.extractor import extract_text_from_pdf, extract_text_from_txt, extract_text_from_docx
from services.document_service import save_document

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".docx"}

@router.post("/upload")
async def upload_file(
    session_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_session)
):
    filename = file.filename.lower()
    if not any(filename.endswith(ext) for ext in ALLOWED_EXTENSIONS):
        raise HTTPException(status_code=400, detail="Unsupported file type.")

    contents = await file.read()

    try:
        if filename.endswith(".pdf"):
            text = extract_text_from_pdf(contents)
        elif filename.endswith(".txt"):
            text = extract_text_from_txt(contents)
        elif filename.endswith(".docx"):
            text = extract_text_from_docx(contents)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract text: {str(e)}")

    doc = save_document(db, session_id, file.filename, text)
    return {"document_id": doc.id, "text_preview": text[:500]}