import React, { useState, useEffect, useRef } from "react";
import { sendMessage, fetchMessages } from "../api/chat";

export default function ChatWindow({ sessionId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!sessionId) return;

    fetchMessages(sessionId).then(setMessages);

    // Optionally poll for new messages every X seconds
    // const interval = setInterval(() => fetchMessages(sessionId).then(setMessages), 5000);
    // return () => clearInterval(interval);
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (input.trim() === "" || !sessionId) return;

    setLoading(true);

    try {
      // Optimistically add user message
      const userMessage = { sender: "user", content: input.trim(), timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, userMessage]);

      // Send message and get bot reply
      const res = await sendMessage(sessionId, input.trim());

      const botMessage = { sender: "assistant", content: res.bot_message, timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, botMessage]);
      setInput("");
    } catch (err) {
      console.error("Failed to send message:", err);
      // Optionally show error to user
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-white rounded shadow p-4 max-h-[600px]">
      <h2 className="text-xl font-semibold mb-4">Chat</h2>
      <div className="flex-grow overflow-y-auto mb-4 space-y-2 border border-gray-300 rounded p-3 bg-gray-50">
        {messages.length === 0 && <p className="text-gray-500">No messages yet.</p>}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-2 rounded max-w-[80%] ${
              msg.sender === "user" ? "bg-blue-200 self-end" : "bg-gray-200 self-start"
            }`}
          >
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-grow border border-gray-300 rounded px-3 py-2"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          disabled={loading}
        />
        <button
          onClick={handleSend}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          disabled={loading || input.trim() === ""}
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
