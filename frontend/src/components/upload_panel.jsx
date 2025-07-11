import React, { useState } from "react";
import { uploadPDF } from "../api/upload";

export default function UploadPanel({ sessionId }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [documentId, setDocumentId] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file || !sessionId) return;  // Ensure sessionId is present
    setLoading(true);
    try {
      const data = await uploadPDF(file, sessionId);
      setPreview(data.text_preview);
      setDocumentId(data.document_id);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow max-w-xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Upload Document</h2>

      <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFileChange} />
      <button
        onClick={handleUpload}
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        disabled={loading || !sessionId}
      >
        {loading ? "Uploading..." : "Upload"}
      </button>

      {documentId && (
        <div className="mt-4">
          <p className="text-sm text-gray-600">Document ID: {documentId}</p>
          <h3 className="mt-2 font-semibold">Preview:</h3>
          <div className="max-h-64 overflow-y-auto bg-gray-100 p-2 rounded text-sm whitespace-pre-wrap">
            {preview}
          </div>
        </div>
      )}
    </div>
  );
}
