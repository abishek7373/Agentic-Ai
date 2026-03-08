import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

// All scopes needed for Gmail + Calendar + profile access
const SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar',
].join(' ');

export default function LoginForm() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const googleLogin = useGoogleLogin({
    flow: 'auth-code',
    scope: SCOPES,
    onSuccess: async ({ code }) => {
      setLoading(true);
      setError('');
      try {
        await login(code);
      } catch (err) {
        console.error('Login error:', err);
        const message = err?.response?.data?.details || err?.response?.data?.error || err?.message;
        setError(message ? `Google login failed: ${message}` : 'Google login failed. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    onError: (err) => {
      console.error('Google OAuth error:', err);
      setError('Google login was cancelled.');
    },
  });

  return (
    <div className="w-full space-y-[18px]">
      {error && (
        <p className="text-accent text-sm text-center animate-fade-in leading-relaxed">{error}</p>
      )}

      <button
        type="button"
        onClick={googleLogin}
        disabled={loading}
        className="btn-google w-full disabled:opacity-45 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Connecting...
          </span>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </>
        )}
      </button>
    </div>
  );
}
