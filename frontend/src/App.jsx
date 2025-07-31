import 'antd/dist/reset.css';
import './App.css';
import { useEffect, useState, useCallback } from 'react';
import ChatWindow from './components/chat/ChatWindow';
import ToolPanel from './components/tools/ToolPanel';
import ChatHistorySidebar from './components/sidebar/ChatHistorySidebar';
import { listSessions, getDocuments } from "./utils/api";

function App() {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [documents, setDocuments] = useState([]);
  const [tools, setTools] = useState({
    webSearch: false,
    documentSearch: false,
    summarization: false,
    chainOfThought: false,
    insights: false,
    summaryFormat: 'paragraph'
  });
  const [chatActions, setChatActions] = useState(null);

  // Load sessions on mount
  useEffect(() => {
    async function fetchSessions() {
      try {
        const data = await listSessions();
        setSessions(data);
        if (data.length > 0) {
          setSelectedSessionId(data[0].id);
        }
      } catch (error) {
        console.error('Failed to load sessions:', error);
      }
    }

    fetchSessions();
  }, []);

  // Load documents count and documents when session changes
  useEffect(() => {
    async function fetchDocuments() {
      if (!selectedSessionId) {
        setDocumentsCount(0);
        setDocuments([]);
        return;
      }

      try {
        const documentsData = await getDocuments(selectedSessionId);
        const documentsArray = Array.isArray(documentsData) ? documentsData : [];
        setDocumentsCount(documentsArray.length);
        setDocuments(documentsArray);
      } catch (error) {
        console.error('Failed to load documents:', error);
        setDocumentsCount(0);
        setDocuments([]);
      }
    }

    fetchDocuments();
  }, [selectedSessionId]);

  // New session handler
  function handleNewSession(newSession) {
    setSessions((prevSessions) => [newSession, ...prevSessions]);
    setSelectedSessionId(newSession.id);
    setDocumentsCount(0);
    setDocuments([]);
  }

  // Select session
  function handleSessionSelect(sessionId) {
    setSelectedSessionId(sessionId);
  }

  // Delete session
  function handleSessionDeleted(deletedSessionId) {
    setSessions(prev => prev.filter(session => session.id !== deletedSessionId));
    if (selectedSessionId === deletedSessionId) {
      const remaining = sessions.filter(session => session.id !== deletedSessionId);
      setSelectedSessionId(remaining.length > 0 ? remaining[0].id : null);
      setDocumentsCount(0);
      setDocuments([]);
    }
  }

  // Clear all sessions
  function handleAllSessionsCleared() {
    setSessions([]);
    setSelectedSessionId(null);
    setDocumentsCount(0);
    setDocuments([]);
  }

  // Toggle tool on/off
  const handleToolToggle = useCallback((toolName, value) => {
    setTools(prevTools => ({
      ...prevTools,
      [toolName]: value
    }));
  }, []);

  // Summarize button from ToolPanel
  const handleSummarizeClick = useCallback(() => {
    if (chatActions?.summarizeLastMessage) {
      chatActions.summarizeLastMessage();
    }
  }, [chatActions]);

  // Receive chat action callbacks from ChatWindow
  const handleChatActionsChange = useCallback((actions) => {
    setChatActions(actions);
  }, []);

  // Handle documents update (when files are uploaded)
  const handleDocumentsUpdate = useCallback(async (newCount) => {
    setDocumentsCount(newCount);
    
    // Refresh documents list
    if (selectedSessionId) {
      try {
        const documentsData = await getDocuments(selectedSessionId);
        const documentsArray = Array.isArray(documentsData) ? documentsData : [];
        setDocuments(documentsArray);
      } catch (error) {
        console.error('Failed to refresh documents:', error);
      }
    }
  }, [selectedSessionId]);

  return (
    <div className="app-container">
      <ChatHistorySidebar
        sessions={sessions}
        selectedSessionId={selectedSessionId}
        onSessionSelect={handleSessionSelect}
        onNewSession={handleNewSession}
        onSessionDeleted={handleSessionDeleted}
        onAllSessionsCleared={handleAllSessionsCleared}
      />
      <div className="chat-panel">
        {selectedSessionId ? (
          <ChatWindow
            sessionId={selectedSessionId}
            tools={tools}
            onToolsChange={handleChatActionsChange}
            onDocumentsUpdate={handleDocumentsUpdate}
          />
        ) : (
          <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
            <h3>No session selected</h3>
            <p>Create a new session or select an existing one to start chatting.</p>
          </div>
        )}
      </div>
      <ToolPanel
        tools={tools}
        onToolToggle={handleToolToggle}
        onSummarizeClick={handleSummarizeClick}
        documentsCount={documentsCount}
        documents={documents}
      />
    </div>
  );
}

export default App;