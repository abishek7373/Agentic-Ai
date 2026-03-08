import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';

/**
 * Root application component.
 * Shows LoginPage when unauthenticated, ChatPage when authenticated.
 */
function AppContent() {
  const { user } = useAuth();
  return user ? <ChatPage /> : <LoginPage />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
