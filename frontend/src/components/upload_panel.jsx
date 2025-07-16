// upload_panel.jsx in components folder
import React, { useState, useEffect } from "react";
import { Upload, Button, Card, Typography, Spin, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { uploadPDF, fetchDocuments } from "../api/upload";

export default function UploadPanel({ sessionId }) {
  const [files, setFiles] = useState([]); // array of File objects
  const [uploadedDocs, setUploadedDocs] = useState([]); // array of {id, filename, text_preview}
  const [loading, setLoading] = useState(false);

  // Fetch uploaded documents for this session on mount or session change
  useEffect(() => {
    if (!sessionId) return;
    fetchDocuments(sessionId).then(setUploadedDocs).catch(() => setUploadedDocs([]));
  }, [sessionId]);

  const handleFileChange = (info) => {
    // Only keep files that are not already uploaded (by name)
    const newFiles = info.fileList
      .map(f => f.originFileObj)
      .filter(f => f && !uploadedDocs.some(doc => doc.filename === f.name));
    setFiles(newFiles);
  };

  const handleUpload = async () => {
    if (!files.length || !sessionId) {
      message.warning("Please select file(s) and ensure a session is active.");
      return;
    }
    setLoading(true);
    try {
      // Upload all files in parallel
      const uploadPromises = files.map(file => uploadPDF(file, sessionId));
      const results = await Promise.all(uploadPromises);
      // Refresh uploaded docs list
      const docs = await fetchDocuments(sessionId);
      setUploadedDocs(docs);
      setFiles([]);
      message.success("Upload successful!");
    } catch (err) {
      console.error("Upload failed:", err);
      message.error("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      style={{
        maxWidth: 500,
        margin: "2rem auto",
        borderRadius: 24,
        background: "linear-gradient(135deg, #fbeffb 0%, #e6e6fa 60%, #e0f7fa 100%)",
        boxShadow: "0 4px 24px 0 rgba(180, 180, 255, 0.12)",
        border: "1px solid #f8bbd0",
      }}
      bodyStyle={{ padding: 32 }}
      title={<Typography.Title level={3} style={{ margin: 0, color: '#7c4dff', fontFamily: 'inherit' }}>Upload Document</Typography.Title>}
    >
      <Upload
        beforeUpload={() => false}
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.txt,.md,.rtf" // Added .md and .rtf
        multiple={true}
        fileList={files.map(f => ({ uid: f.name, name: f.name, status: 'done' }))}
        showUploadList={{ showRemoveIcon: true }}
        style={{ width: '100%' }}
      >
        <Button icon={<UploadOutlined />} style={{ marginBottom: 16, width: '100%' }}>
          Select File(s)
        </Button>
      </Upload>
      <Button
        type="primary"
        onClick={handleUpload}
        loading={loading}
        disabled={!files.length || !sessionId}
        style={{
          width: '100%',
          background: 'linear-gradient(90deg, #7c4dff 0%, #64b5f6 100%)',
          border: 'none',
          borderRadius: 12,
          fontWeight: 600,
          marginTop: 8,
        }}
      >
        Upload
      </Button>

      {/* List uploaded documents for this session */}
      {uploadedDocs.length > 0 && (
        <Card
          style={{
            marginTop: 32,
            background: 'rgba(224, 247, 250, 0.8)',
            borderRadius: 16,
            border: '1px solid #90caf9',
            boxShadow: '0 2px 8px 0 rgba(100, 181, 246, 0.08)',
          }}
          size="small"
        >
          <Typography.Title level={5} style={{ color: '#7c4dff' }}>Uploaded Documents</Typography.Title>
          {uploadedDocs.map(doc => (
            <div key={doc.id} style={{ marginBottom: 16 }}>
              <Typography.Text strong>{doc.filename}</Typography.Text>
              <div
                style={{
                  maxHeight: 128,
                  overflowY: 'auto',
                  background: 'rgba(224, 247, 250, 0.6)',
                  padding: 8,
                  borderRadius: 8,
                  fontSize: 13,
                  whiteSpace: 'pre-wrap',
                  border: '1px solid #b3e5fc',
                  boxShadow: 'inset 0 1px 4px 0 rgba(100, 181, 246, 0.06)',
                  marginTop: 4,
                }}
              >
                {doc.text_preview || 'No preview available.'}
              </div>
            </div>
          ))}
        </Card>
      )}
    </Card>
  );
}
