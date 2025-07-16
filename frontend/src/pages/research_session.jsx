// research_session.jsx in pages folder

import React, { useState, useEffect } from "react";
import UploadPanel from "../components/upload_panel";
import SessionList from "../components/session_list";
import ChatWindow from "../components/chat_window";
import { fetchSessions, createSession } from "../api/session";
import { fetchMessages, sendMessage } from "../api/chat";
import { Layout, Row, Col, Typography, Spin, Button, Card, Empty } from "antd";
import { PlusOutlined, SmileOutlined } from "@ant-design/icons";

export default function ResearchSession() {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    fetchSessions()
      .then(setSessions)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (currentSession) {
      fetchMessages(currentSession.id).then(setMessages);
    }
  }, [currentSession]);

  const handleCreateSession = (name) => {
    createSession(name).then((newSession) => {
      setSessions((prev) => [newSession, ...prev]);
      setCurrentSession(newSession);
    });
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      sendMessage(currentSession.id, newMessage).then((response) => {
        setMessages((prev) => [...prev, { sender: "user", content: newMessage }, { sender: "assistant", content: response.bot_message }]);
        setNewMessage("");
      });
    }
  };

  if (isLoading) {
    return (
      <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e0f7fa 0%, #e6e6fa 60%, #fbeffb 100%)' }}>
        <Row align="middle" justify="center" style={{ minHeight: '100vh' }}>
          <Col>
            <Spin size="large" />
            <Typography.Paragraph style={{ marginTop: 24, color: '#7c4dff', fontWeight: 600, textAlign: 'center' }}>
              Loading your research sessions...
            </Typography.Paragraph>
          </Col>
        </Row>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e0f7fa 0%, #e6e6fa 60%, #fbeffb 100%)' }}>
      {/* Header */}
      <Layout.Header style={{ background: 'rgba(255,255,255,0.85)', borderBottom: '1px solid #b3e5fc', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 8px 0 rgba(180,180,255,0.06)' }}>
        <Row align="middle" justify="space-between" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <Col style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #7c4dff 0%, #64b5f6 100%)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SmileOutlined style={{ color: '#fff', fontSize: 24 }} />
            </div>
            <div>
              <Typography.Title level={3} style={{ margin: 0, color: '#222', fontFamily: 'inherit' }}>SynthesisTalk</Typography.Title>
              <Typography.Text type="secondary" style={{ fontSize: 14 }}>Intelligent Research Assistant</Typography.Text>
            </div>
          </Col>
          <Col style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#757575' }}>
              <span style={{ width: 10, height: 10, background: '#43a047', borderRadius: '50%', display: 'inline-block', marginRight: 4, boxShadow: '0 0 6px #43a04788' }}></span>
              AI Ready
            </div>
          </Col>
        </Row>
      </Layout.Header>
      {/* Main Content */}
      <Layout.Content style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px', flex: 1 }}>
        <Row gutter={[32, 32]} style={{ minHeight: 'calc(100vh - 120px)' }}>
          {/* Session Sidebar */}
          <Col xs={24} lg={6} style={{ height: '100%' }}>
            <SessionList
              sessions={sessions}
              currentSession={currentSession}
              onSelect={setCurrentSession}
              onCreate={handleCreateSession}
            />
          </Col>
          {/* Main Content Area */}
          <Col xs={24} lg={18} style={{ height: '100%' }}>
            {currentSession ? (
              <Row gutter={[24, 24]} style={{ height: '100%' }}>
                {/* Chat Window */}
                <Col xs={24} xl={16} style={{ height: '100%' }}>
                  <ChatWindow
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    newMessage={newMessage}
                    setNewMessage={setNewMessage}
                    sessionId={currentSession.id}
                  />
                </Col>
                {/* Upload Panel */}
                <Col xs={24} xl={8} style={{ height: '100%' }}>
                  <UploadPanel sessionId={currentSession.id} />
                </Col>
              </Row>
            ) : (
              <Card style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.85)', borderRadius: 24 }}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <>
                      <Typography.Title level={4} style={{ margin: 0 }}>Welcome to SynthesisTalk</Typography.Title>
                      <Typography.Text type="secondary">Select an existing session or create a new one to start your research conversation.</Typography.Text>
                    </>
                  }
                >
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      const name = prompt("Enter session name:");
                      if (name) handleCreateSession(name);
                    }}
                    style={{
                      marginTop: 16,
                      borderRadius: 12,
                      fontWeight: 600,
                      background: 'linear-gradient(90deg, #7c4dff 0%, #64b5f6 100%)',
                      border: 'none',
                      padding: '12px 32px',
                    }}
                  >
                    Create New Session
                  </Button>
                </Empty>
              </Card>
            )}
          </Col>
        </Row>
      </Layout.Content>
    </Layout>
  );
}