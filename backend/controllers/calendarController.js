/**
 * Calendar Controller
 *
 * Business logic for Google Calendar operations.
 * Routes delegate to these functions, which call the Calendar service layer.
 */

const calendarService = require('../services/calendarService');

/**
 * GET /calendar/events
 * Retrieve upcoming calendar events for the authenticated user.
 */
async function getEvents(req, res) {
  try {
    const events = await calendarService.listUpcomingEvents(req.accessToken, 5);
    res.json({ events });
  } catch (err) {
    console.error('Calendar getEvents error:', err.message);
    res.status(500).json({ error: 'Failed to fetch calendar events', details: err.message });
  }
}

/**
 * POST /calendar/create
 * Create a new calendar event.
 *
 * Body: { title, date, time, attendees }
 */
async function createEvent(req, res) {
  try {
    const { title, date, time, attendees } = req.body;

    if (!title || !date || !time) {
      return res.status(400).json({ error: 'Fields "title", "date", and "time" are required' });
    }

    const result = await calendarService.createEvent(req.accessToken, {
      title,
      date,
      time,
      attendees: attendees || [],
    });

    res.json(result);
  } catch (err) {
    console.error('Calendar createEvent error:', err.message);
    res.status(500).json({ error: 'Failed to create calendar event', details: err.message });
  }
}

module.exports = { getEvents, createEvent };
