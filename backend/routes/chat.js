/**
 * Chat Routes
 *
 * POST /chat
 *   Accepts a user message and returns a response.
 *   Currently returns a dummy response.
 *   Later this will forward to the n8n orchestrator on Machine 2.
 */

const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

/**
 * POST /chat
 *
 * Body: { message: "user message", userEmail: "user@gmail.com" }
 * Returns: { response: "..." }
 */
router.post('/', aiController.chat);

module.exports = router;
