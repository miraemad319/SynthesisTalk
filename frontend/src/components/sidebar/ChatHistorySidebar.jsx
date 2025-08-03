// src/components/sidebar/ChatHistorySidebar.jsx

import React, { useEffect, useState } from "react";
import { 
  List, 
  Input, 
  Button, 
  Typography, 
  Space, 
  Dropdown, 
  Modal, 
  Select,
  message,
  Divider,
  Empty,
  Card
} from "antd";
import { 
  PlusOutlined, 
  DeleteOutlined, 
  EditOutlined, 
  ExportOutlined, 
  MoreOutlined,
  ClearOutlined,
  MessageOutlined,
  HistoryOutlined
} from "@ant-design/icons";
import { listSessions, createSession, renameSession, deleteSession, clearAllSessions, exportSession } from "../../utils/api";

const { Title, Text } = Typography;
const { Option } = Select;

export default function ChatHistorySidebar({
  selectedSessionId,
  onSessionSelect,
  onNewSession,
  onSessionDeleted,
  onAllSessionsCleared,
}) {
  const [sessions, setSessions] = useState([]);
  const [newSessionName, setNewSessionName] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [editingSession, setEditingSession] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState("pdf");
  const [exportingSession, setExportingSession] = useState(null);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      setInitialLoading(true);
      const data = await listSessions();
      console.log("Loaded sessions:", data);
      setSessions(data || []);
    } catch (error) {
      console.error("Failed to load sessions:", error);
      setSessions([]);
      message.error("Failed to load sessions");
    } finally {
      setInitialLoading(false);
    }
  }

  async function handleCreateSession() {
    if (!newSessionName.trim()) {
      message.warning("Please enter a session name");
      return;
    }

    setLoading(true);
    try {
      const newSession = await createSession(newSessionName.trim());
      console.log("New session created:", newSession);
      
      setNewSessionName("");
      await loadSessions();
      
      if (onSessionSelect && newSession.id) {
        onSessionSelect(newSession.id);
      }
      
      if (onNewSession) {
        onNewSession(newSession);
      }

      message.success("Session created successfully");
      
    } catch (error) {
      console.error("Failed to create a new session:", error);
      message.error(`Failed to create session: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  const handleSessionClick = (sessionId) => {
    if (editingSession === sessionId) return;
    
    console.log("Session clicked:", sessionId);
    if (onSessionSelect) {
      onSessionSelect(sessionId);
    }
  };

  const handleRenameStart = (session) => {
    setEditingSession(session.id);
    setEditingName(session.name);
    setRenameModalVisible(true);
  };

  const handleRenameCancel = () => {
    setEditingSession(null);
    setEditingName("");
    setRenameModalVisible(false);
  };

  const handleRenameSubmit = async () => {
    if (!editingName.trim()) {
      handleRenameCancel();
      return;
    }

    const currentSession = sessions.find(s => s.id === editingSession);
    if (currentSession && currentSession.name === editingName.trim()) {
      handleRenameCancel();
      return;
    }

    try {
      console.log(`Attempting to rename session ${editingSession} to "${editingName.trim()}"`);
      
      const result = await renameSession(editingSession, editingName.trim());
      console.log("Rename API result:", result);
      
      setSessions(prev => prev.map(session => 
        session.id === editingSession 
          ? { ...session, name: editingName.trim() }
          : session
      ));
      
      setEditingSession(null);
      setEditingName("");
      setRenameModalVisible(false);
      
      message.success("Session renamed successfully");
      
    } catch (error) {
      console.error("Failed to rename session:", error);
      const errorMessage = error.response?.data?.message || error.message || "Unknown error occurred";
      message.error(`Failed to rename session: ${errorMessage}`);
      handleRenameCancel();
    }
  };

  const handleDeleteSession = async (sessionId) => {
    const sessionToDelete = sessions.find(s => s.id === sessionId);
    if (!sessionToDelete) return;

    Modal.confirm({
      title: 'Delete Session',
      content: `Are you sure you want to delete "${sessionToDelete.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await deleteSession(sessionId);
          setSessions(prev => prev.filter(session => session.id !== sessionId));
          
          if (selectedSessionId === sessionId && onSessionDeleted) {
            onSessionDeleted(sessionId);
          }
          
          message.success("Session deleted successfully");
          
        } catch (error) {
          console.error("Failed to delete session:", error);
          message.error(`Failed to delete session: ${error.message}`);
        }
      }
    });
  };

  const handleExportStart = (session) => {
    setExportingSession(session);
    setExportModalVisible(true);
  };

  const handleExportSession = async () => {
    if (!exportingSession) return;

    try {
      await exportSession(exportingSession.id, exportFormat);
      message.success(`Session "${exportingSession.name}" exported successfully as ${exportFormat.toUpperCase()}!`);
      setExportModalVisible(false);
      setExportingSession(null);
    } catch (error) {
      console.error("Failed to export session:", error);
      message.error(`Failed to export session: ${error.message}`);
    }
  };

  const handleClearAllSessions = async () => {
    if (sessions.length === 0) return;

    Modal.confirm({
      title: 'Clear All Sessions',
      content: 'Are you sure you want to delete ALL sessions? This cannot be undone.',
      okText: 'Clear All',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await clearAllSessions();
          setSessions([]);
          
          if (onAllSessionsCleared) {
            onAllSessionsCleared();
          }
          
          message.success("All sessions cleared successfully");
          
        } catch (error) {
          console.error("Failed to clear all sessions:", error);
          message.error(`Failed to clear all sessions: ${error.message}`);
        }
      }
    });
  };

  const getMenuItems = (session) => [
    {
      key: 'rename',
      icon: <EditOutlined />,
      label: 'Rename',
      onClick: () => handleRenameStart(session),
    },
    {
      key: 'export',
      icon: <ExportOutlined />,
      label: 'Export',
      onClick: () => handleExportStart(session),
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      danger: true,
      onClick: () => handleDeleteSession(session.id),
    },
  ];

  const validSessions = sessions.filter((session) => {
    const isValid = session && session.id && session.name && session.name.trim() !== "";
    if (!isValid) {
      console.log("Invalid session filtered out:", session);
    }
    return isValid;
  });

  if (initialLoading) {
    return (
      <div style={{ 
        width: 280, 
        height: '100%', 
        borderRight: '1px solid #f0f0f0',
        backgroundColor: '#fafafa',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <HistoryOutlined style={{ fontSize: '32px', color: '#d9d9d9', marginBottom: '16px' }} />
          <Text type="secondary">Loading chat history...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      width: 280, 
      height: '100%', 
      borderRight: '1px solid #f0f0f0',
      backgroundColor: '#fafafa',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden' // Prevent overall container overflow
    }}>
      {/* FIXED: Header with proper visibility */}
      <div style={{ 
        padding: '20px 20px 16px 20px',
        backgroundColor: '#fafafa',
        borderBottom: '1px solid #f0f0f0',
        flexShrink: 0 // Prevent header from shrinking
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <MessageOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
          <Title level={4} style={{ margin: 0, color: '#1f1f1f', fontWeight: 600 }}>
            Chat History
          </Title>
        </div>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {validSessions.length} session{validSessions.length !== 1 ? 's' : ''}
        </Text>
      </div>

      {/* FIXED: Scrollable content area */}
      <div style={{ 
        flex: 1, 
        padding: '16px 12px 0 12px', 
        overflowY: 'auto',
        overflowX: 'hidden',
        minHeight: 0, // Important for flex child to be scrollable
        scrollBehavior: 'smooth'
      }}>
        {validSessions.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 16px',
            color: '#8c8c8c'
          }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div>
                  <Text type="secondary" style={{ fontSize: '14px' }}>No chat sessions yet</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>Create your first chat below</Text>
                </div>
              }
            />
          </div>
        ) : (
          <List
            dataSource={validSessions}
            split={false}
            renderItem={(session) => (
              <List.Item
                style={{
                  padding: '12px 16px',
                  margin: '4px 0',
                  borderRadius: '8px',
                  backgroundColor: session.id === selectedSessionId ? '#e6f7ff' : 'transparent',
                  border: session.id === selectedSessionId ? '2px solid #91d5ff' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
                className="session-item"
                onClick={() => handleSessionClick(session.id)}
                onMouseEnter={(e) => {
                  if (session.id !== selectedSessionId) {
                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                    e.currentTarget.style.borderColor = '#e0e0e0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (session.id !== selectedSessionId) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }
                }}
                actions={[
                  <Dropdown
                    menu={{ items: getMenuItems(session) }}
                    trigger={['click']}
                    placement="bottomRight"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      type="text"
                      icon={<MoreOutlined />}
                      size="small"
                      style={{ 
                        opacity: 0.6,
                        transition: 'opacity 0.2s ease'
                      }}
                      className="more-button"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Dropdown>
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: session.id === selectedSessionId ? '#1890ff' : '#f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}>
                      <MessageOutlined 
                        style={{ 
                          color: session.id === selectedSessionId ? 'white' : '#999',
                          fontSize: '14px'
                        }} 
                      />
                    </div>
                  }
                  title={
                    <Text 
                      ellipsis={{ tooltip: session.name }}
                      style={{ 
                        fontWeight: session.id === selectedSessionId ? 600 : 400,
                        color: session.id === selectedSessionId ? '#1890ff' : '#1f1f1f',
                        fontSize: '14px',
                        lineHeight: '20px'
                      }}
                    >
                      {session.name}
                    </Text>
                  }
                  description={
                    session.updated_at && (
                      <Text 
                        type="secondary" 
                        style={{ fontSize: '11px' }}
                      >
                        {new Date(session.updated_at).toLocaleDateString()}
                      </Text>
                    )
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>

      {/* FIXED: Bottom section with proper spacing */}
      <div style={{ 
        padding: '16px 20px 20px 20px',
        backgroundColor: '#fafafa',
        borderTop: '1px solid #f0f0f0',
        flexShrink: 0 // Prevent footer from shrinking
      }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Input
            placeholder="New session name"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            onPressEnter={() => !loading && handleCreateSession()}
            disabled={loading}
            maxLength={100}
            style={{ 
              borderRadius: '8px',
              fontSize: '14px'
            }}
            prefix={<PlusOutlined style={{ color: '#d9d9d9' }} />}
          />
          
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateSession}
            disabled={loading || !newSessionName.trim()}
            loading={loading}
            block
            style={{ 
              borderRadius: '8px', 
              height: '40px',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            {loading ? "Creating..." : "Create New Chat"}
          </Button>
          
          {validSessions.length > 0 && (
            <Button
              danger
              icon={<ClearOutlined />}
              onClick={handleClearAllSessions}
              block
              style={{ 
                borderRadius: '8px', 
                height: '36px',
                fontSize: '13px'
              }}
            >
              Clear All Sessions
            </Button>
          )}
        </Space>
      </div>

      {/* Rename Modal */}
      <Modal
        title="Rename Session"
        open={renameModalVisible}
        onOk={handleRenameSubmit}
        onCancel={handleRenameCancel}
        okText="Rename"
        cancelText="Cancel"
        width={400}
      >
        <Input
          placeholder="Enter new session name"
          value={editingName}
          onChange={(e) => setEditingName(e.target.value)}
          onPressEnter={handleRenameSubmit}
          maxLength={100}
          autoFocus
          style={{ borderRadius: '6px' }}
        />
      </Modal>

      {/* Export Modal */}
      <Modal
        title="Export Session"
        open={exportModalVisible}
        onOk={handleExportSession}
        onCancel={() => {
          setExportModalVisible(false);
          setExportingSession(null);
        }}
        okText="Export"
        cancelText="Cancel"
        width={400}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>Select export format:</Text>
          <Select
            value={exportFormat}
            onChange={setExportFormat}
            style={{ width: '100%' }}
          >
            <Option value="pdf">PDF</Option>
            <Option value="word">Word Document</Option>
          </Select>
          {exportingSession && (
            <Text type="secondary">
              Exporting: "{exportingSession.name}"
            </Text>
          )}
        </Space>
      </Modal>

      <style jsx>{`
        .session-item:hover .more-button {
          opacity: 1 !important;
        }
        .session-item {
          border: 2px solid transparent !important;
        }
        .session-item:hover {
          border-color: #e0e0e0 !important;
        }
      `}</style>
    </div>
  );
}