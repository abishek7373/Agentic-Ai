/**
 * Calendar Service
 *
 * Wraps the Google Calendar API.  All methods accept a Google access token
 * so they act on behalf of the authenticated user.
 *
 * Currently implements:
 *   - listUpcomingEvents  (GET upcoming events)
 *
 * Future extensions:
 *   - createEvent
 *   - updateEvent
 *   - deleteEvent
 */

const { google } = require('googleapis');

/**
 * Build an authenticated Calendar client from an access token.
 */
function getCalendarClient(accessToken) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: 'v3', auth });
}

/**
 * List the next upcoming events on the user's primary calendar.
 *
 * @param {string} accessToken  Google OAuth2 access token
 * @param {number} maxResults   Number of events to return (default 5)
 * @returns {Array<{ id, title, start, end }>}
 */
async function listUpcomingEvents(accessToken, maxResults = 5) {
  const calendar = getCalendarClient(accessToken);

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = (res.data.items || []).map((event) => ({
    id: event.id,
    title: event.summary || '(no title)',
    start: event.start.dateTime || event.start.date,
    end: event.end.dateTime || event.end.date,
  }));

  return events;
}

// ──────────────── Event Management Methods ────────────────

/**
 * Create a calendar event.
 *
 * @param {string} accessToken
 * @param {{ title: string, date: string, time: string, attendees: string[] }} eventData
 * @returns {{ eventId: string, eventLink: string }}
 */
async function createEvent(accessToken, { title, date, time, attendees }) {
  const calendar = getCalendarClient(accessToken);

  // Build ISO datetime strings from date + time
  // date format: "2025-04-15", time format: "15:00"
  const startDateTime = new Date(`${date}T${time}:00`);
  const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour default

  const event = {
    summary: title,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };

  // Add attendees if provided
  if (attendees && attendees.length > 0) {
    event.attendees = attendees.map((email) => ({ email }));
  }

  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    sendUpdates: 'all', // Notify attendees
  });

  return {
    eventId: res.data.id,
    eventLink: res.data.htmlLink,
  };
}

/**
 * Update an existing calendar event.
 * TODO: implement when Meeting Scheduling Agent is built.
 */
// async function updateEvent(accessToken, eventId, updates) { }

/**
 * Delete a calendar event.
 * TODO: implement when Meeting Scheduling Agent is built.
 */
// async function deleteEvent(accessToken, eventId) { }

module.exports = {
  listUpcomingEvents,
  createEvent,
};
