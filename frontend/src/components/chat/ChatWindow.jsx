// src/components/chat/ChatWindow.jsx
import React from 'react';
import { Layout, Card } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import ChatInterface from './ChatInterface';

const { Content } = Layout;

const ChatWindow = ({ sessionId, tools, onToolsChange }) => {
  return (
    <Layout className="h-full">
      <Content className="p-4">
        <Card 
          className="h-full shadow-lg"
          title={
            <div className="flex items-center gap-2">
              <MessageOutlined className="text-blue-500" />
              <span>Chat Session {sessionId}</span>
            </div>
          }
          bordered={false}
          bodyStyle={{ 
            height: 'calc(100% - 57px)', 
            padding: 0,
            overflow: 'hidden' 
          }}
        >
          <ChatInterface 
            sessionId={sessionId} 
            tools={tools}
            onToolsChange={onToolsChange}
          />
        </Card>
      </Content>
    </Layout>
  );
};

export default ChatWindow;