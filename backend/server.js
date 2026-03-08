/**
 * Agent_m Backend Server — Entry Point
 *
 * Express server that:
 *  - Verifies Google OAuth tokens
 *  - Proxies Gmail & Calendar API calls using the user's access token
 *  - Exposes a /chat endpoint (dummy now, n8n later)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Route imports
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const gmailRoutes = require('./routes/gmail');
const calendarRoutes = require('./routes/calendar');
const emailRoutes = require('./routes/email');
const { createOAuth2Client, tokenStore, CLIENT_ID } = require('./services/googleAuth');

const app = express();
const PORT = process.env.PORT || 5000;

// --------------- Middleware ---------------

app.use(cors({
  origin: 'http://localhost:5173', // Vite dev server
  credentials: true,
}));

app.use(bodyParser.json());

// --------------- Routes ---------------

app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);
app.use('/gmail', gmailRoutes);
app.use('/calendar', calendarRoutes);
app.use('/email', emailRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --------------- Dev OAuth Login (browser-based) ---------------

const DEV_REDIRECT_URI = `http://localhost:${PORT}/auth/callback`;

/**
 * GET /auth/login
 * Open this URL in a browser → Google consent screen → callback stores the token.
 */
app.get('/auth/login', (_req, res) => {
  const client = createOAuth2Client(DEV_REDIRECT_URI);
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
  });
  res.redirect(url);
});

/**
 * GET /auth/callback
 * Google redirects here after consent. Exchanges code for tokens and stores them.
 */
app.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send('Missing authorization code');

    const client = createOAuth2Client(DEV_REDIRECT_URI);
    const { tokens } = await client.getToken(code);

    // Verify id_token to get user email
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();

    // Store in memory so all Gmail endpoints can use it
    tokenStore.set(payload.email, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      idToken: tokens.id_token,
    });

    console.log(`✅ OAuth tokens stored for ${payload.email}`);
    res.send(`
      <h2>✅ Logged in as ${payload.name} (${payload.email})</h2>
      <p>Access token stored. You can now use curl:</p>
      <pre>curl http://localhost:${PORT}/gmail/unread | python3 -m json.tool</pre>
      <p>Token expires in ~1 hour.</p>
    `);
  } catch (err) {
    console.error('OAuth callback error:', err.message);
    res.status(500).send(`<h2>❌ OAuth failed</h2><pre>${err.message}</pre>`);
  }
});

// --------------- Global Error Handler ---------------

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// --------------- Start Server ---------------

app.listen(PORT, () => {
  console.log(`Agent_m backend running on http://localhost:${PORT}`);
});
