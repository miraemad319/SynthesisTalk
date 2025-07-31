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
  Collapse
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
  DownOutlined
} from '@ant-design/icons';
import {
  postChat as sendMessage,
  getSessionMessages as fetchSessionMessages,
  getDocuments,
  uploadFiles,
  postSummary,
} from "../../utils/api.js";

const { TextArea } = Input;
const { Text } = Typography;
const { Panel } = Collapse;

const ChatInterface = ({ sessionId, tools, onToolsChange, onDocumentsUpdate }) => {
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [input, setInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summarizing, setSummarizing] = useState(false);

  // Drag and drop states
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const bottomRef = useRef();
  const dropZoneRef = useRef();
  const fileInputRef = useRef();

  // Supported file extensions
  const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".docx", ".md", ".rtf"];

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
  }, [loading, summarizing]);

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

  // Check for web search request
  const containsWebSearchRequest = (text) => {
    const webSearchKeywords = [
      'search the web', 'web search', 'google', 'find online', 'look up',
      'search for', 'what\'s the latest', 'current news', 'recent', 'today'
    ];
    const lowerText = text.toLowerCase();
    return webSearchKeywords.some(keyword => lowerText.includes(keyword));
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
    const lastBotMessage = messages
      .filter(msg => msg.sender === "bot" && !msg.isSummaryMessage && !msg.isDocumentMessage)
      .pop();

    if (lastBotMessage) {
      handleSummarization(lastBotMessage.id, 'paragraph');
    } else {
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: "bot",
        content: "⚠️ No message found to summarize.",
        timestamp: new Date().toISOString()
      }]);
    }
  }, [messages]);

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

    setInput("");

    // Check if it's a direct summarization request
    const isAutoSummarizeRequest = containsSummarizeRequest(messageToSend);
    const isWebSearchRequest = containsWebSearchRequest(messageToSend);

    if (isAutoSummarizeRequest && tools.summarization && messageToSend) {
      try {
        const lastBotMessage = messages
          .filter(msg => msg.sender === "bot" && !msg.isSummaryMessage && !msg.isDocumentMessage)
          .pop();

        if (lastBotMessage) {
          await handleSummarization(lastBotMessage.id, 'paragraph');
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
        id: res?.message_id || Date.now() + 3,
        sender: "bot",
        content: botContent,
        reasoning_output: res?.reasoning_output,
        metadata: res?.metadata,
        insights: insightsDisplay,
        timestamp: new Date().toISOString()
      };

      setMessages((prev) => [...prev, botMessage]);

      // Auto-summarize if requested
      if (isAutoSummarizeRequest && tools.summarization) {
        setTimeout(() => handleSummarization(botMessage.id, 'paragraph'), 500);
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
      <div className="flex flex-col h-full overflow-hidden bg-white">
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

      {/* Header section with error messages and status indicators */}
      <div className="p-4 flex-shrink-0">
        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            className="mb-2"
          />
        )}

        {tools.webSearch && (
          <Card size="small" className="mb-2" bordered>
            <div className="flex items-center gap-2">
              <SearchOutlined className="text-green-600" />
              <div>
                <Text strong>Web Search Enabled</Text>
                <div className="text-xs text-gray-600">
                  Messages will include web search results when relevant
                </div>
              </div>
            </div>
          </Card>
        )}

        {tools.documentSearch && (
          <Card size="small" className="mb-2" bordered>
            <div className="flex items-center gap-2">
              <FileTextOutlined className="text-blue-600" />
              <div>
                <Text strong>Document Search Enabled</Text>
                <div className="text-xs text-gray-600">
                  Messages will search through uploaded documents
                </div>
              </div>
            </div>
          </Card>
        )}

        {tools.chainOfThought && (
          <Card size="small" className="mb-2" bordered>
            <div className="flex items-center gap-2">
              <ThunderboltOutlined className="text-purple-600" />
              <div>
                <Text strong>Chain of Thought Enabled</Text>
                <div className="text-xs text-gray-600">
                  AI will show its reasoning process
                </div>
              </div>
            </div>
          </Card>
        )}

        {tools.insights && (
          <Card size="small" className="mb-2" bordered>
            <div className="flex items-center gap-2">
              <BulbOutlined className="text-orange-600" />
              <div>
                <Text strong>Insights Enabled</Text>
                <div className="text-xs text-gray-600">
                  AI will generate insights and analysis
                </div>
              </div>
            </div>
          </Card>
        )}

        {selectedFiles.length > 0 && (
          <Card size="small" className="mb-2" bordered title={`Selected Files (${selectedFiles.length})`}>
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between py-1">
                <Text ellipsis className="flex-1">{file.name}</Text>
                <div className="flex items-center gap-2">
                  <Tag color="blue">{(file.size / 1024).toFixed(1)} KB</Tag>
                  <Button
                    type="text"
                    danger
                    icon={<CloseOutlined />}
                    size="small"
                    onClick={() => removeSelectedFile(index)}
                    disabled={loading || summarizing}
                  />
                </div>
              </div>
            ))}
          </Card>
        )}

        {summarizing && (
          <div className="mb-2">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
            <Text className="ml-2">Generating summary...</Text>
          </div>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-auto space-y-4 pr-2 px-4 mb-4">
        {messages.length === 0 && !loading ? (
          <div className="text-center py-8">
            <Card bordered={false}>
              <Text type="secondary">
                <div className="text-lg mb-2">No messages yet</div>
                <div className="text-sm">
                  Drag and drop files here or use the upload button below
                </div>
              </Text>
            </Card>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={msg.id || i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              <Card
                size="small"
                className={`max-w-[75%] ${msg.sender === "user" ? "bg-blue-50" : "bg-white"}`}
                bordered={msg.sender !== "user"}
              >
                <ReactMarkdown
                  components={{
                    a: ({ node, href, children, ...props }) => (
                      <a
                        {...props}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline hover:text-blue-800 cursor-pointer font-medium"
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
                    p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
                    strong: ({ node, ...props }) => <strong {...props} className="font-semibold" />,
                    em: ({ node, ...props }) => <em {...props} className="italic" />,
                    code: ({ node, inline, ...props }) =>
                      inline ? (
                        <code {...props} className="bg-gray-200 px-1 py-0.5 rounded text-sm font-mono" />
                      ) : (
                        <code {...props} className="block bg-gray-200 p-2 rounded text-sm font-mono overflow-x-auto" />
                      ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote {...props} className="border-l-4 border-gray-300 pl-4 italic text-gray-600" />
                    ),
                    h1: ({ node, ...props }) => <h1 {...props} className="text-xl font-bold mb-2" />,
                    h2: ({ node, ...props }) => <h2 {...props} className="text-lg font-bold mb-2" />,
                    h3: ({ node, ...props }) => <h3 {...props} className="text-md font-bold mb-2" />,
                    ul: ({ node, ...props }) => <ul {...props} className="list-disc list-inside mb-2" />,
                    ol: ({ node, ...props }) => <ol {...props} className="list-decimal list-inside mb-2" />,
                    li: ({ node, ...props }) => <li {...props} className="mb-1" />
                  }}
                >
                  {msg.content}
                </ReactMarkdown>

                {/* Display Chain of Thought reasoning if present */}
                {msg.reasoning_output && (
                  <Collapse className="mt-3" ghost>
                    <Panel 
                      header={
                        <div className="flex items-center gap-2">
                          <ThunderboltOutlined className="text-purple-600" />
                          <Text strong className="text-purple-800">Chain of Thought Reasoning</Text>
                        </div>
                      } 
                      key="1"
                    >
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                        <ReactMarkdown className="text-sm text-gray-700">
                          {msg.reasoning_output}
                        </ReactMarkdown>
                      </div>
                    </Panel>
                  </Collapse>
                )}

                {/* Display insights if present */}
                {msg.insights && (
                  <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <BulbOutlined className="text-orange-600" />
                      <Text strong className="text-orange-800">Insights</Text>
                    </div>
                    {typeof msg.insights === 'string' ? (
                      <Text className="text-sm text-gray-700">{msg.insights}</Text>
                    ) : (
                      <div className="text-sm text-gray-700">
                        {msg.insights.summary && (
                          <div className="mb-2">
                            <Text strong>Summary: </Text>
                            <Text>{msg.insights.summary}</Text>
                          </div>
                        )}
                        {msg.insights.key_patterns && msg.insights.key_patterns.length > 0 && (
                          <div className="mb-2">
                            <Text strong>Key Patterns:</Text>
                            <ul className="list-disc list-inside mt-1">
                              {msg.insights.key_patterns.slice(0, 5).map((pattern, index) => (
                                <li key={index}>{pattern.term} (frequency: {pattern.frequency})</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {msg.insights.trends && msg.insights.trends.length > 0 && (
                          <div className="mb-2">
                            <Text strong>Trends:</Text>
                            <ul className="list-disc list-inside mt-1">
                              {msg.insights.trends.slice(0, 3).map((trend, index) => (
                                <li key={index}>{trend.type}: {trend.indicator}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {msg.insights.recommendations && msg.insights.recommendations.length > 0 && (
                          <div className="mb-2">
                            <Text strong>Recommendations:</Text>
                            <ul className="list-disc list-inside mt-1">
                              {msg.insights.recommendations.slice(0, 3).map((rec, index) => (
                                <li key={index}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {msg.insights.confidence_score && (
                          <div>
                            <Text strong>Confidence: </Text>
                            <Tag color={msg.insights.confidence_score > 0.7 ? 'green' : msg.insights.confidence_score > 0.4 ? 'orange' : 'red'}>
                              {Math.round(msg.insights.confidence_score * 100)}%
                            </Tag>
                          </div>
                        )}
                        {/* Display visualizations if present */}
                        {msg.insights.visualizations && msg.insights.visualizations.length > 0 && (
                          <div className="mt-3">
                            <Text strong>Visualizations:</Text>
                            <div className="mt-2 space-y-2">
                              {msg.insights.visualizations.map((viz, index) => (
                                <div key={index} className="border rounded p-2">
                                  <Text strong className="text-xs">{viz.title}</Text>
                                  {viz.data && (
                                    <img 
                                      src={`data:image/png;base64,${viz.data}`} 
                                      alt={viz.title}
                                      className="max-w-full h-auto mt-1 rounded"
                                    />
                                  )}
                                  {viz.description && (
                                    <div className="text-xs text-gray-600 mt-1">{viz.description}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {msg.metadata && (
                  <div className="mt-2">
                    {msg.metadata.sources_used?.length > 0 && (
                      <Tag color="blue">Sources: {msg.metadata.sources_used.length}</Tag>
                    )}
                    {msg.metadata.processing_time && (
                      <Tag color="green">{msg.metadata.processing_time}ms</Tag>
                    )}
                  </div>
                )}

              </Card>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-center">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t bg-gray-50 flex-shrink-0">
        <div className="flex items-end space-x-2">
          <Upload
            beforeUpload={() => false}
            accept={ALLOWED_EXTENSIONS.join(",")}
            multiple
            onChange={({ fileList }) => handleFileInputChange({ target: { files: fileList.map(f => f.originFileObj) } })}
            showUploadList={false}
          >
            <Button
              icon={<PaperClipOutlined />}
              disabled={loading || summarizing}
              type="primary"
              ghost
            />
          </Upload>

          <div className="flex-1">
            <TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
              autoSize={{ minRows: 1, maxRows: 4 }}
              disabled={loading || summarizing}
            />
          </div>

          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            disabled={(!input.trim() && selectedFiles.length === 0) || loading || summarizing}
            loading={loading}
          >
            {loading ? 'Sending...' : 'Send'}
          </Button>
        </div>

        {/* Helper text */}
        <div className="mt-2 text-xs text-gray-500">
          <div className="flex flex-wrap gap-4">
            <span>💡 Tips:</span>
            {tools.webSearch && <span>Web search is enabled for all messages</span>}
            {tools.documentSearch && <span>Document search is enabled for all messages</span>}
            {tools.chainOfThought && <span>Chain of thought reasoning is enabled</span>}
            {tools.insights && <span>Insights generation is enabled</span>}
            {tools.summarization && <span>Use "summarize" to get a summary</span>}
            <span>Drag & drop files to upload</span>
            <span>Try: "search the web for latest AI news"</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;