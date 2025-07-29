// src/components/chat/ChatWindow.jsx
import React from 'react';
import ChatInterface from './ChatInterface';

const ChatWindow = ({ sessionId, tools, onToolsChange }) => {
  return (
    <div className="chat-window h-full">
      <ChatInterface 
        sessionId={sessionId} 
        tools={tools}
        onToolsChange={onToolsChange}
      />
    </div>
  );
};

export default ChatWindow;