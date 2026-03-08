/**
 * Gmail Service
 *
 * Wraps the Gmail API.  All methods accept a Google access token so
 * they act on behalf of the authenticated user.
 *
 * Currently implements:
 *   - listRecentMessages  (GET recent emails)
 *
 * Future extensions:
 *   - sendEmail
 *   - composeDraft
 *   - replyToEmail
 */

const { google } = require('googleapis');

/**
 * Build an authenticated Gmail client from an access token.
 */
function getGmailClient(accessToken) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth });
}

/**
 * List the most recent messages from the user's inbox.
 *
 * @param {string} accessToken  Google OAuth2 access token
 * @param {number} maxResults   Number of messages to return (default 5)
 * @returns {Array<{ id, subject, sender, snippet }>}
 */
async function listRecentMessages(accessToken, maxResults = 5) {
  const gmail = getGmailClient(accessToken);

  // Fetch message IDs
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
  });

  const messageIds = listRes.data.messages || [];

  // Fetch full details for each message in parallel
  const messages = await Promise.all(
    messageIds.map(async ({ id }) => {
      const msgRes = await gmail.users.messages.get({
        userId: 'me',
        id,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From'],
      });

      const headers = msgRes.data.payload.headers;
      const subject = headers.find((h) => h.name === 'Subject')?.value || '(no subject)';
      const sender = headers.find((h) => h.name === 'From')?.value || '(unknown)';
      const snippet = msgRes.data.snippet || '';

      return { id, subject, sender, snippet };
    })
  );

  return messages;
}

// ──────────────── Email Composition Methods ────────────────

/**
 * Send an email on behalf of the user.
 *
 * @param {string} accessToken  Google OAuth2 access token
 * @param {{ to: string, subject: string, body: string }} emailData
 * @returns {{ messageId: string, threadId: string }}
 */
async function sendEmail(accessToken, { to, subject, body }) {
  const gmail = getGmailClient(accessToken);

  // Build RFC 2822 formatted email
  const rawEmail = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    '',
    body,
  ].join('\r\n');

  // Base64url encode the message
  const encodedMessage = Buffer.from(rawEmail)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });

  return {
    messageId: res.data.id,
    threadId: res.data.threadId,
  };
}

/**
 * Create a draft email.
 * TODO: implement when Email Composition Agent is built.
 */
// async function composeDraft(accessToken, { to, subject, body }) { }

/**
 * Reply to an existing email thread.
 * TODO: implement when Email Composition Agent is built.
 */
// async function replyToEmail(accessToken, { threadId, body }) { }

/**
 * List unread messages from the user's inbox.
 *
 * @param {string} accessToken  Google OAuth2 access token
 * @param {number} maxResults   Number of messages to return (default 20)
 * @returns {Array<{ id, subject, sender, snippet, date }>}
 */
async function listUnreadMessages(accessToken, maxResults = 20) {
  const gmail = getGmailClient(accessToken);

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: 'is:unread',
    maxResults,
  });

  const messageIds = listRes.data.messages || [];

  if (messageIds.length === 0) return [];

  const messages = await Promise.all(
    messageIds.map(async ({ id }) => {
      const msgRes = await gmail.users.messages.get({
        userId: 'me',
        id,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date'],
      });

      const headers = msgRes.data.payload.headers;
      const subject = headers.find((h) => h.name === 'Subject')?.value || '(no subject)';
      const sender  = headers.find((h) => h.name === 'From')?.value    || '(unknown)';
      const date    = headers.find((h) => h.name === 'Date')?.value    || '';
      const snippet = msgRes.data.snippet || '';

      return { id, subject, sender, snippet, date };
    })
  );

  return messages;
}

module.exports = {
  listRecentMessages,
  listUnreadMessages,
  sendEmail,
};
