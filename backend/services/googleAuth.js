/**
 * Google Auth Service
 *
 * Handles OAuth2 token exchange and verification.
 * Uses the Authorization Code flow:
 *   1. Frontend sends the authorization code obtained from Google
 *   2. Backend exchanges it for access_token, refresh_token, id_token
 *   3. id_token is verified to extract user info
 *
 * Tokens are stored in-memory keyed by user email.
 */

const { OAuth2Client } = require('google-auth-library');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// In-memory token store:  email -> { accessToken, refreshToken, idToken }
const tokenStore = new Map();

/**
 * Create a configured OAuth2 client.
 * @param {string} redirectUri  Override redirect URI (default: 'postmessage' for frontend flow)
 */
function createOAuth2Client(redirectUri = 'postmessage') {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
  }
  return new OAuth2Client(CLIENT_ID, CLIENT_SECRET, redirectUri);
}

/**
 * Exchange an authorization code for Google tokens and verify the user.
 *
 * @param {string} code  Authorization code from the frontend
 * @returns {{ name: string, email: string, picture: string, accessToken: string }}
 */
async function exchangeCodeForTokens(code) {
  const client = createOAuth2Client();

  // Exchange the authorization code for tokens
  const { tokens } = await client.getToken(code);

  // Verify the id_token to get user info
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const email = payload.email;
  const name = payload.name;
  const picture = payload.picture;

  // Store tokens keyed by email for later API calls
  tokenStore.set(email, {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || null,
    idToken: tokens.id_token,
  });

  return { name, email, picture, accessToken: tokens.access_token };
}

/**
 * Retrieve stored tokens for a user by their access token.
 * (Reverse lookup — returns the token entry that matches.)
 *
 * @param {string} accessToken
 * @returns {{ accessToken: string, refreshToken: string|null, idToken: string } | null}
 */
function getTokensByAccessToken(accessToken) {
  for (const [, entry] of tokenStore) {
    if (entry.accessToken === accessToken) {
      return entry;
    }
  }
  return null;
}

/**
 * Retrieve stored tokens for a user by email.
 *
 * @param {string} email
 * @returns {{ accessToken: string, refreshToken: string|null, idToken: string } | null}
 */
function getTokensByEmail(email) {
  return tokenStore.get(email) || null;
}

module.exports = {
  createOAuth2Client,
  exchangeCodeForTokens,
  getTokensByAccessToken,
  getTokensByEmail,
  tokenStore,
  CLIENT_ID,
  CLIENT_SECRET,
};
