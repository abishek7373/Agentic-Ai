/**
 * Dashboard Page
 *
 * Shown after successful Google login.
 * Contains three sections:
 *   1. Email Composer   — Format + Send emails
 *   2. Unread Emails    — Fetch Gmail messages
 *   3. Calendar Scheduler — Create meetings
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  sendChatMessage,
  getGmailMessages,
  getCalendarEvents,
  sendGmailEmail,
  formatEmail,
  createCalendarEvent,
} from '../services/api';

function Dashboard() {
  const { user, logout } = useAuth();

  // ──────────── Email Composer State ────────────
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailStatus, setEmailStatus] = useState(null); // { type, message }
  const [emailLoading, setEmailLoading] = useState(false);
  const [formatLoading, setFormatLoading] = useState(false);

  // ──────────── Gmail Messages State ────────────
  const [messages, setMessages] = useState(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');

  // ──────────── Calendar State ────────────
  const [calTitle, setCalTitle] = useState('');
  const [calDate, setCalDate] = useState('');
  const [calTime, setCalTime] = useState('');
  const [calAttendees, setCalAttendees] = useState('');
  const [calStatus, setCalStatus] = useState(null);
  const [calLoading, setCalLoading] = useState(false);

  // ──────────── Fetch Calendar Events State ────────────
  const [events, setEvents] = useState(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState('');

  // ══════════════════════════════════════════════
  //  SECTION 1: Email Composer Handlers
  // ══════════════════════════════════════════════

  async function handleFormatEmail() {
    if (!emailBody.trim()) {
      setEmailStatus({ type: 'error', message: 'Enter a message to format' });
      return;
    }
    setFormatLoading(true);
    setEmailStatus(null);
    try {
      const result = await formatEmail(emailBody);
      setEmailBody(result.formattedEmail);
      setEmailStatus({ type: 'success', message: `Formatted using ${result.model}` });
    } catch (err) {
      const msg = err.response?.data?.details || err.response?.data?.error || err.message;
      setEmailStatus({ type: 'error', message: `Format failed: ${msg}` });
    } finally {
      setFormatLoading(false);
    }
  }

  async function handleSendEmail() {
    if (!emailTo.trim() || !emailSubject.trim() || !emailBody.trim()) {
      setEmailStatus({ type: 'error', message: 'All fields are required' });
      return;
    }
    setEmailLoading(true);
    setEmailStatus(null);
    try {
      const result = await sendGmailEmail({
        to: emailTo,
        subject: emailSubject,
        body: emailBody,
      });
      setEmailStatus({ type: 'success', message: `Email sent! ID: ${result.messageId}` });
      setEmailTo('');
      setEmailSubject('');
      setEmailBody('');
    } catch (err) {
      const msg = err.response?.data?.details || err.response?.data?.error || err.message;
      setEmailStatus({ type: 'error', message: `Send failed: ${msg}` });
    } finally {
      setEmailLoading(false);
    }
  }

  // ══════════════════════════════════════════════
  //  SECTION 2: Unread Emails Handler
  // ══════════════════════════════════════════════

  async function handleFetchEmails() {
    setMessagesLoading(true);
    setMessagesError('');
    setMessages(null);
    try {
      const result = await getGmailMessages();
      setMessages(result.messages);
    } catch (err) {
      const msg = err.response?.data?.details || err.response?.data?.error || err.message;
      setMessagesError(msg);
    } finally {
      setMessagesLoading(false);
    }
  }

  // ══════════════════════════════════════════════
  //  SECTION 3: Calendar Scheduler Handlers
  // ══════════════════════════════════════════════

  async function handleCreateMeeting() {
    if (!calTitle.trim() || !calDate || !calTime) {
      setCalStatus({ type: 'error', message: 'Title, date, and time are required' });
      return;
    }
    setCalLoading(true);
    setCalStatus(null);
    try {
      const attendees = calAttendees
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);
      const result = await createCalendarEvent({
        title: calTitle,
        date: calDate,
        time: calTime,
        attendees,
      });
      setCalStatus({
        type: 'success',
        message: `Event created!`,
        link: result.eventLink,
      });
      setCalTitle('');
      setCalDate('');
      setCalTime('');
      setCalAttendees('');
    } catch (err) {
      const msg = err.response?.data?.details || err.response?.data?.error || err.message;
      setCalStatus({ type: 'error', message: `Failed: ${msg}` });
    } finally {
      setCalLoading(false);
    }
  }

  async function handleFetchEvents() {
    setEventsLoading(true);
    setEventsError('');
    setEvents(null);
    try {
      const result = await getCalendarEvents();
      setEvents(result.events);
    } catch (err) {
      const msg = err.response?.data?.details || err.response?.data?.error || err.message;
      setEventsError(msg);
    } finally {
      setEventsLoading(false);
    }
  }

  // ══════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════

  return (
    <div>
      {/* Header: user info + logout */}
      <div className="dashboard-header">
        <div className="user-info">
          {user.picture && <img src={user.picture} alt="avatar" />}
          <div>
            <div className="user-name">{user.name}</div>
            <div className="user-email">{user.email}</div>
          </div>
        </div>
        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </div>

      {/* ── SECTION 1: Email Composer ── */}
      <div className="section-panel">
        <h2 className="section-title">📧 Email Composer</h2>

        <div className="form-group">
          <label>To</label>
          <input
            type="email"
            placeholder="recipient@gmail.com"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Subject</label>
          <input
            type="text"
            placeholder="Email subject"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Message</label>
          <textarea
            rows={6}
            placeholder="Type your message or raw text to format..."
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
          />
        </div>

        <div className="action-buttons">
          <button
            className="action-btn format"
            disabled={formatLoading}
            onClick={handleFormatEmail}
          >
            {formatLoading ? '✨ Formatting...' : '✨ Format Email'}
          </button>
          <button
            className="action-btn gmail"
            disabled={emailLoading}
            onClick={handleSendEmail}
          >
            {emailLoading ? '📤 Sending...' : '📤 Send Email'}
          </button>
        </div>

        {emailStatus && (
          <p className={emailStatus.type === 'error' ? 'status-error' : 'status-success'}>
            {emailStatus.message}
          </p>
        )}
      </div>

      {/* ── SECTION 2: Unread Emails ── */}
      <div className="section-panel">
        <h2 className="section-title">📬 Unread Emails</h2>

        <div className="action-buttons">
          <button
            className="action-btn gmail"
            disabled={messagesLoading}
            onClick={handleFetchEmails}
          >
            {messagesLoading ? 'Loading...' : '📥 Fetch Emails'}
          </button>
        </div>

        {messagesError && <p className="status-error">{messagesError}</p>}

        {messages && messages.length === 0 && (
          <p className="placeholder">No messages found.</p>
        )}

        {messages &&
          messages.map((msg) => (
            <div key={msg.id} className="data-card">
              <div className="card-title">{msg.subject}</div>
              <div className="card-meta">From: {msg.sender}</div>
              <div className="card-snippet">{msg.snippet}</div>
            </div>
          ))}
      </div>

      {/* ── SECTION 3: Calendar Scheduler ── */}
      <div className="section-panel">
        <h2 className="section-title">📅 Calendar Scheduler</h2>

        <div className="form-group">
          <label>Event Title</label>
          <input
            type="text"
            placeholder="Project Meeting"
            value={calTitle}
            onChange={(e) => setCalTitle(e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              value={calDate}
              onChange={(e) => setCalDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Time</label>
            <input
              type="time"
              value={calTime}
              onChange={(e) => setCalTime(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Attendees (comma-separated emails)</label>
          <input
            type="text"
            placeholder="user1@gmail.com, user2@gmail.com"
            value={calAttendees}
            onChange={(e) => setCalAttendees(e.target.value)}
          />
        </div>

        <div className="action-buttons">
          <button
            className="action-btn calendar"
            disabled={calLoading}
            onClick={handleCreateMeeting}
          >
            {calLoading ? 'Creating...' : '➕ Create Meeting'}
          </button>
          <button
            className="action-btn chat"
            disabled={eventsLoading}
            onClick={handleFetchEvents}
          >
            {eventsLoading ? 'Loading...' : '📋 Fetch Events'}
          </button>
        </div>

        {calStatus && (
          <div className={calStatus.type === 'error' ? 'status-error' : 'status-success'}>
            {calStatus.message}
            {calStatus.link && (
              <>
                {' '}
                <a href={calStatus.link} target="_blank" rel="noopener noreferrer">
                  Open in Calendar →
                </a>
              </>
            )}
          </div>
        )}

        {eventsError && <p className="status-error">{eventsError}</p>}

        {events && events.length === 0 && (
          <p className="placeholder">No upcoming events.</p>
        )}

        {events &&
          events.map((evt) => (
            <div key={evt.id} className="data-card">
              <div className="card-title">{evt.title}</div>
              <div className="card-meta">
                {new Date(evt.start).toLocaleString()} &mdash;{' '}
                {new Date(evt.end).toLocaleString()}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default Dashboard;
