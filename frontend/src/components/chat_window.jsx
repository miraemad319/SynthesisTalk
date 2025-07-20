import axios from "axios";
import React, { useState, useEffect, useRef } from "react";
import { Card, List, Typography, Input, Button, Tooltip, Upload, message } from "antd";
import { SendOutlined, LikeOutlined, DislikeOutlined, RedoOutlined, UploadOutlined } from "@ant-design/icons";
import { sendMessage, fetchMessages } from "../api/chat";
import { uploadPDF, fetchDocuments } from "../api/upload";

export default function ChatWindow({ sessionId: propSessionId, currentDocument }) {
  const [sessionId, setSessionId] = useState(propSessionId);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [files, setFiles] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!sessionId) {
      const fetchCurrentSession = async () => {
        try {
          const response = await axios.get("/session/current");
          setSessionId(response.data.session_id);
        } catch (error) {
          console.error("Error fetching current session:", error);
        }
      };
      fetchCurrentSession();
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      fetchMessages(sessionId).then(setMessages);
    }
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (input.trim() === "" || !sessionId) return;
    setLoading(true);
    try {
      const userMessage = { sender: "user", content: input.trim(), timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setTyping(true);
      const res = await sendMessage(sessionId, input.trim());
      if (res && res.bot_message) {
        const botMessage = { sender: "assistant", content: res.bot_message, timestamp: new Date().toISOString() };
        setMessages((prev) => [...prev, botMessage]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setLoading(false);
      setTyping(false);
    }
  };

  const handleFeedback = (messageId, feedback) => {
    console.log(`Feedback for message ${messageId}: ${feedback}`);
  };

  const handleRetry = (messageContent) => {
    setInput(messageContent);
  };

  const handleFileChange = (info) => {
    const allowedTypes = ["application/pdf", "text/plain"];
    const newFiles = info.fileList
      .map((f) => f.originFileObj)
      .filter((f) => f && allowedTypes.includes(f.type));
    setFiles(newFiles);
  };

  const handleUpload = async () => {
    if (!files.length) {
      message.warning("Please select valid file(s).");
      return;
    }

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await axios.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.status === 200) {
        message.success("Files uploaded successfully.");
      } else {
        message.error("Failed to upload files.");
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      message.error("An error occurred during file upload.");
    } finally {
      setFiles([]);
    }
  };

  return (
    <Card title="Chat" style={{ height: "500px", overflow: "hidden" }}>
      <div style={{ height: "calc(100% - 100px)", overflowY: "scroll" }}>
        <List
          dataSource={messages}
          renderItem={(item, index) => (
            <List.Item
              key={index}
              style={{
                display: "flex",
                justifyContent: item.sender === "user" ? "flex-end" : "flex-start",
                padding: "8px 0",
              }}
            >
              <div
                style={{
                  maxWidth: "70%",
                  padding: "10px 16px",
                  borderRadius: 12,
                  fontSize: 14,
                  lineHeight: "1.5",
                  background: item.sender === "user" ? "#e6f7ff" : "#f5f5f5",
                  color: item.sender === "user" ? "#0050b3" : "#333",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                }}
              >
                {item.content}
              </div>
            </List.Item>
          )}
        />
        {typing && <Typography.Text italic>Assistant is typing...</Typography.Text>}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ display: "flex", marginTop: 10, gap: 8 }}>
        <Upload
          multiple
          beforeUpload={() => false}
          onChange={handleFileChange}
          fileList={files.map((file) => ({ name: file.name }))}
          showUploadList={false}
        >
          <Button icon={<UploadOutlined />} onClick={handleUpload} />
        </Upload>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={handleSend}
          placeholder="Type your message..."
          disabled={loading}
          style={{ flex: 1 }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={loading}
        />
      </div>
      {currentDocument && (
        <Typography.Text type="secondary" style={{ marginTop: 10 }}>
          Referencing document: {currentDocument}
        </Typography.Text>
      )}
    </Card>
  );
}