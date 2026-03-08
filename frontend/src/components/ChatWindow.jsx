import React, { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';

function TypingIndicator() {
  return (
    <div className="chat-row chat-row-ai animate-fade-in">
      <div className="chat-bubble chat-bubble-ai">
        <div className="flex items-center gap-1.5">
          {[0, 200, 400].map((delay) => (
            <span
              key={delay}
              className="w-2 h-2 rounded-full bg-neutral"
              style={{ animation: 'typing-dot 1.4s infinite', animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChatWindow({ messages, isTyping }) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const isEmpty = messages.length === 0 && !isTyping;

  return (
    <div
      ref={containerRef}
      className={`flex-1 min-h-0 overflow-y-auto chat-scroll-area ${isEmpty ? 'flex items-center justify-center' : ''}`}
    >
      {isEmpty ? (
        <div className="flex flex-col items-center text-center animate-fade-in max-w-md px-4">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 ui-soft-border flex items-center justify-center mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF6F61" strokeWidth="1.5">
              <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-text mb-2.5 tracking-tight">
            How can I help you?
          </h2>
          <p className="ui-muted text-sm leading-relaxed">
            Type a message below to get started.
          </p>
        </div>
      ) : (
        <div className="chat-thread">
          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              role={msg.role}
              content={msg.content}
              isNew={i === messages.length - 1 || (i === messages.length - 2 && isTyping)}
            />
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
