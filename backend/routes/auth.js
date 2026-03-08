/**
 * Auth Routes
 *
 * POST /auth/google
 *   Accepts an authorization code from the frontend,
 *   exchanges it for tokens, verifies the user, and returns user info.
 */

const express = require('express');
const router = express.Router();
const { exchangeCodeForTokens } = require('../services/googleAuth');

/**
 * POST /auth/google
 *
 * Body: { code: "<authorization_code>" }
 * Returns: { name, email, picture, accessToken }
 */
router.post('/google', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const userInfo = await exchangeCodeForTokens(code);

    res.json({
      name: userInfo.name,
      email: userInfo.email,
      picture: userInfo.picture,
      accessToken: userInfo.accessToken,
    });
  } catch (err) {
    console.error('Google auth error:', err.message);
    const isConfigError =
      err.message.includes('Google OAuth is not configured') ||
      err.message.includes('invalid_client');

    res
      .status(isConfigError ? 500 : 401)
      .json({ error: isConfigError ? 'OAuth configuration error' : 'Authentication failed', details: err.message });
  }
});

module.exports = router;
