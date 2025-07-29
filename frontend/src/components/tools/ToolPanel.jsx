// src/components/tools/ToolPanel.jsx

import React from 'react';
import WebSearchTool from './WebSearchTool.jsx';

export default function ToolPanel({
  tools,
  onToolToggle,
  onSummarizeClick,
  onWebSearchComplete,
  isSearching = false,
  documentsCount = 0
}) {
  const handleWebSearchToggle = (enabled) => {
    onToolToggle('webSearch', enabled);
  };

  const handleDocumentSearchToggle = (enabled) => {
    onToolToggle('documentSearch', enabled);
  };

  return (
    <div className="tool-panel p-4 bg-gray-50 border-l border-gray-200 w-64 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">Tools</h2>
     
      <div className="space-y-4">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={tools.chainOfThought || false}
            onChange={(e) => onToolToggle('chainOfThought', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-700">🧠 Chain of Thought</span>
        </label>

        {/* Web Search Tool */}
        <WebSearchTool
          isEnabled={tools.webSearch || false}
          onToggle={handleWebSearchToggle}
          isSearching={isSearching}
        />

        {/* Document Search Tool - Enhanced */}
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
          
          {tools.documentSearch && (
            <div className="ml-6 text-xs text-gray-500">
              {documentsCount > 0 
                ? `${documentsCount} document${documentsCount > 1 ? 's' : ''} available` 
                : "Upload documents to enable search"
              }
            </div>
          )}
          
          {tools.documentSearch && documentsCount === 0 && (
            <div className="ml-6 p-2 bg-yellow-50 rounded border border-yellow-200">
              <div className="text-xs text-yellow-700">
                💡 Upload documents first to use this feature
              </div>
            </div>
          )}
        </div>

        <div className="border-t pt-3">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={tools.summarization || false}
              onChange={(e) => onToolToggle('summarization', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">📋 Summarization</span>
          </label>

          {tools.summarization && (
            <div className="mt-3 ml-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Summary Format</h3>
              <div className="space-y-2">
                {['bullet', 'paragraph', 'insight'].map((format) => (
                  <label key={format} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="summaryFormat"
                      value={format}
                      checked={tools.summaryFormat === format}
                      onChange={(e) => onToolToggle('summaryFormat', e.target.value)}
                      className="text-blue-500"
                    />
                    <span className="text-xs text-blue-700 capitalize">{format}</span>
                  </label>
                ))}
              </div>

              <button
                onClick={onSummarizeClick}
                className="mt-3 w-full bg-blue-500 text-white text-sm py-2 px-3 rounded hover:bg-blue-600 transition-colors"
              >
                Summarize Last Message
              </button>
            </div>
          )}
        </div>

        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={tools.insights || false}
            onChange={(e) => onToolToggle('insights', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-700">💡 Generate Insights</span>
        </label>

        {/* Search Tips */}
        <div className="border-t pt-3">
          <div className="text-xs text-gray-600 mb-2 font-medium">Search Tips:</div>
          <div className="space-y-1 text-xs text-gray-500">
            {tools.webSearch && (
              <div>• Try: "Search the web for..."</div>
            )}
            {tools.documentSearch && documentsCount > 0 && (
              <div>• Try: "Search my documents for..."</div>
            )}
            {!tools.webSearch && !tools.documentSearch && (
              <div>• Enable search tools above</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}