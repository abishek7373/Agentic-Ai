/**
 * Calendar Routes
 *
 * GET /calendar/events
 *   Returns the 5 upcoming calendar events for the authenticated user.
 *
 * Future routes:
 *   POST /calendar/events        (create)
 *   PUT  /calendar/events/:id    (update)
 *   DELETE /calendar/events/:id  (delete)
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const calendarController = require('../controllers/calendarController');

/**
 * GET /calendar/events
 *
 * Headers:  Authorization: Bearer <access_token>
 * Returns:  { events: [{ id, title, start, end }] }
 */
router.get('/events', requireAuth, calendarController.getEvents);

/**
 * POST /calendar/create
 *
 * Headers:  Authorization: Bearer <access_token>
 * Body:     { title, date, time, attendees }
 * Returns:  { eventId, eventLink }
 */
router.post('/create', requireAuth, calendarController.createEvent);

module.exports = router;
