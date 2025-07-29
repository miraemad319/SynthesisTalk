// src/components/tools/WebSearchTool.jsx

import React, { useState } from 'react';
import { webSearch } from '../../utils/api';

export default function WebSearchTool({ isEnabled, onToggle, isSearching = false, onSearchComplete }) {
  const [manualQuery, setManualQuery] = useState('');
  const [manualSearching, setManualSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showManualSearch, setShowManualSearch] = useState(false);

  const handleManualSearch = async () => {
    if (!manualQuery.trim()) return;

    setManualSearching(true);
    try {
      const response = await webSearch({
        query: manualQuery,
        search_provider: "duckduckgo",
        num_results: 5
      });

      if (response && response.results) {
        setSearchResults(response.results);
        if (onSearchComplete) {
          onSearchComplete(response.results, manualQuery);
        }
      }
    } catch (error) {
      console.error('Manual web search failed:', error);
      setSearchResults([]);
    } finally {
      setManualSearching(false);
    }
  };

  const clearResults = () => {
    setSearchResults([]);
    setManualQuery('');
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center space-x-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="rounded"
        />
        <span className="text-sm text-gray-700">🌐 Web Search</span>
      </label>

      {isEnabled && (
        <div className="ml-6 space-y-2">
          <div className="text-xs text-gray-500">
            {isSearching ? (
              <span className="text-blue-600 animate-pulse">🔄 Search in progress...</span>
            ) : (
              "Enabled for all messages"
            )}
          </div>

          <button
            onClick={() => setShowManualSearch(!showManualSearch)}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            {showManualSearch ? "Hide" : "Show"} Manual Search
          </button>

          {showManualSearch && (
            <div className="p-2 bg-gray-50 rounded border">
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !manualSearching && handleManualSearch()}
                  placeholder="Enter search query..."
                  className="flex-1 text-xs px-2 py-1 border rounded"
                  disabled={manualSearching}
                />
                <button
                  onClick={handleManualSearch}
                  disabled={manualSearching || !manualQuery.trim()}
                  className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
                >
                  {manualSearching ? "..." : "Search"}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">
                      Results ({searchResults.length}):
                    </span>
                    <button
                      onClick={clearResults}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {searchResults.map((result, index) => (
                      <div key={index} className="text-xs bg-white p-2 rounded border">
                        <div className="font-medium text-blue-700 truncate">
                          {result.title}
                        </div>
                        <div className="text-gray-600 text-[10px] truncate">
                          {result.snippet}
                        </div>
                        <a
                          href={result.link || result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700 text-[10px] underline truncate block"
                        >
                          {result.link || result.url}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}