import React, { useState, useRef } from 'react';

export default function ChatInput({ onSend }) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setMessage('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e) => {
    setMessage(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 150) + 'px';
  };

  return (
    <div className="chat-composer">
      <div className="chat-composer-row">
        <div className="chat-input-shell">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Message StellarMind..."
            rows={1}
            className="chat-textarea"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!message.trim()}
          className="chat-send-btn"
        >
          <span>Send</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M13 6L19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
