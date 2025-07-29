import React from 'react';

const MessageBubble = ({ message }) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isWebSearch = message.type === 'web_search_result';

  return (
    <div className={`w-full my-2 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-md ${
          isUser
            ? 'bg-blue-500 text-white rounded-br-none'
            : 'bg-gray-100 text-gray-900 rounded-bl-none'
        }`}
      >
        {/* 🧠 Web Search Result Bubble */}
        {isWebSearch && message.sources?.length > 0 ? (
          <div>
            <p className="font-semibold mb-2">🔍 Web Search Results:</p>
            {message.sources.map((source, i) => (
              <div key={i} className="mb-3">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 font-medium underline"
                >
                  {source.title || source.url}
                </a>
                <p className="text-sm text-gray-700">{source.snippet}</p>
              </div>
            ))}
          </div>
        ) : (
          // 🧍 Regular Assistant/User Message
          <div className="whitespace-pre-wrap">{message.content}</div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
