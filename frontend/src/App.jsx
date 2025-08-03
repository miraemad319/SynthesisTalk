import 'antd/dist/reset.css';
import './App.css';
import { useEffect, useState, useCallback } from 'react';
import { ConfigProvider, theme, App as AntApp } from 'antd';
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
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

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

  // Ant Design theme configuration
  const themeConfig = {
    algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      // Color tokens
      colorPrimary: '#1890ff',
      colorSuccess: '#52c41a',
      colorWarning: '#faad14',
      colorError: '#ff4d4f',
      colorInfo: '#1890ff',
      
      // Background tokens
      colorBgContainer: isDarkMode ? '#1f1f1f' : '#ffffff',
      colorBgElevated: isDarkMode ? '#262626' : '#ffffff',
      colorBgLayout: isDarkMode ? '#141414' : '#f5f5f5',
      
      // Border tokens
      colorBorder: isDarkMode ? '#303030' : '#d9d9d9',
      colorBorderSecondary: isDarkMode ? '#262626' : '#f0f0f0',
      
      // Text tokens
      colorText: isDarkMode ? 'rgba(255, 255, 255, 0.88)' : 'rgba(0, 0, 0, 0.88)',
      colorTextSecondary: isDarkMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)',
      colorTextTertiary: isDarkMode ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)',
      
      // Border radius
      borderRadius: 8,
      borderRadiusLG: 12,
      borderRadiusSM: 6,
      
      // Font
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontSize: 14,
      fontSizeLG: 16,
      fontSizeSM: 12,
      
      // Motion
      motionDurationMid: '0.2s',
      motionDurationSlow: '0.3s',
      
      // Shadow
      boxShadow: isDarkMode 
        ? '0 2px 8px rgba(0, 0, 0, 0.3)' 
        : '0 2px 8px rgba(0, 0, 0, 0.1)',
      boxShadowSecondary: isDarkMode 
        ? '0 4px 16px rgba(0, 0, 0, 0.4)' 
        : '0 4px 16px rgba(0, 0, 0, 0.15)',
    },
    components: {
      // Button component customizations
      Button: {
        borderRadius: 6,
        fontWeight: 500,
        paddingInline: 16,
        paddingBlock: 8,
      },
      
      // Input component customizations
      Input: {
        borderRadius: 8,
        paddingInline: 12,
        paddingBlock: 8,
      },
      
      // Card component customizations
      Card: {
        borderRadius: 12,
        paddingLG: 20,
      },
      
      // Menu component customizations
      Menu: {
        itemBorderRadius: 6,
        itemMarginInline: 8,
        itemPaddingInline: 12,
      },
      
      // Layout component customizations
      Layout: {
        siderBg: isDarkMode ? '#1f1f1f' : '#ffffff',
        bodyBg: isDarkMode ? '#141414' : '#f5f5f5',
      },
      
      // Message component customizations
      Message: {
        borderRadius: 8,
      },
      
      // Notification component customizations
      Notification: {
        borderRadius: 8,
      },
    },
  };

  return (
    <ConfigProvider theme={themeConfig}>
      <AntApp>
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
              <div className="empty-state">
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
      </AntApp>
    </ConfigProvider>
  );
}

export default App;