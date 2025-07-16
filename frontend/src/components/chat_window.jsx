// chat_window.jsx in components folder
import React, { useState, useEffect, useRef } from "react";
import { Card, List, Typography, Input, Button } from "antd";
import { SendOutlined, UserOutlined, RobotOutlined } from "@ant-design/icons";
import { sendMessage, fetchMessages } from "../api/chat";

export default function ChatWindow({ sessionId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!sessionId) return;
    fetchMessages(sessionId).then(setMessages);
    // Optionally poll for new messages every X seconds
    // const interval = setInterval(() => fetchMessages(sessionId).then(setMessages), 5000);
    // return () => clearInterval(interval);
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (input.trim() === "" || !sessionId) return;
    setLoading(true);
    try {
      // Optimistically add user message
      const userMessage = { sender: "user", content: input.trim(), timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, userMessage]);
      // Send message and get bot reply
      const res = await sendMessage(sessionId, input.trim());
      if (res && res.bot_message) {
        const botMessage = { sender: "assistant", content: res.bot_message, timestamp: new Date().toISOString() };
        setMessages((prev) => [...prev, botMessage]);
      } else if (res && res.detail) {
        // Show backend error as a bot message
        const botMessage = { sender: "assistant", content: `Error: ${res.detail}`, timestamp: new Date().toISOString() };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        const botMessage = { sender: "assistant", content: "No response from server.", timestamp: new Date().toISOString() };
        setMessages((prev) => [...prev, botMessage]);
      }
      setInput("");
    } catch (err) {
      console.error("Failed to send message:", err);
      const botMessage = { sender: "assistant", content: `Error: ${err.message || err.toString()}` };
      setMessages((prev) => [...prev, botMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      style={{
        borderRadius: 20,
        background: 'linear-gradient(135deg, #e0f7fa 0%, #e6e6fa 100%)',
        boxShadow: '0 4px 24px 0 rgba(180, 180, 255, 0.10)',
        maxHeight: 600,
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
      }}
      bodyStyle={{ padding: 24, display: 'flex', flexDirection: 'column', height: 520 }}
      title={<Typography.Title level={3} style={{ margin: 0, color: '#7c4dff', fontFamily: 'inherit' }}>Chat</Typography.Title>}
    >
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16, padding: 8, background: 'rgba(230,230,250,0.5)', borderRadius: 14, border: '1px solid #b39ddb' }}>
        {messages.length === 0 ? (
          <Typography.Text type="secondary" italic>No messages yet.</Typography.Text>
        ) : (
          <List
            dataSource={messages}
            renderItem={(msg, i) => (
              <List.Item
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  border: 'none',
                  padding: 0,
                  background: 'none',
                }}
              >
                <div
                  style={{
                    background: msg.sender === 'user' ? 'rgba(124,77,255,0.10)' : 'rgba(255,255,255,0.95)',
                    color: msg.sender === 'user' ? '#7c4dff' : '#333',
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    borderRadius: 14,
                    padding: '10px 16px',
                    maxWidth: '80%',
                    fontWeight: 500,
                    boxShadow: '0 1px 4px 0 rgba(180,180,255,0.06)',
                    marginBottom: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {msg.sender === 'user' ? <UserOutlined style={{ color: '#7c4dff' }} /> : <RobotOutlined style={{ color: '#64b5f6' }} />}
                  <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                </div>
              </List.Item>
            )}
          />
        )}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your message..."
          onPressEnter={handleSend}
          disabled={loading}
          style={{ borderRadius: 12, background: '#fff', flex: 1 }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={loading}
          disabled={loading || input.trim() === ""}
          style={{
            borderRadius: 12,
            fontWeight: 600,
            background: 'linear-gradient(90deg, #7c4dff 0%, #64b5f6 100%)',
            border: 'none',
            minWidth: 90,
          }}
        >
          Send
        </Button>
      </div>
    </Card>
  );
}
