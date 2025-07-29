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
  const [tools, setTools] = useState({
    chainOfThought: true,
    webSearch: false,
    documentSearch: false,
    summarization: false,
    summaryFormat: 'paragraph'
  });
  const [chatActions, setChatActions] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

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

  // Load documents count when session changes
  useEffect(() => {
    async function fetchDocumentsCount() {
      if (!selectedSessionId) {
        setDocumentsCount(0);
        return;
      }

      try {
        const documents = await getDocuments(selectedSessionId);
        setDocumentsCount(Array.isArray(documents) ? documents.length : 0);
      } catch (error) {
        console.error('Failed to load documents count:', error);
        setDocumentsCount(0);
      }
    }

    fetchDocumentsCount();
  }, [selectedSessionId]);

  // New session handler
  function handleNewSession(newSession) {
    setSessions((prevSessions) => [newSession, ...prevSessions]);
    setSelectedSessionId(newSession.id);
    setDocumentsCount(0); // New session has no documents
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
    }
  }

  // Clear all sessions
  function handleAllSessionsCleared() {
    setSessions([]);
    setSelectedSessionId(null);
    setDocumentsCount(0);
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

  // Handle manual web search complete
  const handleWebSearchComplete = useCallback((results, query) => {
    console.log('Manual web search completed:', { results, query });
    // Optionally forward to chat or display
  }, []);

  // Handle documents update (when files are uploaded)
  const handleDocumentsUpdate = useCallback((newCount) => {
    setDocumentsCount(newCount);
  }, []);

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
            onSearchStateChange={setIsSearching}
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
        onWebSearchComplete={handleWebSearchComplete}
        isSearching={isSearching}
        documentsCount={documentsCount}
      />
    </div>
  );
}

export default App;