/**
 * Ollama Service
 *
 * Interfaces with the local Ollama instance running Llama3.
 * Used to format raw text into professional emails.
 *
 * Endpoint: http://localhost:11434/api/generate
 *
 * Ollama must be running locally with the llama3 model pulled:
 *   ollama pull llama3
 *   ollama serve
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

/**
 * Format raw text into a professional email using Llama3.
 *
 * @param {string} message  Raw user input (e.g. "tell john meeting moved to tomorrow")
 * @returns {{ formattedEmail: string, model: string }}
 */
async function formatEmail(message) {
  const prompt = `Format the following text into a professional email with greeting, body, and closing. Only return the email text, no explanations:\n\n${message}`;

  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ollama request failed (${response.status}): ${errText}`);
  }

  const data = await response.json();

  return {
    formattedEmail: data.response.trim(),
    model: data.model,
  };
}

/**
 * Send a generic prompt to Ollama Llama3.
 * Useful for future AI agent tasks (summarization, research, etc.)
 *
 * @param {string} prompt  The full prompt to send
 * @returns {{ response: string, model: string }}
 */
async function generateCompletion(prompt) {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ollama request failed (${response.status}): ${errText}`);
  }

  const data = await response.json();

  return {
    response: data.response.trim(),
    model: data.model,
  };
}

module.exports = {
  formatEmail,
  generateCompletion,
};
