import React from 'react';

export default function MessageBubble({ role, content, isNew }) {
  const isUser = role === 'user';

  return (
    <div className={`chat-row ${isUser ? 'chat-row-user' : 'chat-row-ai'} ${isNew ? 'animate-fade-in-up' : ''}`}>
      <div
        className={`chat-bubble ${
          isUser
            ? 'chat-bubble-user'
            : 'chat-bubble-ai'
        }`}
      >
        <p className="chat-bubble-text">{content}</p>
      </div>
    </div>
  );
}
