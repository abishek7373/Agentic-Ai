/**
 * Email Routes
 *
 * POST /email/format
 *   Formats raw text into a professional email using Llama3 via Ollama.
 *
 * Future routes:
 *   POST /email/summarize   — Summarize an email thread
 *   POST /email/reply       — Generate a reply draft
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const aiController = require('../controllers/aiController');

/**
 * POST /email/format
 *
 * Body: { message: "raw text to format" }
 * Returns: { formattedEmail, model }
 */
router.post('/format', requireAuth, aiController.formatEmail);

module.exports = router;
