import React from 'react';
import EmailSummary, { isEmailSummary } from './EmailSummary';

export default function MessageBubble({ role, content, rawData, isNew }) {
  const isUser = role === 'user';
  const showSummary = !isUser && isEmailSummary(rawData, content);

  return (
    <div className={`chat-row ${isUser ? 'chat-row-user' : 'chat-row-ai'} ${isNew ? 'animate-fade-in-up' : ''}`}>
      <div
        className={`chat-bubble ${
          isUser
            ? 'chat-bubble-user'
            : 'chat-bubble-ai'
        } ${showSummary ? 'chat-bubble-wide' : ''}`}
      >
        {showSummary ? (
          <EmailSummary data={rawData} content={content} />
        ) : (
          <p className="chat-bubble-text">{content}</p>
        )}
      </div>
    </div>
  );
}
