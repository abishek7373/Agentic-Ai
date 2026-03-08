/**
 * Gmail Controller
 *
 * Business logic for Gmail operations.
 * Routes delegate to these functions, which call the Gmail service layer.
 */

const gmailService = require('../services/gmailService');
const { tokenStore } = require('../services/googleAuth');

/**
 * Resolve an access token for dev mode.
 * Priority: header → in-memory tokenStore → GMAIL_ACCESS_TOKEN env var.
 */
function resolveAccessToken(req) {
  const headerEmail = req.headers['x-user-email'];
  const queryEmail = req.query?.userEmail;
  const bodyEmail = req.body?.userEmail;
  const resolvedEmail = headerEmail || queryEmail || bodyEmail;

  if (resolvedEmail) {
    const byEmail = tokenStore.get(resolvedEmail);
    if (byEmail?.accessToken) {
      return byEmail.accessToken;
    }
  }

  // 1. Optional header still works if provided
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  // 2. Fallback: grab any token from the in-memory store
  for (const [, entry] of tokenStore) {
    if (entry.accessToken) return entry.accessToken;
  }
  // 3. Dev fallback: env variable
  if (process.env.GMAIL_ACCESS_TOKEN) {
    return process.env.GMAIL_ACCESS_TOKEN;
  }
  return null;
}

/**
 * GET /gmail/messages
 * Retrieve recent Gmail messages.
 */
async function getMessages(req, res) {
  try {
    const accessToken = resolveAccessToken(req);
    if (!accessToken) return res.status(401).json({ error: 'No access token available. Please log in first.' });
    const messages = await gmailService.listRecentMessages(accessToken, 5);
    res.json({ messages });
  } catch (err) {
    console.error('Gmail getMessages error:', err.message);
    res.status(500).json({ error: 'Failed to fetch Gmail messages', details: err.message });
  }
}

/**
 * POST /gmail/send
 * Send an email.
 *
 * Body: { to, subject, body }
 */
async function sendEmail(req, res) {
  try {
    const accessToken = resolveAccessToken(req);
    if (!accessToken) return res.status(401).json({ error: 'No access token available. Please log in first.' });

    const { to, subject, body } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Fields "to", "subject", and "body" are required' });
    }

    const result = await gmailService.sendEmail(accessToken, { to, subject, body });
    res.json(result);
  } catch (err) {
    console.error('Gmail sendEmail error:', err.message);
    res.status(500).json({ error: 'Failed to send email', details: err.message });
  }
}

/**
 * GET /gmail/unread
 * Retrieve all unread Gmail messages.
 */
async function getUnreadMessages(req, res) {
  try {
    const accessToken = resolveAccessToken(req);
    if (!accessToken) return res.status(401).json({ error: 'No access token available. Please log in first.' });
    const maxResults = parseInt(req.query.maxResults, 10) || 20;
    const messages = await gmailService.listUnreadMessages(accessToken, maxResults);
    res.json({ count: messages.length, messages });
  } catch (err) {
    console.error('Gmail getUnreadMessages error:', err.message);
    res.status(500).json({ error: 'Failed to fetch unread emails', details: err.message });
  }
}

module.exports = { getMessages, getUnreadMessages, sendEmail };
