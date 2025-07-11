import axios from "./axios";

// Get all sessions
export async function fetchSessions() {
  const response = await axios.get("/session/all");
  return response.data;
}

// Create a new session
export async function createSession(name) {
  const response = await axios.post("/session/create", null, {
    params: { name },
  });
  return response.data;
}
