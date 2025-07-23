from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from services.export_service import export_findings
import os

router = APIRouter()

@router.post("/export")
def export_response(message_id: int, file_path: str, format: str = "pdf"):
    """
    Export a bot response to a user-specified file path.

    Args:
        message_id (int): The ID of the message to export.
        file_path (str): The file path where the document will be saved.
        format (str): The format to export ("pdf" or "word").

    Returns:
        FileResponse: The exported file.
    """
    if format not in ["pdf", "word"]:
        raise HTTPException(status_code=400, detail="Unsupported format. Choose 'pdf' or 'word'.")

    # Fetch the message content from the database
    message = db_session.query(Message).filter_by(id=message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found.")

    # Ensure the directory exists
    directory = os.path.dirname(file_path)
    if not os.path.exists(directory):
        os.makedirs(directory)

    # Prepare the insights report structure
    insights_report = {
        "summary": message.content,
        "key_patterns": [],
        "trends": [],
        "relationships": []
    }

    # Export the content
    export_findings(insights_report, file_path, format)

    # Return the file as a response
    return FileResponse(file_path, filename=os.path.basename(file_path), media_type="application/octet-stream")