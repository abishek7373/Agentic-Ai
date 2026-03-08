/**
 * Auth Middleware
 *
 * Extracts the Google access token from the Authorization header
 * and attaches it to `req.accessToken` for downstream handlers.
 *
 * Expected header format:   Authorization: Bearer <access_token>
 */

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const accessToken = authHeader.split(' ')[1];

  if (!accessToken) {
    return res.status(401).json({ error: 'Access token not provided' });
  }

  // Attach token so route handlers can use it for Google API calls
  req.accessToken = accessToken;
  next();
}

module.exports = { requireAuth };
