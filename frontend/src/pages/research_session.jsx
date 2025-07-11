import React, { useState, useEffect } from "react";
import UploadPanel from "../components/upload_panel";
import SessionList from "../components/session_list";
import ChatWindow from "../components/chat_window";
import { fetchSessions, createSession } from "../api/session";

export default function ResearchSession() {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);

  useEffect(() => {
    fetchSessions().then(setSessions);
  }, []);

  const handleCreateSession = (name) => {
    createSession(name).then((newSession) => {
      setSessions((prev) => [newSession, ...prev]);
      setCurrentSession(newSession);
    });
  };

  return (
    <div className="p-6 flex space-x-6 h-screen">
      <SessionList
        sessions={sessions}
        onSelect={setCurrentSession}
        onCreate={handleCreateSession}
      />

      {currentSession ? (
        <div className="flex flex-col flex-1 gap-4">
          <ChatWindow sessionId={currentSession.id} />
          <UploadPanel sessionId={currentSession.id} />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-600">
          Select or create a session to start chatting and uploading documents.
        </div>
      )}
    </div>
  );
}
