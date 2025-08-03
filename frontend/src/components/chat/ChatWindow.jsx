// src/components/chat/ChatWindow.jsx

import React, { useState, useCallback } from 'react';
import { Layout, Typography, Spin } from 'antd';
import { MessageOutlined, RobotOutlined, LoadingOutlined } from '@ant-design/icons';
import ChatInterface from './ChatInterface';

const { Content } = Layout;
const { Title } = Typography;

const ChatWindow = ({ sessionId, tools, onToolsChange }) => {
  const [documentsCount, setDocumentsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleDocumentsUpdate = useCallback((count) => {
    setDocumentsCount(count);
  }, []);

  const handleToolsChange = useCallback((toolMethods) => {
    if (onToolsChange) {
      onToolsChange(toolMethods);
    }
  }, [onToolsChange]);

  const handleLoadingChange = useCallback((loading) => {
    setIsLoading(loading);
  }, []);

  if (!sessionId) {
    return (
      <Layout 
        style={{ 
          backgroundColor: '#ffffff',
          height: '100%',
          maxHeight: '100vh',
          overflow: 'hidden'
        }}
      >
        <Content 
          style={{ 
            padding: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <MessageOutlined style={{ fontSize: '64px', color: '#d9d9d9', marginBottom: '24px' }} />
            <Title level={3} style={{ color: '#8c8c8c', marginBottom: '16px' }}>
              Welcome to AI Assistant
            </Title>
            <Typography.Text type="secondary" style={{ fontSize: '16px' }}>
              Select a chat session from the sidebar or create a new one to get started
            </Typography.Text>
          </div>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout 
      style={{ 
        backgroundColor: '#ffffff',
        height: '100%',
        maxHeight: '100vh',
        overflow: 'hidden' // Prevent layout overflow
      }}
    >
      <Content 
        style={{ 
          padding: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden' // Prevent content overflow
        }}
      >
        {/* Enhanced Header */}
        <div 
          style={{ 
            padding: '16px 24px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #f0f0f0',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
            zIndex: 10,
            flexShrink: 0 // Prevent header from shrinking
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div 
                style={{ 
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#f0f9ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #e0f2fe'
                }}
              >
                <RobotOutlined 
                  style={{ 
                    fontSize: '18px', 
                    color: '#0ea5e9' 
                  }} 
                />
              </div>
              <div>
                <Title 
                  level={4} 
                  style={{ 
                    margin: 0, 
                    color: '#1f2937',
                    fontSize: '18px',
                    fontWeight: 600
                  }}
                >
                  AI Assistant
                </Title>
                <div style={{ 
                  fontSize: '13px', 
                  color: '#6b7280',
                  marginTop: '2px'
                }}>
                  Session: {sessionId}
                  {documentsCount > 0 && (
                    <span style={{ marginLeft: '12px' }}>
                      • {documentsCount} document{documentsCount !== 1 ? 's' : ''} uploaded
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Status Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Spin 
                    indicator={<LoadingOutlined style={{ fontSize: 14, color: '#1890ff' }} spin />} 
                  />
                  <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                    Processing...
                  </Typography.Text>
                </div>
              ) : (
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  backgroundColor: '#52c41a' 
                }} />
              )}
            </div>
          </div>
        </div>

        {/* Chat Interface Container - FIXED scrolling */}
        <div 
          style={{ 
            flex: 1,
            backgroundColor: '#fafafa',
            overflow: 'hidden', // Prevent container overflow
            minHeight: 0, // Important for flex child
            position: 'relative'
          }}
        >
          <ChatInterface 
            sessionId={sessionId}
            tools={tools}
            onToolsChange={handleToolsChange}
            onDocumentsUpdate={handleDocumentsUpdate}
            onLoadingChange={handleLoadingChange}
          />
        </div>
      </Content>
    </Layout>
  );
};

export default ChatWindow;