const BASE_URL = 'http://127.0.0.1:8000';

// Generic POST request
async function postRequest(endpoint, body) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Request to ${endpoint} failed with status ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error(`Error in postRequest to ${endpoint}:`, error);
    throw error;
  }
}

// ========== CHAT ==========
export async function postChat({ message, session_id, enable_reasoning = false, enable_web_search = false, enable_document_search = false, reasoning_type = null }) {
  return postRequest('/session/chat', {
    message,
    session_id,
    enable_reasoning,
    enable_web_search,
    enable_document_search,
    reasoning_type,
  });
}

// ========== SESSION ==========
export async function createSession(name) {
  try {
    const res = await fetch(`${BASE_URL}/session/create?name=${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `Failed to create session. Status: ${res.status}`);
    }

    const result = await res.json();
    console.log("Create session API response:", result); // Debug log
    return result;
  } catch (error) {
    console.error("Error in createSession:", error);
    throw error;
  }
}

export async function getCurrentSession() {
  try {
    const res = await fetch(`${BASE_URL}/session/current`);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || 'Failed to get current session');
    }
    return res.json();
  } catch (error) {
    console.error("Error in getCurrentSession:", error);
    throw error;
  }
}

export async function listSessions() {
  try {
    const res = await fetch(`${BASE_URL}/session/all`);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || 'Failed to list sessions');
    }
    const result = await res.json();
    console.log("List sessions API response:", result); // Debug log
    return result;
  } catch (error) {
    console.error("Error in listSessions:", error);
    throw error;
  }
}

export async function renameSession(session_id, new_name) {
  try {
    console.log(`API: Renaming session ${session_id} to "${new_name}"`);
    
    // Send new_name as a query parameter instead of in the body
    const response = await fetch(`${BASE_URL}/session/${session_id}?new_name=${encodeURIComponent(new_name)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      // No body needed since we're using query parameters
    });

    console.log('Rename response status:', response.status);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorText = await response.text();
        console.error('Rename API error response text:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorData.detail || errorText;
        } catch {
          errorMessage = errorText || errorMessage;
        }
      } catch (textError) {
        console.error('Could not read error response:', textError);
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('Rename API success:', result);
    
    return result;
    
  } catch (error) {
    console.error('renameSession API error:', error);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server');
    }
    
    throw error;
  }
}

export async function clearAllSessions() {
  try {
    const res = await fetch(`${BASE_URL}/session/clear`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to clear all sessions');
    return res.json();
  } catch (error) {
    console.error("Error in clearAllSessions:", error);
    throw error;
  }
}

export async function deleteSession(session_id) {
  try {
    const res = await fetch(`${BASE_URL}/session/${session_id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete session');
    return res.json();
  } catch (error) {
    console.error("Error in deleteSession:", error);
    throw error;
  }
}

// ========== MESSAGES & DOCUMENTS ==========
export async function getSessionMessages(session_id) {
  try {
    const res = await fetch(`${BASE_URL}/session/${session_id}/messages`);
    if (!res.ok) {
      if (res.status === 404) {
        console.log("No messages found for session:", session_id);
        return { messages: [], documents: [] };
      }
      const errorText = await res.text();
      throw new Error(errorText || 'Failed to get messages');
    }
    const result = await res.json();
    console.log("Session messages API response for session", session_id, ":", result);
    
    // Handle different possible response structures from your backend
    if (result && typeof result === 'object') {
      // If it has messages and documents properties
      if (result.messages || result.documents) {
        return {
          messages: result.messages || [],
          documents: result.documents || []
        };
      }
      // If it's directly an array of messages
      else if (Array.isArray(result)) {
        return { messages: result, documents: [] };
      }
    }
    
    // Fallback
    return { messages: [], documents: [] };
  } catch (error) {
    console.error("Error in getSessionMessages:", error);
    // Return empty structure instead of throwing
    return { messages: [], documents: [] };
  }
}

export async function getDocuments(session_id) {
  try {
    const res = await fetch(`${BASE_URL}/documents/${session_id}`);
    if (!res.ok) {
      // If 404, it means no documents exist for this session, which is normal
      if (res.status === 404) {
        console.log("No documents found for session:", session_id);
        return [];
      }
      const errorText = await res.text();
      throw new Error(errorText || 'Failed to fetch documents');
    }
    const result = await res.json();
    console.log("Documents API response for session", session_id, ":", result);
    
    // Based on your backend, the response should be an array of documents
    // Each document has: {id, filename, text_preview}
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Error in getDocuments:", error);
    // Return empty array for 404 or network errors - don't break the UI
    if (error.message.includes('404') || error.message.includes('No documents found')) {
      return [];
    }
    // For other errors, still return empty array but log the error
    console.warn("Returning empty documents array due to error:", error.message);
    return [];
  }
}

// ========== UPLOAD ==========
export async function uploadFiles(session_id, files) {
  try {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }

    const res = await fetch(`${BASE_URL}/upload?session_id=${session_id}`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error('File upload failed');
    return res.json();
  } catch (error) {
    console.error("Error in uploadFiles:", error);
    throw error;
  }
}

// ========== SUMMARY ==========
export async function postSummary({ message_id, format }) {
  try {
    const formData = new FormData();
    formData.append('message_id', message_id);
    formData.append('format', format);

    const res = await fetch(`${BASE_URL}/summarize`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error('Summary failed');
    return res.json();
  } catch (error) {
    console.error("Error in postSummary:", error);
    throw error;
  }
}

// ========== SEARCH ==========
export async function webSearch({ query, search_provider, num_results }) {
  return postRequest('/web', { query, search_provider, num_results });
}

export async function documentSearch({ query, session_id }) {
  return postRequest('/search/documents', { query, session_id });
}

export async function combinedSearch({ query, session_id, include_web, include_documents, search_provider = null, web_results_limit = 5 }) {
  return postRequest('/combined', {
    query,
    session_id,
    include_web,
    include_documents,
    search_provider,
    web_results_limit,
  });
}

// ========== SEARCH: Plain Search ==========
export async function postSearch({ query }) {
  return postRequest('/search', { query });
}


// Fixed exportSession function in api.js
export async function exportSession(session_id, format = "pdf") {
  try {
    console.log(`API: Exporting session ${session_id} as ${format}`);
    
    // First, get the session messages to find the latest message ID
    const messagesResponse = await getSessionMessages(session_id);
    const messages = messagesResponse.messages || [];
    
    if (messages.length === 0) {
      throw new Error("No messages found in this session to export");
    }

    // Find the latest bot message (assuming that's what we want to export)
    const botMessages = messages.filter(msg => msg.sender === "bot" || msg.sender === "assistant");
    if (botMessages.length === 0) {
      throw new Error("No bot responses found to export");
    }

    const latestBotMessage = botMessages[botMessages.length - 1];
    const messageId = latestBotMessage.id;

    // Create a filename based on session and timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `session_${session_id}_export_${timestamp}.${format}`;
    const filePath = `/exports/${filename}`;

    console.log(`Exporting message ${messageId} to ${filePath}`);

    // Send parameters as query parameters, not in the body
    const queryParams = new URLSearchParams({
      message_id: messageId.toString(),
      file_path: filePath,
      format: format
    });

    const response = await fetch(`${BASE_URL}/export?${queryParams}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // No body needed since we're using query parameters
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorText = await response.text();
        console.error('Export API error response:', errorText);
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorData.detail || errorText;
        } catch {
          errorMessage = errorText || errorMessage;
        }
      } catch (textError) {
        console.error('Could not read error response:', textError);
      }
      throw new Error(errorMessage);
    }

    // The response should be the file blob
    const blob = await response.blob();

    // Create a download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    console.log('Export completed successfully');
    return { success: true, filename };

  } catch (error) {
    console.error('exportSession API error:', error);
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server');
    }
    throw error;
  }
}
