# StellarMind — Backend

> Express.js API server providing Google OAuth 2.0 authentication, Gmail & Calendar API proxying, n8n workflow orchestration, and local LLM integration via Ollama (Llama 3).

---

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Request Lifecycle](#request-lifecycle)
- [Authentication](#authentication)
- [Routes & Controllers](#routes--controllers)
- [Service Layer](#service-layer)
- [API Reference](#api-reference)
- [n8n Integration](#n8n-integration)
- [Ollama / Llama 3 Integration](#ollama--llama-3-integration)
- [Token Storage](#token-storage)
- [Development Setup](#development-setup)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)

---

## Overview

The backend serves as the **API gateway** between the React frontend and all external services:

- **Google OAuth 2.0** — exchanges authorization codes for tokens, stores credentials in-memory.
- **Gmail API** — lists recent/unread messages, sends emails on behalf of the authenticated user.
- **Google Calendar API** — lists upcoming events, creates events with attendees.
- **n8n Orchestrator** — forwards chat messages to the n8n webhook for AI agent processing.
- **Ollama (Llama 3)** — transforms raw text into professional email drafts using a local LLM.

---

## Technology Stack

| Technology | Version | Purpose |
|---|---|---|
| Node.js | ≥ 18.0.0 | JavaScript runtime |
| Express | 4.21 | HTTP server and routing |
| googleapis | 140.0 | Official Google API client (Gmail, Calendar) |
| google-auth-library | 9.14 | OAuth 2.0 token exchange and ID token verification |
| dotenv | 16.4 | `.env` file loading |
| cors | 2.8 | Cross-origin resource sharing |
| body-parser | 1.20 | JSON request body parsing |

---

## Project Structure

```
backend/
├── package.json                     # Dependencies & scripts
├── server.js                        # Express app setup, middleware, routes
│
├── middleware/
│   └── auth.js                      # requireAuth — Bearer token extraction
│
├── routes/
│   ├── auth.js                      # POST /auth/google, POST /auth/logout
│   ├── chat.js                      # POST /chat
│   ├── gmail.js                     # GET /gmail/messages, /unread, POST /send
│   ├── calendar.js                  # GET /calendar/events, POST /calendar/create
│   └── email.js                     # POST /email/format
│
├── controllers/
│   ├── aiController.js              # Chat (→ n8n) + email formatting (→ Ollama)
│   ├── gmailController.js           # Gmail CRUD + multi-source token resolution
│   └── calendarController.js        # Calendar event listing & creation
│
└── services/
    ├── googleAuth.js                # OAuth2 client factory, token store, exchange
    ├── gmailService.js              # Gmail API wrapper (list, unread, send)
    ├── calendarService.js           # Calendar API wrapper (list, create events)
    ├── n8nService.js                # HTTP forwarder to n8n webhook
    └── ollamaService.js             # Ollama REST API wrapper (format, generate)
```

---

## Architecture

```
                     ┌──────────────────┐
                     │   Express App     │
                     │   (server.js)     │
                     └────────┬─────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
    ┌─────▼─────┐      ┌─────▼─────┐      ┌─────▼─────┐
    │  Routes    │      │ Middleware │      │  Health   │
    │  /auth     │      │  auth.js   │      │  /health  │
    │  /chat     │      └───────────┘      └───────────┘
    │  /gmail    │
    │  /calendar │
    │  /email    │
    └─────┬──────┘
          │
    ┌─────▼──────┐
    │ Controllers │
    │  ai        │
    │  gmail     │
    │  calendar  │
    └─────┬──────┘
          │
    ┌─────▼──────┐
    │  Services   │
    │  googleAuth │──→ Google OAuth2
    │  gmail      │──→ Gmail API
    │  calendar   │──→ Calendar API
    │  n8n        │──→ n8n Webhook
    │  ollama     │──→ Ollama REST API
    └─────────────┘
```

### Layer Responsibilities

| Layer | Responsibility |
|---|---|
| **Routes** | HTTP verb → controller mapping, middleware attachment |
| **Middleware** | Cross-cutting concerns (auth token extraction) |
| **Controllers** | Request validation, token resolution, response formatting |
| **Services** | External API calls, data transformation, isolated business logic |

---

## Request Lifecycle

```
HTTP Request
    │
    ▼
CORS middleware (origin: http://localhost:5173)
    │
    ▼
body-parser (JSON)
    │
    ▼
Route matching (routes/*.js)
    │
    ▼
[Optional] requireAuth middleware
    │  Extracts Bearer token → req.accessToken
    │
    ▼
Controller (controllers/*.js)
    │  Validates input
    │  Resolves credentials
    │  Calls service layer
    │
    ▼
Service (services/*.js)
    │  Builds authenticated API clients
    │  Executes external API calls
    │  Returns normalised data
    │
    ▼
JSON Response → Client
```

---

## Authentication

### Two Auth Flows

| Flow | Entry Point | Use Case |
|---|---|---|
| **Frontend (SPA)** | `POST /auth/google` | React app sends authorization code from Google popup |
| **Browser (Dev)** | `GET /auth/login` → `GET /auth/callback` | Developer testing via browser + curl |

### Token Exchange (Frontend Flow)

1. Frontend calls `POST /auth/google` with `{ code }`.
2. `googleAuth.exchangeCodeForTokens(code)`:
   - Creates an OAuth2 client with redirect URI `postmessage`.
   - Exchanges the code for `{ access_token, refresh_token, id_token }`.
   - Verifies the ID token to extract `{ email, name, picture }`.
   - Stores all tokens in the in-memory `tokenStore` keyed by email.
3. Returns `{ name, email, picture, accessToken }` to the frontend.

### Token Resolution (Gmail Controller)

The Gmail controller uses a multi-source fallback strategy:

```
1. X-User-Email header → lookup in tokenStore
2. userEmail query param → lookup in tokenStore
3. Authorization: Bearer <token> header
4. Any token from tokenStore (first entry)
5. GMAIL_ACCESS_TOKEN env variable
```

This makes the API usable from curl, the React app, and n8n alike.

### requireAuth Middleware

Used by `/calendar/*` and `/email/format` routes. Extracts the token from the `Authorization: Bearer` header and attaches it to `req.accessToken`.

```javascript
// middleware/auth.js
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  req.accessToken = authHeader.split(' ')[1];
  next();
}
```

---

## Routes & Controllers

### Auth Routes (`/auth`)

| Method | Path | Auth | Controller | Description |
|---|---|---|---|---|
| POST | `/auth/google` | None | Inline | Exchange auth code for tokens |
| POST | `/auth/logout` | None | Inline | Clear stored tokens |

### Chat Routes (`/chat`)

| Method | Path | Auth | Controller | Description |
|---|---|---|---|---|
| POST | `/chat` | None | `aiController.chat` | Forward message to n8n orchestrator |

### Gmail Routes (`/gmail`)

| Method | Path | Auth | Controller | Description |
|---|---|---|---|---|
| GET | `/gmail/messages` | Token resolved | `gmailController.getMessages` | 5 most recent messages |
| GET | `/gmail/unread` | Token resolved | `gmailController.getUnreadMessages` | Up to 20 unread messages |
| POST | `/gmail/send` | Token resolved | `gmailController.sendEmail` | Send an email |

### Calendar Routes (`/calendar`)

| Method | Path | Auth | Controller | Description |
|---|---|---|---|---|
| GET | `/calendar/events` | `requireAuth` | `calendarController.getEvents` | 5 upcoming events |
| POST | `/calendar/create` | `requireAuth` | `calendarController.createEvent` | Create an event |

### Email Routes (`/email`)

| Method | Path | Auth | Controller | Description |
|---|---|---|---|---|
| POST | `/email/format` | `requireAuth` | `aiController.formatEmail` | Format text via Llama 3 |

---

## Service Layer

### googleAuth.js

Manages Google OAuth2 client creation and in-memory token storage.

| Function | Description |
|---|---|
| `createOAuth2Client(redirectUri?)` | Returns a configured `OAuth2Client`. Default redirect: `postmessage`. |
| `exchangeCodeForTokens(code)` | Exchanges auth code → stores tokens → returns user info. |
| `getTokensByAccessToken(token)` | Reverse lookup: find token entry by access token value. |
| `getTokensByEmail(email)` | Direct lookup: get tokens by email key. |
| `clearTokens(email?)` | Delete tokens for a specific email or all tokens. |

### gmailService.js

Wraps the Gmail API v1.

| Function | Description |
|---|---|
| `listRecentMessages(accessToken, maxResults)` | Returns `[{ id, subject, sender, snippet }]` |
| `listUnreadMessages(accessToken, maxResults)` | Returns `[{ id, subject, sender, snippet, date }]` (query: `is:unread`) |
| `sendEmail(accessToken, { to, subject, body })` | Builds RFC 2822 email, base64url encodes, sends. Returns `{ messageId, threadId }`. |

### calendarService.js

Wraps the Google Calendar API v3.

| Function | Description |
|---|---|
| `listUpcomingEvents(accessToken, maxResults)` | Returns `[{ id, title, start, end }]` ordered by start time. |
| `createEvent(accessToken, { title, date, time, attendees })` | Creates 1-hour event with timezone detection. Returns `{ eventId, eventLink }`. |

### n8nService.js

HTTP client for the n8n orchestrator webhook.

| Function | Description |
|---|---|
| `forwardToOrchestrator(message, userEmail)` | POSTs `{ message, userEmail }` to `N8N_WEBHOOK_URL`. Parses JSON/text response. Returns `{ response, raw }`. |

Response text extraction tries these fields in order: `response` → `message` → `output` → `text` → raw JSON string.

### ollamaService.js

REST client for the Ollama local LLM.

| Function | Description |
|---|---|
| `formatEmail(message)` | Sends a formatting prompt to the Ollama `/api/generate` endpoint. Returns `{ formattedEmail, model }`. |
| `generateCompletion(prompt)` | Generic prompt completion. Returns `{ response, model }`. |

Both functions use `stream: false` for synchronous response.

---

## API Reference

### POST /auth/google

Exchange a Google authorization code for user info and an access token.

**Request:**

```json
{ "code": "<authorization_code>" }
```

**Response (200):**

```json
{
  "name": "John Doe",
  "email": "john@gmail.com",
  "picture": "https://lh3.googleusercontent.com/...",
  "accessToken": "ya29.a0AfH6SM..."
}
```

**Error (401):**

```json
{ "error": "Authentication failed", "details": "..." }
```

---

### POST /auth/logout

Clear stored tokens.

**Request:**

```json
{ "email": "john@gmail.com" }
```

**Response (200):**

```json
{ "success": true }
```

---

### POST /chat

Send a user message to the n8n AI orchestrator.

**Request:**

```json
{
  "message": "summarize my unread emails",
  "userEmail": "john@gmail.com"
}
```

**Response (200):**

```json
{
  "response": "Here is your email summary...",
  "raw": { ... }
}
```

**Error (400):**

```json
{ "error": "Message is required" }
```

---

### GET /gmail/messages

Fetch the 5 most recent Gmail messages.

**Headers:** `Authorization: Bearer <token>` or `X-User-Email: <email>`

**Response (200):**

```json
{
  "messages": [
    { "id": "...", "subject": "...", "sender": "...", "snippet": "..." }
  ]
}
```

---

### GET /gmail/unread?maxResults=20

Fetch unread Gmail messages.

**Response (200):**

```json
{
  "count": 3,
  "messages": [
    { "id": "...", "subject": "...", "sender": "...", "snippet": "...", "date": "..." }
  ]
}
```

---

### POST /gmail/send

Send an email via Gmail.

**Headers:** `Authorization: Bearer <token>` or `X-User-Email: <email>`

**Request:**

```json
{
  "to": "recipient@gmail.com",
  "subject": "Project Update",
  "body": "Hi team, here is the weekly update..."
}
```

**Response (200):**

```json
{ "messageId": "...", "threadId": "..." }
```

---

### GET /calendar/events

Fetch 5 upcoming calendar events.

**Headers:** `Authorization: Bearer <token>` (required)

**Response (200):**

```json
{
  "events": [
    { "id": "...", "title": "Team Standup", "start": "...", "end": "..." }
  ]
}
```

---

### POST /calendar/create

Create a Google Calendar event.

**Headers:** `Authorization: Bearer <token>` (required)

**Request:**

```json
{
  "title": "Sprint Planning",
  "date": "2026-03-15",
  "time": "14:00",
  "attendees": ["alice@company.com"]
}
```

**Response (200):**

```json
{ "eventId": "...", "eventLink": "https://..." }
```

---

### POST /email/format

Format raw text into a professional email using Llama 3.

**Headers:** `Authorization: Bearer <token>` (required)

**Request:**

```json
{ "message": "tell john meeting moved to tomorrow 3pm" }
```

**Response (200):**

```json
{
  "formattedEmail": "Dear John,\n\nI wanted to inform you...",
  "model": "llama3"
}
```

---

### GET /health

Health check endpoint.

**Response (200):**

```json
{ "status": "ok", "timestamp": "2026-03-09T12:00:00.000Z" }
```

---

## n8n Integration

The backend communicates with n8n via a single webhook endpoint.

### Configuration

```env
N8N_WEBHOOK_URL=http://localhost:5678/webhook/agent
```

### Flow

```
POST /chat
    │
    ▼
aiController.chat()
    │
    ▼
n8nService.forwardToOrchestrator(message, userEmail)
    │
    ▼
HTTP POST → N8N_WEBHOOK_URL
    │
    ▼
n8n processes → returns JSON/text
    │
    ▼
parseWebhookResponse() + extractResponseText()
    │
    ▼
{ response: string, raw: object }
```

### Response Normalisation

The `n8nService` handles multiple response formats:

- **JSON objects** with `response`, `message`, `output`, or `text` fields.
- **Plain text** responses returned as-is.
- **Empty responses** defaulting to `"No response received from orchestrator."`.

---

## Ollama / Llama 3 Integration

### Configuration

```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

### Endpoint Used

```
POST http://localhost:11434/api/generate
```

### Email Formatting Prompt

```
Format the following text into a professional email with greeting,
body, and closing. Only return the email text, no explanations:

<user_message>
```

### Prerequisites

```bash
ollama pull llama3
ollama serve     # Runs on :11434
```

---

## Token Storage

Tokens are stored **in-memory** using a JavaScript `Map`:

```javascript
// services/googleAuth.js
const tokenStore = new Map();
// Key: user email (string)
// Value: { accessToken, refreshToken, idToken }
```

**Important:** All tokens are lost when the server restarts. This is acceptable for development; production should use Redis or a database.

---

## Development Setup

### Prerequisites

- Node.js ≥ 18.0.0
- Google Cloud project with OAuth 2.0 credentials
- Ollama installed and running with `llama3` model
- n8n running with orchestrator workflow activated

### Install

```bash
cd backend
npm install
```

### Configure

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
N8N_WEBHOOK_URL=http://localhost:5678/webhook/agent
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

### Run

```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

### Test with curl

```bash
# Health check
curl http://localhost:5000/health

# Browser-based OAuth (open in browser)
# http://localhost:5000/auth/login

# After OAuth, fetch emails
curl http://localhost:5000/gmail/unread | python3 -m json.tool

# Send a chat message
curl -X POST http://localhost:5000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "summarize my unread emails", "userEmail": "you@gmail.com"}'
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | Express server port |
| `GOOGLE_CLIENT_ID` | **Yes** | — | Google OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | **Yes** | — | Google OAuth 2.0 Client Secret |
| `N8N_WEBHOOK_URL` | No | `http://10.64.57.185:5678/webhook-test/agent` | n8n orchestrator webhook |
| `OLLAMA_URL` | No | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | No | `llama3` | LLM model for Ollama |
| `GMAIL_ACCESS_TOKEN` | No | — | Dev fallback: hardcoded Gmail token |

---

## Available Scripts

| Script | Command | Description |
|---|---|---|
| `start` | `npm start` | Start server with `node server.js` |
| `dev` | `npm run dev` | Start server with `node --watch server.js` (auto-restart on changes) |

---

<p align="center">
  Part of the <strong>StellarMind</strong> AI Productivity Automation Platform
</p>
