import { useEffect, useState } from "react";
import { listSessions, createSession, renameSession, deleteSession, clearAllSessions, exportSession } from "../../utils/api";

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
  const [editingSession, setEditingSession] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      const data = await listSessions();
      console.log("Loaded sessions:", data);
      setSessions(data || []);
    } catch (error) {
      console.error("Failed to load sessions:", error);
      setSessions([]);
    }
  }

  async function handleCreateSession() {
    if (!newSessionName.trim()) {
      alert("Please enter a session name");
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
      
    } catch (error) {
      console.error("Failed to create a new session:", error);
      alert(`Failed to create a new session: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  const handleSessionClick = (sessionId) => {
    if (editingSession === sessionId) return;
    
    console.log("Session clicked:", sessionId);
    setOpenMenuId(null); // Close any open menu
    if (onSessionSelect) {
      onSessionSelect(sessionId);
    }
  };

  const handleMenuToggle = (sessionId, e) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === sessionId ? null : sessionId);
  };

  const handleRenameStart = (session, e) => {
    e.stopPropagation();
    setEditingSession(session.id);
    setEditingName(session.name);
    setOpenMenuId(null);
  };

  const handleRenameCancel = () => {
    setEditingSession(null);
    setEditingName("");
  };

  const handleRenameSubmit = async (sessionId) => {
    if (!editingName.trim()) {
      handleRenameCancel();
      return;
    }

    const currentSession = sessions.find(s => s.id === sessionId);
    if (currentSession && currentSession.name === editingName.trim()) {
      handleRenameCancel();
      return;
    }

    try {
      console.log(`Attempting to rename session ${sessionId} to "${editingName.trim()}"`);
      
      const result = await renameSession(sessionId, editingName.trim());
      console.log("Rename API result:", result);
      
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, name: editingName.trim() }
          : session
      ));
      
      setEditingSession(null);
      setEditingName("");
      
      console.log("Session renamed successfully");
      
    } catch (error) {
      console.error("Failed to rename session:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.status,
        response: error.response
      });
      
      const errorMessage = error.response?.data?.message || error.message || "Unknown error occurred";
      alert(`Failed to rename session: ${errorMessage}`);
      
      handleRenameCancel();
    }
  };

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    
    const sessionToDelete = sessions.find(s => s.id === sessionId);
    if (!sessionToDelete) return;

    const confirmDelete = window.confirm(`Are you sure you want to delete "${sessionToDelete.name}"?`);
    if (!confirmDelete) return;

    try {
      await deleteSession(sessionId);
      setSessions(prev => prev.filter(session => session.id !== sessionId));
      
      if (selectedSessionId === sessionId && onSessionDeleted) {
        onSessionDeleted(sessionId);
      }
      
      setOpenMenuId(null);
      
    } catch (error) {
      console.error("Failed to delete session:", error);
      alert(`Failed to delete session: ${error.message}`);
    }
  };

  const handleExportSession = async (sessionId, e) => {
    e.stopPropagation();
    
    const sessionToExport = sessions.find(s => s.id === sessionId);
    if (!sessionToExport) return;

    const format = prompt("Choose format (pdf or word):", "pdf");
    if (!format || !["pdf", "word"].includes(format.toLowerCase())) {
      alert("Invalid format. Please choose 'pdf' or 'word'.");
      return;
    }

    try {
      await exportSession(sessionId, format.toLowerCase());
      alert(`Session "${sessionToExport.name}" exported successfully as ${format.toUpperCase()}!`);
    } catch (error) {
      console.error("Failed to export session:", error);
      alert(`Failed to export session: ${error.message}`);
    }
    
    setOpenMenuId(null);
  };

  const handleClearAllSessions = async () => {
    if (sessions.length === 0) return;

    const confirmClear = window.confirm("Are you sure you want to delete ALL sessions? This cannot be undone.");
    if (!confirmClear) return;

    try {
      await clearAllSessions();
      setSessions([]);
      
      if (onAllSessionsCleared) {
        onAllSessionsCleared();
      }
      
    } catch (error) {
      console.error("Failed to clear all sessions:", error);
      alert(`Failed to clear all sessions: ${error.message}`);
    }
  };

  const handleRenameKeyDown = (e, sessionId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSubmit(sessionId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleRenameCancel();
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const validSessions = sessions.filter((session) => {
    const isValid = session && session.id && session.name && session.name.trim() !== "";
    if (!isValid) {
      console.log("Invalid session filtered out:", session);
    }
    return isValid;
  });

  return (
    <div className="flex flex-col h-full w-64 p-4 border-r border-gray-300 bg-gray-50">
      <h2 className="text-lg font-semibold mb-4">Chat History</h2>
      
      <ul className="flex-1 overflow-y-auto space-y-2 pr-1">
        {validSessions.length === 0 ? (
          <li className="text-gray-500 text-sm italic">No sessions yet</li>
        ) : (
          validSessions.map((session) => (
            <li
              key={session.id}
              className={`group relative rounded transition-colors ${
                session.id === selectedSessionId ? "bg-gray-300" : "hover:bg-gray-200"
              }`}
            >
              {editingSession === session.id ? (
                <div className="p-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => handleRenameKeyDown(e, session.id)}
                    onBlur={() => handleRenameSubmit(session.id)}
                    className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    maxLength={100}
                  />
                </div>
              ) : (
                <div
                  onClick={() => handleSessionClick(session.id)}
                  className={`cursor-pointer p-2 flex items-center justify-between ${
                    session.id === selectedSessionId ? "font-bold" : ""
                  }`}
                  title={session.name}
                >
                  <div className="truncate flex-1 mr-2">
                    {session.name}
                  </div>
                  
                  {/* 3-dot menu button */}
                  <div className="relative">
                    <button
                      onClick={(e) => handleMenuToggle(session.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-300 rounded transition-opacity focus:opacity-100"
                      title="More options"
                    >
                      <div className="flex flex-col space-y-0.5">
                        <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                      </div>
                    </button>
                    
                    {/* Dropdown menu */}
                    {openMenuId === session.id && (
                      <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                        <button
                          onClick={(e) => handleRenameStart(session, e)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                        >
                          <span className="mr-2">✏️</span>
                          Rename
                        </button>
                        <button
                          onClick={(e) => handleExportSession(session.id, e)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                        >
                          <span className="mr-2">📤</span>
                          Export
                        </button>
                        <button
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-red-100 text-red-600 flex items-center"
                        >
                          <span className="mr-2">🗑️</span>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))
        )}
      </ul>

      <div className="mt-4 space-y-2">
        <input
          type="text"
          className="w-full p-2 border border-gray-300 rounded text-sm"
          placeholder="New session name"
          value={newSessionName}
          onChange={(e) => setNewSessionName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !loading) {
              handleCreateSession();
            }
          }}
          disabled={loading}
          maxLength={100}
        />
        <button
          onClick={handleCreateSession}
          disabled={loading || !newSessionName.trim()}
          className={`w-full py-2 rounded text-sm font-medium transition-colors ${
            loading || !newSessionName.trim()
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {loading ? "Creating..." : "Create New Session"}
        </button>
        
        {validSessions.length > 0 && (
          <button
            onClick={handleClearAllSessions}
            className="w-full py-2 rounded text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
            title="Delete all sessions permanently"
          >
            Clear All Sessions
          </button>
        )}
      </div>
    </div>
  );
}