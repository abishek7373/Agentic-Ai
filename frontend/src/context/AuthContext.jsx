/**
 * Auth Context
 *
 * Provides global authentication state to the entire React app.
 *
 * Stores:
 *  - user   { name, email, picture }
 *  - accessToken  (Google OAuth access token, kept in memory)
 *
 * Exposes:
 *  - login(code)   Exchange auth code → set user + token
 *  - logout()      Clear state
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { googleLogin, googleLogout, setAuthToken, setUserEmail } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('agent_m_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!user?.accessToken) {
      setAuthToken(null);
      setUserEmail(null);
      return;
    }

    setAuthToken(user.accessToken);
    setUserEmail(user.email || null);
  }, [user]);

  /**
   * Called after the Google OAuth popup returns an authorization code.
   * Sends the code to the backend, stores user info + sets the token
   * on the Axios instance for all future requests.
   */
  const login = useCallback(async (code) => {
    const data = await googleLogin(code);

    // Store the access token in the Axios default headers
    setAuthToken(data.accessToken);
    setUserEmail(data.email);

    const nextUser = {
      name: data.name,
      email: data.email,
      picture: data.picture,
      accessToken: data.accessToken,
    };

    localStorage.setItem('agent_m_user', JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  /**
   * Log out: clear user state and remove the auth header.
   */
  const logout = useCallback(async () => {
    // Clear backend stored Google credentials first
    const email = user?.email;
    setAuthToken(null);
    setUserEmail(null);
    localStorage.removeItem('agent_m_user');
    setUser(null);
    if (email) {
      await googleLogout(email);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context from any component.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
