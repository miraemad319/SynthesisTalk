// session_list.jsx in components folder
import React, { useState } from "react";
import { Card, List, Input, Button, Badge, Typography, Spin, Empty } from "antd";
import { PlusOutlined, CheckCircleTwoTone } from "@ant-design/icons";

export default function SessionList({ sessions, currentSession, onSelect, onCreate }) {
  const [newSessionName, setNewSessionName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (newSessionName.trim() === "") return;
    setIsCreating(true);
    try {
      await onCreate(newSessionName.trim());
      setNewSessionName("");
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleCreate();
    }
  };

  return (
    <Card
      style={{
        height: '100%',
        borderRadius: 20,
        background: 'linear-gradient(135deg, #e0f7fa 0%, #f1f8e9 100%)',
        boxShadow: '0 4px 24px 0 rgba(180, 255, 200, 0.10)',
        display: 'flex',
        flexDirection: 'column',
      }}
      bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography.Title level={4} style={{ margin: 0, color: '#43a047', fontFamily: 'inherit' }}>Research Sessions</Typography.Title>
          <Badge count={sessions.length} style={{ backgroundColor: '#b2dfdb', color: '#00695c', fontWeight: 600 }} />
        </div>
      }
    >
      {/* Create New Session */}
      <div style={{ padding: 20, borderBottom: '1px solid #b2dfdb' }}>
        <Input
          value={newSessionName}
          onChange={e => setNewSessionName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter session name..."
          disabled={isCreating}
          style={{ borderRadius: 12, marginBottom: 10, background: '#f9fbe7' }}
          suffix={<PlusOutlined style={{ color: '#43a047' }} />}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
          loading={isCreating}
          disabled={isCreating || newSessionName.trim() === ""}
          style={{
            width: '100%',
            borderRadius: 12,
            fontWeight: 600,
            background: 'linear-gradient(90deg, #43a047 0%, #b2dfdb 100%)',
            border: 'none',
          }}
        >
          Create New Session
        </Button>
      </div>
      {/* Sessions List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {sessions.length === 0 ? (
          <Empty description={<span>No sessions yet. Create your first session to get started.</span>} />
        ) : (
          <List
            dataSource={sessions}
            renderItem={session => (
              <List.Item
                key={session.id}
                onClick={() => onSelect(session)}
                style={{
                  borderRadius: 14,
                  marginBottom: 8,
                  background: currentSession?.id === session.id ? 'linear-gradient(90deg, #b2dfdb 0%, #e0f7fa 100%)' : 'rgba(224,247,250,0.7)',
                  border: currentSession?.id === session.id ? '2px solid #43a047' : '1px solid #b2dfdb',
                  boxShadow: currentSession?.id === session.id ? '0 2px 8px 0 rgba(67,160,71,0.08)' : 'none',
                  cursor: 'pointer',
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Typography.Text strong ellipsis style={{ color: currentSession?.id === session.id ? '#43a047' : '#333' }}>
                    {session.name}
                  </Typography.Text>
                  <div style={{ fontSize: 12, color: '#757575', marginTop: 2 }}>
                    {session.created_at ? new Date(session.created_at).toLocaleDateString() : 'Recently created'}
                  </div>
                </div>
                {currentSession?.id === session.id && (
                  <CheckCircleTwoTone twoToneColor={["#43a047", "#b2dfdb"]} style={{ fontSize: 20, marginLeft: 12 }} />
                )}
              </List.Item>
            )}
          />
        )}
      </div>
      {/* Footer */}
      <div style={{ padding: 12, borderTop: '1px solid #b2dfdb', textAlign: 'center', fontSize: 12, color: '#757575' }}>
        <span style={{ marginRight: 6 }}><CheckCircleTwoTone twoToneColor={["#43a047", "#b2dfdb"]} /></span>
        Ready for research
      </div>
    </Card>
  );
}