// src/components/chat/ChatInterface.jsx

import React, { useEffect, useState, useRef, useCallback } from "react";
import ReactMarkdown from 'react-markdown';
import {
  Input,
  Button,
  Card,
  Tag,
  Alert,
  Spin,
  Upload,
  Typography,
  Divider,
  message,
  Collapse,
  Space,
  Badge,
  Tooltip,
  Avatar,
  Empty
} from 'antd';
import {
  SendOutlined,
  PaperClipOutlined,
  LoadingOutlined,
  SearchOutlined,
  FileTextOutlined,
  CloseOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  DownOutlined,
  UserOutlined,
  RobotOutlined,
  CloudUploadOutlined
} from '@ant-design/icons';
import {
  postChat as sendMessage,
  getSessionMessages as fetchSessionMessages,
  getDocuments,
  uploadFiles,
} from "../../utils/api.js";

const { TextArea } = Input;
const { Text, Title } = Typography;
const { Panel } = Collapse;

const ChatInterface = ({ sessionId, tools, onToolsChange, onDocumentsUpdate }) => {
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [input, setInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summarizing, setSummarizing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Drag and drop states
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const bottomRef = useRef();
  const dropZoneRef = useRef();
  const fileInputRef = useRef();
  const messagesContainerRef = useRef();

  // Supported file extensions
  const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".docx", ".md", ".rtf"];

  // Count active tools for badge
  const activeToolsCount = Object.values(tools).filter(Boolean).length;

  // Scroll to bottom function
  const scrollToBottom = useCallback((smooth = true) => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ 
        behavior: smooth ? "smooth" : "auto",
        block: "end"
      });
    }
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    // Use setTimeout to ensure DOM has updated
    const timer = setTimeout(() => {
      scrollToBottom(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [messages, scrollToBottom]);

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
   
    if (loading || summarizing) return;
   
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
  }, [loading, summarizing, validateFiles]);

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
  const handleFileInputChange = useCallback(({ fileList }) => {
    if (fileList && fileList.length > 0) {
      const files = fileList.map(f => f.originFileObj);
      const { validFiles, invalidFiles } = validateFiles(files);
     
      if (invalidFiles.length > 0) {
        message.error(`Unsupported file types: ${invalidFiles.join(", ")}`);
      }
     
      if (validFiles.length > 0) {
        setSelectedFiles(prev => [...prev, ...validFiles]);
      }
    }
  }, [validateFiles]);

  // Remove selected file
  const removeSelectedFile = (indexToRemove) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // Load session data - FIXED VERSION
  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      setDocuments([]);
      setInitialLoading(false);
      return;
    }

    const loadSession = async () => {
      try {
        setInitialLoading(true);
        setError(null);
        
        console.log(`Loading session: ${sessionId}`);
        
        const [messagesResponse, documentsResponse] = await Promise.all([
          fetchSessionMessages(sessionId).catch(err => {
            console.error("Error loading messages:", err);
            return { messages: [] };
          }),
          getDocuments(sessionId).catch(err => {
            console.error("Error loading documents:", err);
            return [];
          })
        ]);

        console.log("Messages response:", messagesResponse);
        console.log("Documents response:", documentsResponse);

        let sessionMessages = [];
        if (messagesResponse) {
          if (messagesResponse.messages && Array.isArray(messagesResponse.messages)) {
            sessionMessages = messagesResponse.messages;
          } else if (Array.isArray(messagesResponse)) {
            sessionMessages = messagesResponse;
          }
        }

        // Ensure all messages have required properties and fix user message content
        sessionMessages = sessionMessages.map(msg => ({
          id: msg.id || `${Date.now()}-${Math.random()}`,
          sender: msg.sender || (msg.role === 'user' ? 'user' : 'bot'),
          content: msg.content || msg.message || msg.text || '',
          reasoning_output: msg.reasoning_output,
          metadata: msg.metadata,
          insights: msg.insights,
          timestamp: msg.timestamp || new Date().toISOString(),
          isDocumentMessage: msg.isDocumentMessage || false,
          isSummaryMessage: msg.isSummaryMessage || false
        })).filter(msg => msg.content); // Filter out messages with no content

        console.log("Processed messages:", sessionMessages);

        let sessionDocuments = [];
        if (Array.isArray(documentsResponse)) {
          sessionDocuments = documentsResponse;
        }

        // Create document upload messages for existing documents
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

        // Scroll to bottom after loading
        setTimeout(() => {
          scrollToBottom(false); // Don't animate on load
        }, 200);

      } catch (err) {
        console.error("Error in loadSession:", err);
        setError("Failed to load chat history.");
        setMessages([]);
        setDocuments([]);
      } finally {
        setInitialLoading(false);
      }
    };

    loadSession();
  }, [sessionId, onDocumentsUpdate, scrollToBottom]);

  // Check for summarize request
  const containsSummarizeRequest = (text) => {
    const summarizeKeywords = [
      'summarize', 'summary', 'sum up', 'brief', 'tldr', 't;dr',
      'overview', 'recap', 'digest', 'abstract', 'outline'
    ];
    const lowerText = text.toLowerCase();
    return summarizeKeywords.some(keyword => lowerText.includes(keyword));
  };

  // Check for web search request
  const containsWebSearchRequest = (text) => {
    const webSearchKeywords = [
      'search the web', 'web search', 'google', 'find online', 'look up',
      'search for', 'what\'s the latest', 'current news', 'recent', 'today'
    ];
    const lowerText = text.toLowerCase();
    return webSearchKeywords.some(keyword => lowerText.includes(keyword));
  };

  // Handle summarization using the chat endpoint (since backend handles it there)
  const handleSummarization = async () => {
    try {
      setSummarizing(true);
      
      // Send a summarize request through the regular chat endpoint
      const response = await sendMessage({
        session_id: sessionId,
        message: "Please provide a summary of our conversation.",
        enable_reasoning: tools.chainOfThought || false,
        enable_document_search: tools.documentSearch || false,
        enable_web_search: tools.webSearch || false,
        enable_insights: tools.insights || false,
        reasoning_type: "hybrid"
      });

      if (response && response.response) {
        const summaryMessage = {
          id: response.message_id || Date.now() + Math.random(),
          sender: "bot",
          content: `📋 **Summary:**\n\n${response.response}`,
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
    handleSummarization();
  }, []);

  useEffect(() => {
    if (onToolsChange) {
      onToolsChange({ summarizeLastMessage });
    }
  }, [onToolsChange, summarizeLastMessage]);

  // Main send message handler - FIXED VERSION
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
      // Create user message with proper content
      userMsg = {
        id: `user-${Date.now()}-${Math.random()}`,
        sender: "user",
        content: messageToSend, // Make sure content is properly set
        timestamp: new Date().toISOString()
      };

      console.log("Adding user message:", userMsg);
      setMessages((prev) => [...prev, userMsg]);
    }

    setInput("");

    // Check if it's a direct summarization request
    const isAutoSummarizeRequest = containsSummarizeRequest(messageToSend);
    const isWebSearchRequest = containsWebSearchRequest(messageToSend);

    try {
      // Determine if web search should be enabled
      const shouldEnableWebSearch = tools.webSearch || isWebSearchRequest;
     
      // Send message to backend with tool settings
      const res = await sendMessage({
        session_id: sessionId,
        message: messageToSend,
        enable_reasoning: tools.chainOfThought || false,
        enable_document_search: tools.documentSearch || false,
        enable_web_search: shouldEnableWebSearch,
        enable_insights: tools.insights || false,
        reasoning_type: "hybrid",
      });

      console.log("Backend response:", res); // Debug log

      // Format the bot response
      let botContent = res?.response || "No response received.";
     
      // Handle web search results if present
      if (res?.metadata?.search_results?.results?.web_results?.length > 0) {
        const webResults = res.metadata.search_results.results.web_results;
        const formattedResults = webResults.map((result, index) => {
          const url = result.url || result.link || '';
          const title = result.title || 'Untitled';
          const snippet = result.snippet || result.description || 'No description available';
         
          return `${index + 1}. **[${title}](${url})**\n> ${snippet}\n`;
        }).join('\n');

        botContent += `\n\n---\n\n🔍 **Web Search Results:**\n\n${formattedResults}`;
      }

      // Handle insights if present
      let insightsDisplay = null;
      if (res?.insights && typeof res.insights === 'object') {
        insightsDisplay = res.insights;
      }

      const botMessage = {
        id: res?.message_id || `bot-${Date.now()}-${Math.random()}`,
        sender: "bot",
        content: botContent,
        reasoning_output: res?.reasoning_output,
        metadata: res?.metadata,
        insights: insightsDisplay,
        timestamp: new Date().toISOString()
      };

      console.log("Adding bot message:", botMessage);
      setMessages((prev) => [...prev, botMessage]);

    } catch (e) {
      console.error("Error sending message:", e);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}-${Math.random()}`,
          sender: "bot",
          content: `⚠️ Failed to send message: ${e.message}`,
          timestamp: new Date().toISOString()
        },
      ]);
    }

    setLoading(false);
  };

  // Loading state for initial session load
  if (initialLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center space-y-4">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} spin />} />
          <div className="space-y-2">
            <Title level={4} className="text-gray-600 m-0">Loading Session</Title>
            <Text type="secondary">Preparing your chat history...</Text>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={dropZoneRef}
      style={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 16, 
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        background: 'linear-gradient(135deg, #fafbfc 0%, #f7fafc 100%)',
        overflow: 'hidden' // CRITICAL: Prevent container overflow
      }}
    >
      {/* Enhanced drag overlay */}
      {isDragOver && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(240, 249, 255, 0.95)',
          border: '4px dashed #40a9ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <Card
            bordered={false}
            style={{ 
              background: 'white', 
              borderRadius: 20, 
              boxShadow: '0 8px 32px rgba(24, 144, 255, 0.2)',
              padding: '32px',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>📁</div>
            <Title level={2} style={{ marginBottom: '16px', color: '#1890ff' }}>Drop Files Here</Title>
            <Text style={{ display: 'block', marginBottom: '8px', fontSize: '16px' }}>Supported formats:</Text>
            <Text code style={{ fontSize: '14px' }}>{ALLOWED_EXTENSIONS.join(", ")}</Text>
            <div style={{ marginTop: '16px' }}>
              <Text type="secondary">Release to upload your documents</Text>
            </div>
          </Card>
        </div>
      )}

      {/* Enhanced header with better tool indicators */}
      <div style={{ 
        padding: '24px',
        backgroundColor: 'white',
        borderBottom: '1px solid #f0f0f0',
        flexShrink: 0 // Prevent header from shrinking
      }}>
        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: '16px', borderRadius: 8 }}
          />
        )}

        {/* Active Tools Display */}
        {activeToolsCount > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Badge count={activeToolsCount} size="small">
                <Title level={5} style={{ margin: 0, color: '#1f1f1f' }}>Active Tools</Title>
              </Badge>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {tools.webSearch && (
                <Tooltip title="AI will search the web for current information">
                  <Card size="small" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <SearchOutlined style={{ color: '#52c41a' }} />
                      <div>
                        <Text strong style={{ fontSize: '13px' }}>Web Search</Text>
                        <div style={{ fontSize: '11px', color: '#52c41a' }}>Active</div>
                      </div>
                    </div>
                  </Card>
                </Tooltip>
              )}
              {tools.documentSearch && (
                <Tooltip title="AI will search through your uploaded documents">
                  <Card size="small" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileTextOutlined style={{ color: '#1890ff' }} />
                      <div>
                        <Text strong style={{ fontSize: '13px' }}>Document Search</Text>
                        <div style={{ fontSize: '11px', color: '#1890ff' }}>Active</div>
                      </div>
                    </div>
                  </Card>
                </Tooltip>
              )}
              {tools.chainOfThought && (
                <Tooltip title="AI will show its reasoning process">
                  <Card size="small" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ThunderboltOutlined style={{ color: '#722ed1' }} />
                      <div>
                        <Text strong style={{ fontSize: '13px' }}>Chain of Thought</Text>
                        <div style={{ fontSize: '11px', color: '#722ed1' }}>Active</div>
                      </div>
                    </div>
                  </Card>
                </Tooltip>
              )}
              {tools.insights && (
                <Tooltip title="AI will generate analytical insights">
                  <Card size="small" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BulbOutlined style={{ color: '#fa8c16' }} />
                      <div>
                        <Text strong style={{ fontSize: '13px' }}>Insights</Text>
                        <div style={{ fontSize: '11px', color: '#fa8c16' }}>Active</div>
                      </div>
                    </div>
                  </Card>
                </Tooltip>
              )}
            </div>
          </div>
        )}

        {/* Enhanced file selection display */}
        {selectedFiles.length > 0 && (
          <Card 
            size="small" 
            style={{ 
              marginBottom: '16px',
              border: '1px solid #d4edda',
              backgroundColor: '#f0f9ff',
              borderRadius: '8px'
            }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CloudUploadOutlined style={{ color: '#1890ff' }} />
                <Text strong style={{ color: '#1890ff' }}>Files Ready for Upload ({selectedFiles.length})</Text>
              </div>
            }
          >
            <div>
              {selectedFiles.map((file, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '8px',
                  marginBottom: '8px',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FileTextOutlined style={{ color: '#1890ff' }} />
                    <div>
                      <Text style={{ fontSize: '14px', fontWeight: '500' }}>{file.name}</Text>
                      <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                        {(file.size / 1024).toFixed(1)} KB
                      </Text>
                    </div>
                  </div>
                  <Button
                    type="text"
                    danger
                    icon={<CloseOutlined />}
                    size="small"
                    onClick={() => removeSelectedFile(index)}
                    disabled={loading || summarizing}
                  />
                </div>
              ))}
            </div>
          </Card>
        )}

        {summarizing && (
          <Card size="small" style={{ 
            marginBottom: '16px',
            border: '1px solid #ffe7ba',
            backgroundColor: '#fff7e6',
            borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 20, color: '#fa8c16' }} spin />} />
              <Text style={{ color: '#fa8c16' }}>Generating conversation summary...</Text>
            </div>
          </Card>
        )}
      </div>

      {/* FIXED: Messages area with proper scrolling */}
      <div style={{ 
        flex: 1,
        overflowY: 'auto', // Enable vertical scrolling
        overflowX: 'hidden', // Prevent horizontal scrolling
        padding: '24px',
        background: '#fafbfc',
        minHeight: 0 // Critical for flex child to be scrollable
      }}>
        {messages.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%' 
          }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div style={{ textAlign: 'center' }}>
                  <Title level={4} style={{ color: '#8c8c8c', margin: 0 }}>Start Your Conversation</Title>
                  <Text type="secondary" style={{ display: 'block', marginTop: '8px' }}>
                    Ask questions, upload documents, or start typing to begin
                  </Text>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                    <Tag icon={<SearchOutlined />} color="blue">Web Search</Tag>
                    <Tag icon={<FileTextOutlined />} color="green">Document Search</Tag>
                    <Tag icon={<BulbOutlined />} color="orange">AI Insights</Tag>
                  </div>
                </div>
              }
            />
          </div>
        ) : (
          <div style={{ paddingBottom: '20px' }}>
            {messages.map((msg, i) => (
              <div key={msg.id || i} style={{ 
                display: 'flex', 
                gap: '12px', 
                marginBottom: '24px',
                justifyContent: msg.sender === "user" ? "flex-end" : "flex-start"
              }}>
                {/* Avatar for bot messages */}
                {msg.sender === "bot" && (
                  <Avatar 
                    icon={<RobotOutlined />} 
                    style={{ backgroundColor: '#1890ff', flexShrink: 0 }}
                    size="default"
                  />
                )}
                
                <Card
                  size="small"
                  style={{
                    maxWidth: '85%',
                    backgroundColor: msg.sender === "user" ? '#1890ff' : 'white',
                    border: msg.sender === "user" ? '1px solid #1890ff' : '1px solid #e0e0e0',
                    borderRadius: 16,
                    boxShadow: msg.sender === "user" 
                      ? "0 4px 12px rgba(24, 144, 255, 0.3)" 
                      : "0 2px 8px rgba(0, 0, 0, 0.06)"
                  }}
                >
                  <div style={{ 
                    padding: '16px',
                    color: msg.sender === "user" ? 'white' : 'inherit'
                  }}>
                    {/* Debug info for empty messages */}
                    {!msg.content && (
                      <div style={{ color: 'red', fontSize: '12px', marginBottom: '8px' }}>
                        [DEBUG: Empty message content - ID: {msg.id}, Sender: {msg.sender}]
                      </div>
                    )}
                    
                    <ReactMarkdown
                      components={{
                        a: ({ node, href, children, ...props }) => (
                          <a
                            {...props}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              textDecoration: 'underline',
                              color: msg.sender === "user" ? '#e6f7ff' : '#1890ff',
                              cursor: 'pointer',
                              fontWeight: '500'
                            }}
                            onClick={(e) => {
                              if (href) {
                                e.preventDefault();
                                window.open(href, '_blank', 'noopener,noreferrer');
                              }
                            }}
                          >
                            {children}
                          </a>
                        ),
                        p: ({ node, ...props }) => <p {...props} style={{ marginBottom: '12px', lineHeight: '1.6' }} />,
                        strong: ({ node, ...props }) => <strong {...props} style={{ fontWeight: '600' }} />,
                        em: ({ node, ...props }) => <em {...props} style={{ fontStyle: 'italic' }} />,
                        code: ({ node, inline, ...props }) =>
                          inline ? (
                            <code {...props} style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '13px',
                              fontFamily: 'monospace',
                              backgroundColor: msg.sender === "user" ? 'rgba(255,255,255,0.2)' : '#f5f5f5',
                              color: msg.sender === "user" ? 'white' : '#1f1f1f'
                            }} />
                          ) : (
                            <code {...props} style={{
                              display: 'block',
                              padding: '12px',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontFamily: 'monospace',
                              overflowX: 'auto',
                              backgroundColor: msg.sender === "user" ? 'rgba(255,255,255,0.2)' : '#f5f5f5',
                              color: msg.sender === "user" ? 'white' : '#1f1f1f'
                            }} />
                          ),
                        blockquote: ({ node, ...props }) => (
                          <blockquote {...props} style={{
                            borderLeft: '4px solid',
                            borderColor: msg.sender === "user" ? 'rgba(255,255,255,0.3)' : '#d9d9d9',
                            paddingLeft: '16px',
                            fontStyle: 'italic',
                            color: msg.sender === "user" ? 'rgba(255,255,255,0.9)' : '#666'
                          }} />
                        ),
                        h1: ({ node, ...props }) => <h1 {...props} style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }} />,
                        h2: ({ node, ...props }) => <h2 {...props} style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px' }} />,
                        h3: ({ node, ...props }) => <h3 {...props} style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }} />,
                        ul: ({ node, ...props }) => <ul {...props} style={{ paddingLeft: '20px', marginBottom: '12px' }} />,
                        ol: ({ node, ...props }) => <ol {...props} style={{ paddingLeft: '20px', marginBottom: '12px' }} />,
                        li: ({ node, ...props }) => <li {...props} style={{ marginBottom: '4px', lineHeight: '1.5' }} />
                      }}
                    >
                      {msg.content || '[No content]'}
                    </ReactMarkdown>

                    {/* Enhanced Chain of Thought reasoning */}
                    {msg.reasoning_output && (
                      <Collapse style={{ marginTop: '16px' }} ghost>
                        <Panel
                          header={
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <ThunderboltOutlined style={{ color: '#722ed1' }} />
                              <Text strong style={{ color: '#722ed1' }}>Reasoning Process</Text>
                            </div>
                          }
                          key="1"
                        >
                          <div style={{ 
                            padding: '16px',
                            backgroundColor: '#f9f0ff',
                            border: '1px solid #d3adf7',
                            borderRadius: '8px'
                          }}>
                            <ReactMarkdown style={{ fontSize: '13px', color: '#1f1f1f', lineHeight: '1.6' }}>
                              {msg.reasoning_output}
                            </ReactMarkdown>
                          </div>
                        </Panel>
                      </Collapse>
                    )}

                    {/* Enhanced Insights */}
                    {msg.insights && (
                      <div style={{ 
                        marginTop: '16px',
                        padding: '16px',
                        backgroundColor: '#fff7e6',
                        border: '1px solid #ffd591',
                        borderRadius: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <BulbOutlined style={{ color: '#fa8c16' }} />
                          <Text strong style={{ color: '#fa8c16' }}>AI Insights</Text>
                        </div>
                        {typeof msg.insights === 'string' ? (
                          <Text style={{ fontSize: '13px', color: '#1f1f1f' }}>{msg.insights}</Text>
                        ) : (
                          <div style={{ fontSize: '13px', color: '#1f1f1f' }}>
                            {msg.insights.summary && (
                              <div style={{ marginBottom: '12px' }}>
                                <Text strong style={{ color: '#fa8c16' }}>Summary: </Text>
                                <Text>{msg.insights.summary}</Text>
                              </div>
                            )}
                            {msg.insights.key_patterns && msg.insights.key_patterns.length > 0 && (
                              <div style={{ marginBottom: '12px' }}>
                                <Text strong style={{ color: '#fa8c16', display: 'block', marginBottom: '8px' }}>Key Patterns:</Text>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                                  {msg.insights.key_patterns.slice(0, 6).map((pattern, index) => (
                                    <div key={index} style={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between', 
                                      alignItems: 'center',
                                      padding: '8px',
                                      backgroundColor: 'white',
                                      borderRadius: '6px',
                                      border: '1px solid #e0e0e0'
                                    }}>
                                      <Text style={{ fontWeight: '500' }}>{pattern.term}</Text>
                                      <Badge count={pattern.frequency} style={{ backgroundColor: '#fa8c16' }} />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {msg.insights.recommendations && msg.insights.recommendations.length > 0 && (
                              <div>
                                <Text strong style={{ color: '#fa8c16', display: 'block', marginBottom: '8px' }}>Recommendations:</Text>
                                <div>
                                  {msg.insights.recommendations.slice(0, 3).map((rec, index) => (
                                    <div key={index} style={{ 
                                      display: 'flex', 
                                      alignItems: 'flex-start', 
                                      gap: '8px',
                                      padding: '8px',
                                      marginBottom: '8px',
                                      backgroundColor: 'white',
                                      borderRadius: '6px',
                                      border: '1px solid #e0e0e0'
                                    }}>
                                      <BulbOutlined style={{ color: '#fa8c16', marginTop: '2px', flexShrink: 0 }} />
                                      <Text>{rec}</Text>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Enhanced Metadata */}
                    {msg.metadata && (
                      <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {msg.metadata.sources_used?.length > 0 && (
                          <Tooltip title={`Used ${msg.metadata.sources_used.length} document sources`}>
                            <Tag icon={<FileTextOutlined />} color="blue">
                              {msg.metadata.sources_used.length} Sources
                            </Tag>
                          </Tooltip>
                        )}
                        {msg.metadata.processing_time && (
                          <Tooltip title="Response processing time">
                            <Tag color="green">{msg.metadata.processing_time}ms</Tag>
                          </Tooltip>
                        )}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div style={{ marginTop: '12px', textAlign: 'right' }}>
                      <Text 
                        type="secondary" 
                        style={{ 
                          fontSize: '11px',
                          color: msg.sender === "user" ? 'rgba(255,255,255,0.7)' : '#999'
                        }}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Text>
                    </div>
                  </div>
                </Card>

                {/* Avatar for user messages */}
                {msg.sender === "user" && (
                  <Avatar 
                    icon={<UserOutlined />} 
                    style={{ backgroundColor: '#52c41a', flexShrink: 0 }}
                    size="default"
                  />
                )}
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
                <Card size="small" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Spin indicator={<LoadingOutlined style={{ fontSize: 20 }} spin />} />
                    <Text type="secondary">AI is thinking...</Text>
                  </div>
                </Card>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* FIXED: Input area with proper flex behavior */}
      <div style={{ 
        padding: '24px',
        backgroundColor: 'white',
        borderTop: '1px solid #f0f0f0',
        flexShrink: 0 // Prevent input area from shrinking
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
          <Upload
            beforeUpload={() => false}
            accept={ALLOWED_EXTENSIONS.join(",")}
            multiple
            onChange={({ fileList }) => handleFileInputChange({ fileList })}
            showUploadList={false}
          >
            <Tooltip title="Upload documents">
              <Button
                icon={<PaperClipOutlined />}
                disabled={loading || summarizing}
                size="large"
                style={{ 
                  borderRadius: 12,
                  height: 44,
                  width: 44
                }}
              />
            </Tooltip>
          </Upload>

          <div style={{ flex: 1 }}>
            <TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask me anything... (Press Enter to send, Shift+Enter for new line)"
              autoSize={{ minRows: 1, maxRows: 6 }}
              disabled={loading || summarizing}
              style={{ 
                borderRadius: 12,
                backgroundColor: "#fafbfc",
                border: "2px solid #e8f4fd",
                fontSize: 16,
                padding: "12px 16px"
              }}
            />
          </div>

          <Tooltip title={loading ? 'Sending...' : 'Send message'}>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              disabled={(!input.trim() && selectedFiles.length === 0) || loading || summarizing}
              loading={loading}
              size="large"
              style={{ 
                borderRadius: 12,
                height: 44,
                minWidth: 44,
                backgroundColor: loading ? '#91d5ff' : '#1890ff',
                borderColor: loading ? '#91d5ff' : '#1890ff'
              }}
            >
              {loading ? 'Sending' : 'Send'}
            </Button>
          </Tooltip>
        </div>

        {/* Enhanced helper text */}
        <div style={{ 
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid #f0f0f0'
        }}>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            alignItems: 'center', 
            gap: '20px',
            fontSize: '12px',
            color: '#8c8c8c'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <BulbOutlined style={{ color: '#1890ff' }} />
              <span>Pro Tips:</span>
            </div>
            
            {activeToolsCount > 0 ? (
              <>
                {tools.webSearch && <span>• Web search enabled</span>}
                {tools.documentSearch && <span>• Document search enabled</span>}
                {tools.chainOfThought && <span>• Reasoning enabled</span>}
                {tools.insights && <span>• Insights enabled</span>}
              </>
            ) : (
              <span>• Enable tools in the right panel</span>
            )}
            
            <span>• Drag & drop files to upload</span>
            <span>• Try: "search the web for latest AI news"</span>
            <span>• Use "summarize" for conversation summary</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;