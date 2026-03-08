/**
 * n8n Integration Service
 *
 * Forwards chat messages to the n8n webhook and maps n8n responses
 * to a consistent API shape expected by the frontend.
 */

const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL ||
  'http://10.64.57.185:5678/webhook-test/agent';

/**
 * Forward a user message to the n8n orchestrator.
 *
 * @param {string} message    The user's message
 * @param {string} userEmail  The authenticated user's email
 * @returns {Promise<{ response: string, raw?: any }>}
 */
async function forwardToOrchestrator(message, userEmail) {
  const payload = {
    message,
    userEmail: userEmail || 'test@gmail.com',
  };

  console.log(`[n8n] Forwarding message to ${N8N_WEBHOOK_URL}`);

  const res = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const bodyText = await res.text();
    throw new Error(`n8n responded with ${res.status}: ${bodyText}`);
  }

  const responseText = await res.text();
  const raw = parseWebhookResponse(responseText);

  return {
    response: extractResponseText(raw),
    raw,
  };
}

function extractResponseText(raw) {
  if (typeof raw === 'string') return raw;
  if (!raw || typeof raw !== 'object') return 'No response received from orchestrator.';

  if (typeof raw.response === 'string') return raw.response;
  if (typeof raw.message === 'string') return raw.message;
  if (typeof raw.output === 'string') return raw.output;
  if (typeof raw.text === 'string') return raw.text;

  return JSON.stringify(raw);
}

function parseWebhookResponse(responseText) {
  if (!responseText || !responseText.trim()) return '';

  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
}

module.exports = {
  forwardToOrchestrator,
  N8N_WEBHOOK_URL,
};
