// src/components/tools/WebSearchTool.jsx
// This component is now optional since web search is handled automatically by the backend

import React from 'react';

export default function WebSearchTool({ isEnabled, onToggle }) {
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
            <div className="p-2 bg-green-50 rounded border border-green-200">
              <div className="text-xs text-green-700 font-medium">
                ✅ Web search is now automatic
              </div>
              <div className="text-xs text-green-600 mt-1">
                The AI will search the web when your messages need current information
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}