import React, { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import ChatWindow from '../components/ChatWindow';
import ChatInput from '../components/ChatInput';
import { sendChatMessage } from '../services/api';

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = useCallback(
    async (text) => {
      const userMsg = { role: 'user', content: text };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      try {
        const data = await sendChatMessage(text, user?.email);
        const responseText = data.response || data.message || data.output || data.text || '';
        // Keep raw for structured rendering; also stash full data as fallback
        const rawData = data.raw || data;
        const aiMsg = {
          role: 'ai',
          content: typeof responseText === 'string' ? responseText : JSON.stringify(responseText),
          rawData,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch (err) {
        const errorMsg = {
          role: 'ai',
          content: 'Connection disrupted. Unable to reach the server. Please try again.',
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsTyping(false);
      }
    },
    [user]
  );

  return (
    <div className="h-screen ui-shell">
      <div className="h-full min-h-0 ui-glass rounded-3xl overflow-hidden flex flex-col">
        <Navbar />
        <ChatWindow messages={messages} isTyping={isTyping} />
        <ChatInput onSend={handleSend} />
      </div>
    </div>
  );
}
