// upload.js in api folder
import axios from "./axios";

export async function uploadPDF(file, sessionId) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axios.post(
    `/upload?session_id=${sessionId}`,  // relative URL only
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
}

export async function fetchDocuments(sessionId) {
  const response = await axios.get(`/documents?session_id=${sessionId}`);
  return response.data;
}
