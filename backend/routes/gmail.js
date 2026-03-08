/**
 * Gmail Routes
 *
 * GET /gmail/messages
 *   Returns the 5 most recent Gmail messages for the authenticated user.
 *
 * Future routes:
 *   POST /gmail/send
 *   POST /gmail/draft
 *   POST /gmail/reply
 */

const express = require('express');
const router = express.Router();
const gmailController = require('../controllers/gmailController');

/**
 * GET /gmail/messages
 *
 * Returns:  { messages: [{ id, subject, sender, snippet }] }
 */
router.get('/messages', gmailController.getMessages);

/**
 * GET /gmail/unread
 *
 * Query:    ?maxResults=20  (optional, default 20)
 * Returns:  { count, messages: [{ id, subject, sender, snippet, date }] }
 */
router.get('/unread', gmailController.getUnreadMessages);

/**
 * POST /gmail/send
 *
 * Body:     { to, subject, body }
 * Returns:  { messageId, threadId }
 */
router.post('/send', gmailController.sendEmail);

module.exports = router;
