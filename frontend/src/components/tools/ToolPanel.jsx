// src/components/tools/ToolPanel.jsx

import React from 'react';

export default function ToolPanel({
  tools,
  onToolToggle,
  onSummarizeClick,
  documentsCount = 0,
  documents = []
}) {
  const handleWebSearchToggle = (enabled) => {
    onToolToggle('webSearch', enabled);
  };

  const handleDocumentSearchToggle = (enabled) => {
    onToolToggle('documentSearch', enabled);
  };

  const handleChainOfThoughtToggle = (enabled) => {
    onToolToggle('chainOfThought', enabled);
  };

  const handleInsightsToggle = (enabled) => {
    onToolToggle('insights', enabled);
  };

  const handleSummarizationToggle = (enabled) => {
    onToolToggle('summarization', enabled);
  };

  return (
    <div className="tool-panel p-4 bg-gray-50 border-l border-gray-200 w-64 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">Tools</h2>
     
      <div className="space-y-4">
        {/* Chain of Thought Tool */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={tools.chainOfThought || false}
              onChange={(e) => handleChainOfThoughtToggle(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">🧠 Chain of Thought</span>
          </label>
         
          {tools.chainOfThought && (
            <div className="ml-6 p-2 bg-purple-50 rounded border border-purple-200">
              <div className="text-xs text-purple-700">
                ✅ Reasoning process will be shown in responses
              </div>
              <div className="text-xs text-purple-600 mt-1">
                AI will explain its thinking step-by-step
              </div>
            </div>
          )}
        </div>

        {/* Web Search Tool */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={tools.webSearch || false}
              onChange={(e) => handleWebSearchToggle(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">🌐 Web Search</span>
          </label>

          {tools.webSearch && (
            <div className="ml-6 space-y-2">
              <div className="p-2 bg-green-50 rounded border border-green-200">
                <div className="text-xs text-green-700">
                  ✅ Web search is active for all messages
                </div>
                <div className="text-xs text-green-600 mt-1">
                  The AI will automatically search the web when relevant
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Document Search Tool */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={tools.documentSearch || false}
              onChange={(e) => handleDocumentSearchToggle(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">📄 Document Search</span>
          </label>
         
          {tools.documentSearch && documentsCount === 0 && (
            <div className="ml-6 p-2 bg-yellow-50 rounded border border-yellow-200">
              <div className="text-xs text-yellow-700">
                💡 Upload documents first to use this feature
              </div>
            </div>
          )}

          {tools.documentSearch && documentsCount > 0 && (
            <div className="ml-6 p-2 bg-blue-50 rounded border border-blue-200">
              <div className="text-xs text-blue-700">
                ✅ Document search is active for all messages
              </div>
              <div className="text-xs text-blue-600 mt-1">
                The AI will search through your documents when relevant
              </div>
            </div>
          )}

          {tools.documentSearch && (
            <div className="ml-6 text-xs text-gray-500">
              {documentsCount > 0
                ? `${documentsCount} document${documentsCount > 1 ? 's' : ''} available`
                : "Upload documents to enable search"
              }
            </div>
          )}
        </div>

        {/* Insights Tool */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={tools.insights || false}
              onChange={(e) => handleInsightsToggle(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">💡 Generate Insights</span>
          </label>

          {tools.insights && (
            <div className="ml-6 space-y-2">
              <div className="p-2 bg-orange-50 rounded border border-orange-200">
                <div className="text-xs text-orange-700">
                  ✅ Insights generation is active
                </div>
                <div className="text-xs text-orange-600 mt-1">
                  AI will analyze patterns, trends, and generate visualizations
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summarization Tool */}
        <div className="border-t pt-3">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={tools.summarization || false}
              onChange={(e) => handleSummarizationToggle(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">📋 Summarization</span>
          </label>

          {tools.summarization && (
            <div className="mt-3 ml-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <button
                onClick={onSummarizeClick}
                className="w-full bg-blue-500 text-white text-sm py-2 px-3 rounded hover:bg-blue-600 transition-colors"
              >
                📋 Summarize Last Message
              </button>
              <div className="mt-2 text-xs text-blue-600">
                Click to summarize the most recent bot response, or type "summarize" in chat
              </div>
            </div>
          )}
        </div>

        {/* Documents Section */}
        {documentsCount > 0 && (
          <div className="border-t pt-3">
            <div className="text-sm font-medium text-gray-700 mb-2">📄 Uploaded Documents</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {documents.map((doc, index) => (
                <div key={doc.id || index} className="p-2 bg-white rounded border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="text-xs font-medium text-gray-800 truncate" title={doc.filename}>
                    {doc.filename}
                  </div>
                  {doc.text_preview && (
                    <div className="text-xs text-gray-500 mt-1" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {doc.text_preview.substring(0, 100)}...
                    </div>
                  )}
                  <div className="text-xs text-blue-600 mt-1 hover:text-blue-800">
                    📖 Available for search
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Documents are automatically searched when document search is enabled
            </div>
          </div>
        )}

        {/* Search Tips */}
        <div className="border-t pt-3">
          <div className="text-xs text-gray-600 mb-2 font-medium">💡 Usage Tips:</div>
          <div className="space-y-1 text-xs text-gray-500">
            {tools.chainOfThought && (
              <div>• Chain of thought shows AI reasoning</div>
            )}
            {tools.webSearch && (
              <div>• Web search is automatic when relevant</div>
            )}
            {tools.documentSearch && documentsCount > 0 && (
              <div>• Document search is automatic when relevant</div>
            )}
            {tools.insights && (
              <div>• Insights include patterns, trends & visualizations</div>
            )}
            {!tools.webSearch && !tools.documentSearch && !tools.insights && !tools.chainOfThought && (
              <div>• Enable tools above for enhanced AI responses</div>
            )}
            <div>• Try: "What's the latest news about AI?"</div>
            <div>• Try: "Search the web for recent developments"</div>
            {documentsCount > 0 && (
              <div>• Try: "What does my document say about...?"</div>
            )}
            {tools.summarization && <div>• Use "summarize" to get summaries</div>}
          </div>
        </div>

        {/* Status Indicators */}
        <div className="border-t pt-3">
          <div className="text-xs text-gray-600 mb-2 font-medium">🔧 Active Tools:</div>
          <div className="space-y-1">
            {tools.chainOfThought && (
              <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                🧠 Chain of Thought: Active
              </div>
            )}
            {tools.webSearch && (
              <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                🌐 Web Search: Active
              </div>
            )}
            {tools.documentSearch && documentsCount > 0 && (
              <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                📄 Document Search: Active
              </div>
            )}
            {tools.insights && (
              <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                💡 Insights: Active
              </div>
            )}
            {tools.summarization && (
              <div className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                📋 Summarization: Active
              </div>
            )}
            {!tools.webSearch && !tools.documentSearch && !tools.chainOfThought && !tools.insights && !tools.summarization && (
              <div className="text-xs text-gray-400 italic">
                No tools currently active
              </div>
            )}
          </div>
        </div>

        {/* Feature Explanations */}
        <div className="border-t pt-3 mt-4">
          <div className="text-xs text-gray-600 mb-2 font-medium">ℹ️ Tool Descriptions:</div>
          <div className="space-y-2 text-xs text-gray-500">
            <div>
              <strong>Chain of Thought:</strong> Shows AI's step-by-step reasoning process
            </div>
            <div>
              <strong>Web Search:</strong> Searches internet for current information
            </div>
            <div>
              <strong>Document Search:</strong> Searches through your uploaded files
            </div>
            <div>
              <strong>Insights:</strong> Analyzes data patterns and creates visualizations
            </div>
            <div>
              <strong>Summarization:</strong> Creates concise summaries of responses
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="border-t pt-3 mt-4">
          <div className="text-xs text-gray-400 text-center">
            Tools enhance AI responses with advanced capabilities
          </div>
        </div>
      </div>
    </div>
  );
}