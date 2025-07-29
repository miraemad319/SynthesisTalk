import { useState } from 'react';
import {
  postChat,
  postSummary,
  webSearch,
  uploadFiles,
  getSessionMessages,
} from "./utils/api";

function TestAPI() {
  const [output, setOutput] = useState('');
  const [sessionId, setSessionId] = useState(1);

  const isValidSession = () => sessionId && !isNaN(sessionId);

  const testChat = async () => {
    if (!isValidSession()) {
      setOutput("⚠️ Invalid session ID");
      return;
    }
    try {
      const res = await postChat({
        message: 'Summarize this paper for me',
        session_id: sessionId,
        enable_reasoning: false,
        enable_web_search: false,
        enable_document_search: false,
        reasoning_type: null,
      });
      setOutput(JSON.stringify(res, null, 2));
    } catch (e) {
      setOutput(e.message);
    }
  };

  const testSummary = async () => {
    if (!isValidSession()) {
      setOutput("⚠️ Invalid session ID");
      return;
    }
    try {
      const res = await postSummary({
        session_id: sessionId,
        format: "paragraph",
        text: "This is a test summary request.",
      });
      setOutput(JSON.stringify(res, null, 2));
    } catch (e) {
      setOutput(e.message);
    }
  };

  const testSearch = async () => {
    try {
      const res = await webSearch({
        query: 'Quantum computing',
        search_provider: null,
        num_results: 5
      });
      setOutput(JSON.stringify(res, null, 2));
    } catch (e) {
      setOutput(e.message);
    }
  };

  const testUpload = async () => {
    if (!isValidSession()) {
      setOutput("⚠️ Invalid session ID");
      return;
    }
    try {
      const file = new Blob(['Test file content'], { type: 'text/plain' });
      const fakeFile = new File([file], 'test.txt');
      const res = await uploadFiles(sessionId, [fakeFile]);
      setOutput(JSON.stringify(res, null, 2));
    } catch (e) {
      setOutput(e.message);
    }
  };

  const testGetMessages = async () => {
    if (!isValidSession()) {
      setOutput("⚠️ Invalid session ID");
      return;
    }
    try {
      const res = await getSessionMessages(sessionId);
      setOutput(JSON.stringify(res, null, 2));
    } catch (e) {
      setOutput(e.message);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>🔌 API Test Panel</h2>
      <div>
        <label>
          Session ID:{' '}
          <input
            type="number"
            value={sessionId}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              if (!isNaN(value)) {
                setSessionId(value);
              } else {
                setSessionId(0);
              }
            }}
          />
        </label>
      </div>
      <button onClick={testChat}>Test /session/chat</button>
      <button onClick={testSummary}>Test /summary</button>
      <button onClick={testSearch}>Test /web</button>
      <button onClick={testUpload}>Test /upload (fake .txt)</button>
      <button onClick={testGetMessages}>Test /session/{'{session_id}'}/messages</button>
      <pre style={{ whiteSpace: 'pre-wrap', marginTop: '1rem' }}>{output}</pre>
    </div>
  );
}

export default TestAPI;
