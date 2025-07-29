// src/components/chat/ChatInterface.jsx

import React, { useEffect, useState, useRef, useCallback } from "react";
import ReactMarkdown from 'react-markdown';

import {
  postChat as sendMessage,
  getSessionMessages as fetchSessionMessages,
  getDocuments,
  uploadFiles,
  postSummary,
  webSearch,
  documentSearch,
} from "../../utils/api.js";

const ChatInterface = ({ sessionId, tools, onToolsChange, onDocumentsUpdate }) => {
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [input, setInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summarizing, setSummarizing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Drag and drop states
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const bottomRef = useRef();
  const dropZoneRef = useRef();
  const fileInputRef = useRef();

  // Supported file extensions
  const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".docx", ".md", ".rtf"];

  // Function to detect if message contains web search request
  const containsWebSearchRequest = (text) => {
    const webSearchKeywords = [
      'search the web', 'web search', 'search for', 'look up', 'find information',
      'search online', 'google', 'bing', 'search', 'latest news', 'current',
      'recent information', 'what\'s new', 'update on', 'search internet'
    ];
    const lowerText = text.toLowerCase();
    return webSearchKeywords.some(keyword => lowerText.includes(keyword));
  };

  // Function to detect if message contains document search request
  const containsDocumentSearchRequest = (text) => {
    const docSearchKeywords = [
      'search documents', 'find in documents', 'document search', 'search my files',
      'look in documents', 'search uploaded', 'find in files', 'document query'
    ];
    const lowerText = text.toLowerCase();
    return docSearchKeywords.some(keyword => lowerText.includes(keyword));
  };

  // Function to perform web search
  const performWebSearch = async (query) => {
    try {
      setIsSearching(true);
      
      const searchingMessage = {
        id: Date.now(),
        sender: "bot",
        content: `🔍 Searching the web for: "${query}"...`,
        isSearchMessage: true,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, searchingMessage]);

      const searchResponse = await webSearch({ 
        query,
        search_provider: "auto",
        num_results: 5 
      });

      if (searchResponse?.type === "web_search_result" && searchResponse.sources?.length > 0) {
        // Format search results with proper markdown links
        const formattedResults = searchResponse.sources.map((result, index) => (
          `${index + 1}. [${result.title}](${result.url})\n` +
          `> ${result.snippet}\n\n`
        )).join('');

        const resultsMessage = {
          id: Date.now() + 1,
          sender: "bot",
          content: `🌐 **Web Search Results:**\n\n${formattedResults}`,
          isSearchResultMessage: true,
          searchResults: searchResponse.sources,
          timestamp: new Date().toISOString()
        };

        // Update the searching message with results
        setMessages(prev => prev.map(msg =>
          msg.id === searchingMessage.id ? resultsMessage : msg
        ));

        return searchResponse.sources;
      } else {
        // No results found
        const noResultsMessage = {
          id: Date.now() + 1,
          sender: "bot",
          content: `❌ No web search results found for "${query}". Please try a different search term.`,
          isSearchMessage: true,
          timestamp: new Date().toISOString()
        };

        setMessages(prev => prev.map(msg =>
          msg.id === searchingMessage.id ? noResultsMessage : msg
        ));

        return [];
      }
    } catch (error) {
      console.error("Web search failed:", error);
     
      const errorMessage = {
        id: Date.now() + 1,
        sender: "bot",
        content: `⚠️ Web search failed: ${error.message}. Please try again.`,
        isSearchMessage: true,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => prev.map(msg =>
        msg.id === searchingMessage.id ? errorMessage : msg
      ));

      return [];
    } finally {
      setIsSearching(false);
    }
  };

  // Function to perform document search
  const performDocumentSearch = async (query) => {
    try {
      setIsSearching(true);
     
      // Add searching message
      const searchingMessage = {
        id: Date.now(),
        sender: "bot",
        content: `📄 Searching documents for: "${query}"...`,
        isDocumentSearchMessage: true,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, searchingMessage]);

      const searchResponse = await documentSearch({
        query: query,
        session_id: sessionId
      });

      if (searchResponse && searchResponse.results && searchResponse.results.length > 0) {
        // Format document search results
        let resultsText = `📄 **Document Search Results for "${query}":**\n\n`;
       
        searchResponse.results.forEach((result, index) => {
          resultsText += `**${index + 1}. ${result.filename}**\n`;
          resultsText += `${result.snippet}\n`;
          resultsText += `*Similarity Score: ${(result.similarity_score * 100).toFixed(1)}%*\n\n`;
        });

        const resultsMessage = {
          id: Date.now() + 1,
          sender: "bot",
          content: resultsText,
          isDocumentSearchResultMessage: true,
          searchResults: searchResponse.results,
          timestamp: new Date().toISOString()
        };

        // Update the searching message with results
        setMessages(prev => prev.map(msg =>
          msg.id === searchingMessage.id ? resultsMessage : msg
        ));

        return searchResponse.results;
      } else {
        // No results found
        const noResultsMessage = {
          id: Date.now() + 1,
          sender: "bot",
          content: `❌ No document search results found for "${query}". Make sure you have uploaded relevant documents.`,
          isDocumentSearchMessage: true,
          timestamp: new Date().toISOString()
        };

        setMessages(prev => prev.map(msg =>
          msg.id === searchingMessage.id ? noResultsMessage : msg
        ));

        return [];
      }

    } catch (error) {
      console.error("Document search failed:", error);
     
      const errorMessage = {
        id: Date.now() + 1,
        sender: "bot",
        content: `⚠️ Document search failed: ${error.message}. Please try again.`,
        isDocumentSearchMessage: true,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => prev.map(msg =>
        msg.id === searchingMessage.id ? errorMessage : msg
      ));

      return [];
    } finally {
      setIsSearching(false);
    }
  };

  // Validate file types
  const validateFiles = (files) => {
    const validFiles = [];
    const invalidFiles = [];
   
    Array.from(files).forEach(file => {
      const fileName = file.name.toLowerCase();
      const isValid = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
     
      if (isValid) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });
   
    return { validFiles, invalidFiles };
  };

  // Drag and drop event handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev - 1);
    if (dragCounter - 1 === 0) {
      setIsDragOver(false);
    }
  }, [dragCounter]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragCounter(0);
   
    if (loading || summarizing || isSearching) return;
   
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const { validFiles, invalidFiles } = validateFiles(files);
     
      if (invalidFiles.length > 0) {
        const errorMessage = {
          id: Date.now(),
          sender: "bot",
          content: `⚠️ Unsupported file types: ${invalidFiles.join(", ")}. Supported formats: ${ALLOWED_EXTENSIONS.join(", ")}`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
     
      if (validFiles.length > 0) {
        setSelectedFiles(prev => [...prev, ...validFiles]);
      }
    }
  }, [loading, summarizing, isSearching]);

  // Set up drag and drop event listeners
  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    dropZone.addEventListener('dragenter', handleDragEnter);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('drop', handleDrop);

    return () => {
      dropZone.removeEventListener('dragenter', handleDragEnter);
      dropZone.removeEventListener('dragleave', handleDragLeave);
      dropZone.removeEventListener('dragover', handleDragOver);
      dropZone.removeEventListener('drop', handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  // Handle file input change
  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const { validFiles, invalidFiles } = validateFiles(files);
     
      if (invalidFiles.length > 0) {
        const errorMessage = {
          id: Date.now(),
          sender: "bot",
          content: `⚠️ Unsupported file types: ${invalidFiles.join(", ")}. Supported formats: ${ALLOWED_EXTENSIONS.join(", ")}`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
     
      if (validFiles.length > 0) {
        setSelectedFiles(prev => [...prev, ...validFiles]);
      }
    }
    // Reset file input
    e.target.value = '';
  };

  // Remove selected file
  const removeSelectedFile = (indexToRemove) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // Load session data
  useEffect(() => {
    if (!sessionId) return;

    const loadSession = async () => {
      try {
        setLoading(true);
        setError(null);

        const [messagesResponse, documentsResponse] = await Promise.all([
          fetchSessionMessages(sessionId).catch(err => {
            console.error("Error loading messages:", err);
            return { messages: [], documents: [] };
          }),
          getDocuments(sessionId).catch(err => {
            console.error("Error loading documents:", err);
            return [];
          })
        ]);

        let sessionMessages = [];
        if (messagesResponse) {
          if (messagesResponse.messages && Array.isArray(messagesResponse.messages)) {
            sessionMessages = messagesResponse.messages;
          } else if (Array.isArray(messagesResponse)) {
            sessionMessages = messagesResponse;
          }
        }

        let sessionDocuments = [];
        if (Array.isArray(documentsResponse)) {
          sessionDocuments = documentsResponse;
        }

        if (sessionDocuments.length > 0) {
          const existingDocMessages = sessionMessages.filter(msg =>
            msg.isDocumentMessage || (msg.content && msg.content.includes('📄'))
          );

          const documentsWithoutMessages = sessionDocuments.filter(doc =>
            !existingDocMessages.some(msg => msg.content && msg.content.includes(doc.filename))
          );

          if (documentsWithoutMessages.length > 0) {
            const documentMessages = documentsWithoutMessages.map((doc, index) => ({
              id: `doc-${doc.id}-${Date.now()}-${index}`,
              sender: "bot",
              content: `📄 **${doc.filename}**\n\n${doc.text_preview ? doc.text_preview.substring(0, 500) + (doc.text_preview.length > 500 ? '...' : '') : "Document available for search."}`,
              isDocumentMessage: true,
              timestamp: new Date().toISOString()
            }));

            sessionMessages = [...documentMessages, ...sessionMessages];
          }
        }

        setMessages(sessionMessages);
        setDocuments(sessionDocuments);
        
        // Update documents count in parent
        if (onDocumentsUpdate) {
          onDocumentsUpdate(sessionDocuments.length);
        }

      } catch (err) {
        console.error("Error in loadSession:", err);
        setError("Failed to load chat history.");
        setMessages([]);
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  // Check for summarize request
  const containsSummarizeRequest = (text) => {
    const summarizeKeywords = [
      'summarize', 'summary', 'sum up', 'brief', 'tldr', 't;dr',
      'overview', 'recap', 'digest', 'abstract', 'outline'
    ];
    const lowerText = text.toLowerCase();
    return summarizeKeywords.some(keyword => lowerText.includes(keyword));
  };

  // Handle summarization
  const handleSummarization = async (messageId, format = 'paragraph') => {
    try {
      setSummarizing(true);

      const response = await postSummary({
        message_id: messageId,
        format: format
      });

      if (response && response.response) {
        const summaryMessage = {
          id: Date.now() + Math.random(),
          sender: "bot",
          content: `📋 **Summary (${format}):**\n\n${response.response}`,
          isSummaryMessage: true,
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, summaryMessage]);
      }

    } catch (error) {
      console.error("Summarization failed:", error);
      const errorMessage = {
        id: Date.now() + Math.random(),
        sender: "bot",
        content: "⚠️ Failed to generate summary. Please try again.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setSummarizing(false);
    }
  };

  const summarizeLastMessage = useCallback(() => {
    const lastBotMessage = messages
      .filter(msg => msg.sender === "bot" && !msg.isSummaryMessage && !msg.isDocumentMessage)
      .pop();

    if (lastBotMessage) {
      const format = tools.summaryFormat || 'paragraph';
      handleSummarization(lastBotMessage.id, format);
    } else {
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: "bot",
        content: "⚠️ No message found to summarize.",
        timestamp: new Date().toISOString()
      }]);
    }
  }, [messages, tools.summaryFormat]);

  useEffect(() => {
    if (onToolsChange) {
      onToolsChange({ summarizeLastMessage });
    }
  }, [onToolsChange, summarizeLastMessage]);

  // Main send message handler
  const handleSend = async () => {
    if (!input.trim() && selectedFiles.length === 0) return;

    setLoading(true);

    // Handle file uploads first
    if (selectedFiles.length > 0) {
      try {
        const res = await uploadFiles(sessionId, selectedFiles);
        console.log("Upload response:", res);

        if (res?.uploaded_files?.length > 0) {
          const uploadedMessages = res.uploaded_files.map((file) => ({
            id: `upload-${file.document_id}-${Date.now()}`,
            sender: "bot",
            content: `📄 **${file.filename}** uploaded successfully.\n\n${file.text_preview ? file.text_preview.substring(0, 200) + (file.text_preview.length > 200 ? '...' : '') : "Document ready for AI queries."}`,
            isDocumentMessage: true,
            timestamp: new Date().toISOString()
          }));

          setMessages((prev) => [...prev, ...uploadedMessages]);

          const newDocuments = res.uploaded_files.map(file => ({
            id: file.document_id,
            filename: file.filename,
            text_preview: file.text_preview,
          }));

          setDocuments((prev) => {
            const newDocs = [...prev, ...newDocuments];
            // Update documents count in parent
            if (onDocumentsUpdate) {
              onDocumentsUpdate(newDocs.length);
            }
            return newDocs;
          });
        }

        setSelectedFiles([]);

      } catch (uploadErr) {
        console.error("File upload failed:", uploadErr);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: "bot",
            content: "⚠️ File upload failed.",
            timestamp: new Date().toISOString()
          },
        ]);
        setLoading(false);
        return;
      }
    }

    const messageToSend = input.trim();
    let userMsg = null;

    if (messageToSend) {
      userMsg = {
        id: Date.now(),
        sender: "user",
        content: messageToSend,
        timestamp: new Date().toISOString()
      };

      setMessages((prev) => [...prev, userMsg]);
    }

    // Search/summarization detection
    const isAutoSummarizeRequest = containsSummarizeRequest(messageToSend);
    const isWebSearchRequest = containsWebSearchRequest(messageToSend);
    const isDocumentSearchRequest = containsDocumentSearchRequest(messageToSend);

    // Define trigger phrases for implicit search
    const webTriggerPhrases = [
      "search the web for", "look up online", "find information about",
      "what is", "who is", "where is", "latest news", "web search", "google"
    ];

    const docTriggerPhrases = [
      "search my documents", "find in files", "look in documents",
      "search uploaded", "document search", "find in my files"
    ];

    const lower = messageToSend.toLowerCase();
    const isTriggeredWebSearch = webTriggerPhrases.some(p => lower.includes(p));
    const isTriggeredDocSearch = docTriggerPhrases.some(p => lower.includes(p));

    const shouldDoWebSearch = tools.webSearch && (isWebSearchRequest || isTriggeredWebSearch);
    const shouldDoDocumentSearch = tools.documentSearch && (isDocumentSearchRequest || isTriggeredDocSearch || documents.length > 0);

    setInput("");

    // Handle direct summarization
    if (isAutoSummarizeRequest && tools.summarization && messageToSend) {
      try {
        const lastBotMessage = messages
          .filter(msg => msg.sender === "bot" && !msg.isSummaryMessage && !msg.isDocumentMessage)
          .pop();

        if (lastBotMessage) {
          const format = tools.summaryFormat || 'paragraph';
          await handleSummarization(lastBotMessage.id, format);
        } else {
          setMessages(prev => [...prev, {
            id: Date.now(),
            sender: "bot",
            content: "⚠️ No previous message found to summarize.",
            timestamp: new Date().toISOString()
          }]);
        }

      } catch (error) {
        console.error("Direct summarization failed:", error);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 3,
            sender: "bot",
            content: "⚠️ Failed to generate summary.",
            timestamp: new Date().toISOString()
          },
        ]);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      let searchResults = [];

      // Perform web search if enabled
      if (shouldDoWebSearch) {
        try {
          const rawResults = await performWebSearch(messageToSend);
          if (Array.isArray(rawResults) && rawResults.length > 0) {
            searchResults = rawResults.map(
              (res) => `🔗 [${res.title}](${res.link || res.url})\n> ${res.snippet}`
            );
          }
        } catch (searchErr) {
          console.error("Web search error:", searchErr);
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 1,
              sender: "bot",
              content: `⚠️ Web search failed: ${searchErr.message || searchErr}`,
              timestamp: new Date().toISOString()
            },
          ]);
        }
      }

      // Perform document search if enabled
      if (shouldDoDocumentSearch) {
        try {
          await performDocumentSearch(messageToSend);
        } catch (searchErr) {
          console.error("Document search error:", searchErr);
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 2,
              sender: "bot",
              content: `⚠️ Document search failed: ${searchErr.message || searchErr}`,
              timestamp: new Date().toISOString()
            },
          ]);
        }
      }

      // Send message to LLM
      const res = await sendMessage({
        session_id: sessionId,
        message: messageToSend,
        enable_reasoning: tools.chainOfThought || true,
        enable_document_search: shouldDoDocumentSearch,
        enable_web_search: shouldDoWebSearch,
        reasoning_type: "hybrid",
      });

      const botMessage = {
        id: Date.now() + 3,
        sender: "bot",
        content: res?.response || "No response received.",
        reasoning_output: res?.reasoning_output,
        metadata: res?.metadata,
        searchResults: searchResults,
        timestamp: new Date().toISOString()
      };

      setMessages((prev) => [...prev, botMessage]);

      // Auto-summarize if requested
      if (isAutoSummarizeRequest && tools.summarization) {
        const format = tools.summaryFormat || 'paragraph';
        setTimeout(() => handleSummarization(botMessage.id, format), 500);
      }

    } catch (e) {
      console.error("Error sending message:", e);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 4,
          sender: "bot",
          content: `⚠️ Failed to send message: ${e.message}`,
          timestamp: new Date().toISOString()
        },
      ]);
    }

    setLoading(false);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Loading state
  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-col h-full p-4 overflow-hidden bg-white">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Loading session...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={dropZoneRef}
      className="flex flex-col h-full overflow-hidden bg-white relative"
    >
      {/* Full-screen drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-100 bg-opacity-95 border-4 border-dashed border-blue-400 flex items-center justify-center z-50">
          <div className="text-center text-blue-600 bg-white p-8 rounded-xl shadow-lg border-2 border-blue-300">
            <div className="text-6xl mb-4">📁</div>
            <div className="text-2xl font-bold mb-2">Drop files here to upload</div>
            <div className="text-lg">Supported formats: {ALLOWED_EXTENSIONS.join(", ")}</div>
            <div className="text-sm text-blue-500 mt-2">Release to upload your documents</div>
          </div>
        </div>
      )}

      <div className="p-4 flex-shrink-0">
        {error && <div className="text-red-600 font-semibold mb-2">{error}</div>}
       
        {/* Web search status indicator */}
        {tools.webSearch && (
          <div className="mb-2 p-2 bg-green-50 rounded-lg border border-green-200">
            <div className="text-sm text-green-700 font-medium">
              🌐 Web Search: Enabled
            </div>
            <div className="text-xs text-green-600 mt-1">
              All messages will include web search results
            </div>
          </div>
        )}

        {/* Document search status indicator */}
        {tools.documentSearch && (
          <div className="mb-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-700 font-medium">
              📄 Document Search: Enabled
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Messages will search through uploaded documents
            </div>
          </div>
        )}

        {documents.length > 0 && (
          <div className="mb-2 p-2 bg-blue-50 rounded-lg border">
            <div className="text-sm text-blue-700 font-medium">
              📄 Documents in this session: {documents.length}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              {documents.map(doc => doc.filename).join(", ")}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto space-y-4 pr-2 px-4 mb-4">
        {messages.length === 0 && !loading && (
          <div className="text-gray-500 text-center py-8">
            <div className="text-lg mb-2">No messages yet.</div>
            <div className="text-sm">
              Drag and drop files here or use the upload button below
            </div>
            <div className="text-xs mt-2 text-gray-400">
              Try: "Search the web for latest AI news" or "Search my documents for..."
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={msg.id || i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`p-3 rounded-xl whitespace-pre-wrap max-w-[75%] ${
              msg.sender === "user"
                ? "bg-blue-100 text-right"
                : msg.isDocumentMessage
                ? "bg-green-50 text-left border border-green-200"
                : msg.isSummaryMessage
                ? "bg-yellow-50 text-left border border-yellow-200"
                : msg.isSearchMessage || msg.isSearchResultMessage
                ? "bg-purple-50 text-left border border-purple-200"
                : msg.isDocumentSearchMessage || msg.isDocumentSearchResultMessage
                ? "bg-orange-50 text-left border border-orange-200"
                : "bg-gray-100 text-left"
            }`}>
              <ReactMarkdown
                components={{
                  a: ({node, ...props}) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline" />
                  )
                }}
              >
                {msg.content}
              </ReactMarkdown>
             
              {msg.reasoning_output && (
                <div className="mt-2 text-xs text-gray-500 border-t pt-2">
                  <strong>Reasoning:</strong> {msg.reasoning_output}
                </div>
              )}
             
              {msg.isDocumentMessage && (
                <div className="mt-1 text-xs text-green-600 italic">
                  Document ready for AI queries
                </div>
              )}
             
              {msg.isSummaryMessage && (
                <div className="mt-1 text-xs text-yellow-600 italic">
                  AI-generated summary
                </div>
              )}
             
              {(msg.isSearchMessage || msg.isSearchResultMessage) && (
                <div className="mt-1 text-xs text-purple-600 italic">
                  {msg.isSearchResultMessage ? "Web search results" : "Web search in progress"}
                </div>
              )}

              {(msg.isDocumentSearchMessage || msg.isDocumentSearchResultMessage) && (
                <div className="mt-1 text-xs text-orange-600 italic">
                  {msg.isDocumentSearchResultMessage ? "Document search results" : "Document search in progress"}
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <div className="p-4 flex-shrink-0">
        {/* Selected files preview */}
        {selectedFiles.length > 0 && (
          <div className="mb-2 p-2 bg-gray-50 rounded-lg border">
            <div className="text-sm text-gray-700 font-medium mb-2">
              Selected files ({selectedFiles.length}):
            </div>
            <div className="space-y-1">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between text-xs bg-white p-2 rounded border">
                  <span className="flex-1 truncate">{file.name}</span>
                  <span className="mx-2 text-gray-500">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                  <button
                    onClick={() => removeSelectedFile(index)}
                    className="text-red-500 hover:text-red-700 ml-2"
                    disabled={loading || summarizing || isSearching}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            className="flex-1 border rounded-lg px-3 py-2"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && !summarizing && !isSearching && handleSend()}
            placeholder={
              tools.webSearch && tools.documentSearch
                ? "Type your message (web & document search enabled)..."
                : tools.webSearch
                ? "Type your message (web search enabled)..."
                : tools.documentSearch && documents.length > 0
                ? "Type your message (document search enabled)..."
                : "Type your message or 'search the web for...'"
            }
            disabled={loading || summarizing || isSearching}
          />
         
          <label className="bg-gray-200 px-3 py-2 rounded-lg cursor-pointer text-sm hover:bg-gray-300">
            📎 Upload
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ALLOWED_EXTENSIONS.join(",")}
              onChange={handleFileInputChange}
              className="hidden"
              disabled={loading || summarizing || isSearching}
            />
          </label>

          <button
            onClick={handleSend}
            disabled={loading || summarizing || isSearching || (!input.trim() && selectedFiles.length === 0)}
            className={`px-4 py-2 rounded-lg ${
              loading || summarizing || isSearching || (!input.trim() && selectedFiles.length === 0)
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            {loading ? "Sending..." : summarizing ? "Summarizing..." : isSearching ? "Searching..." : "Send"}
          </button>
        </div>

        {/* Status indicators */}
        {summarizing && (
          <div className="mt-2 text-sm text-blue-600 animate-pulse">
            🔄 Generating summary...
          </div>
        )}
       
        {isSearching && (
          <div className="mt-2 text-sm text-purple-600 animate-pulse">
            🔍 Searching...
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;