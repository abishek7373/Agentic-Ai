/**
 * AI Controller
 *
 * Handles AI-related operations:
 *   - Forwarding messages to the n8n orchestrator (Machine 2)
 *   - Formatting emails using Llama3 via Ollama (Machine 3)
 */

const n8nService = require('../services/n8nService');
const ollamaService = require('../services/ollamaService');

/**
 * POST /chat
 * Forward a user message to the n8n orchestrator.
 *
 * Body: { message, userEmail }
 */
async function chat(req, res) {
  try {
    const { message, userEmail } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await n8nService.forwardToOrchestrator(message, userEmail);
    res.json(result);
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'Failed to process message', details: err.message });
  }
}

/**
 * POST /email/format
 * Format raw text into a professional email using Llama3 via Ollama.
 *
 * Body: { message }
 */
async function formatEmail(req, res) {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await ollamaService.formatEmail(message);
    res.json(result);
  } catch (err) {
    console.error('Email format error:', err.message);
    res.status(500).json({ error: 'Failed to format email', details: err.message });
  }
}

module.exports = { chat, formatEmail };
