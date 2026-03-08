/**
 * API Service
 *
 * Centralizes all HTTP calls from the frontend to the backend.
 * Uses Axios with the Vite proxy (requests go to /auth, /chat, etc.
 * and Vite forwards them to http://localhost:5000).
 */

import axios from 'axios';

const api = axios.create({
  baseURL: '/', // Vite proxy handles forwarding
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Attach the access token to every request once the user is logged in.
 */
export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

/**
 * Attach logged-in user email so backend can resolve stored OAuth credentials.
 */
export function setUserEmail(email) {
  if (email) {
    api.defaults.headers.common['X-User-Email'] = email;
  } else {
    delete api.defaults.headers.common['X-User-Email'];
  }
}

// ──────────── Auth ────────────

/**
 * Exchange an authorization code for user info + access token.
 */
export async function googleLogin(code) {
  const { data } = await api.post('/auth/google', { code });
  return data; // { name, email, picture, accessToken }
}

// ──────────── Chat ────────────

/**
 * Send a message to the backend (future: forwarded to n8n).
 */
export async function sendChatMessage(message, userEmail) {
  const { data } = await axios.post(
    '/chat',
    {
      message,
      userEmail: userEmail || 'test@gmail.com',
    },
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
  return data; // { response }
}

// ──────────── Gmail ────────────

/**
 * Fetch the 5 most recent Gmail messages.
 */
export async function getGmailMessages() {
  const { data } = await api.get('/gmail/messages');
  return data; // { messages: [...] }
}

/**
 * Send an email via Gmail API.
 */
export async function sendGmailEmail({ to, subject, body }) {
  const { data } = await api.post('/gmail/send', { to, subject, body });
  return data; // { messageId, threadId }
}

// ──────────── Calendar ────────────

/**
 * Fetch the 5 upcoming calendar events.
 */
export async function getCalendarEvents() {
  const { data } = await api.get('/calendar/events');
  return data; // { events: [...] }
}

/**
 * Create a new calendar event.
 */
export async function createCalendarEvent({ title, date, time, attendees }) {
  const { data } = await api.post('/calendar/create', { title, date, time, attendees });
  return data; // { eventId, eventLink }
}

// ──────────── Email Formatting (Ollama / Llama3) ────────────

/**
 * Format raw text into a professional email using Llama3.
 */
export async function formatEmail(message) {
  const { data } = await api.post('/email/format', { message });
  return data; // { formattedEmail, model }
}
