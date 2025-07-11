import React, { useState } from "react";

export default function SessionList({ sessions, onSelect, onCreate }) {
  const [newSessionName, setNewSessionName] = useState("");

  const handleCreate = () => {
    if (newSessionName.trim() === "") return;
    onCreate(newSessionName.trim());
    setNewSessionName("");
  };

  return (
    <div className="w-64 p-4 bg-white rounded shadow flex flex-col">
      <h2 className="text-xl font-semibold mb-4">Sessions</h2>

      <div className="flex mb-4 space-x-2">
        <input
          type="text"
          value={newSessionName}
          onChange={(e) => setNewSessionName(e.target.value)}
          placeholder="New session name"
          className="flex-grow border border-gray-300 rounded px-2 py-1"
        />
        <button
          onClick={handleCreate}
          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Create
        </button>
      </div>

      <div className="flex-grow overflow-y-auto">
        {sessions.length === 0 && <p className="text-gray-500">No sessions found.</p>}
        <ul>
          {sessions.map((session) => (
            <li
              key={session.id}
              onClick={() => onSelect(session)}
              className="cursor-pointer p-2 rounded hover:bg-pastelBlue"
            >
              {session.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
