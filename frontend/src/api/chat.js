// chat.js in api folder
import axios from "./axios";

// Fetch all messages for a session
export async function fetchMessages(sessionId) {
  const response = await axios.get(`/session/${sessionId}/messages`);
  return response.data;
}

// Send a chat message for a session
export async function sendMessage(sessionId, userMessage) {
  const response = await axios.post("/session/chat", {
    user_message: userMessage,
    session_id: sessionId,
    enable_web_search: true,
    enable_document_search: true,
  });
  return response.data;
}
