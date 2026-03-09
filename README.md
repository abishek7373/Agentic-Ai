# StellarMind — AI Productivity Automation Platform

> An agentic workflow platform that orchestrates AI agents via n8n to automate email management, calendar scheduling, and research tasks — powered by a local LLM (Ollama / Llama 3) and Google Workspace APIs.

---

## Table of Contents

- [Project Overview](#project-overview)
- [System Architecture](#system-architecture)
- [n8n Workflow Architecture](#n8n-workflow-architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Frontend Explanation](#frontend-explanation)
- [Backend Explanation](#backend-explanation)
- [API Documentation](#api-documentation)
- [Data Storage](#data-storage)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [Example End-to-End Workflow](#example-end-to-end-workflow)
- [Future Improvements](#future-improvements)
- [Screenshots / Demo](#screenshots--demo)

---

## Project Overview

### What It Does

StellarMind is a multi-agent productivity automation platform. Users interact with a conversational chat interface to perform complex tasks such as:

- **Summarizing unread emails** — fetches Gmail messages, classifies them by priority, and returns an AI-generated summary.
- **Composing professional emails** — transforms raw text into polished email drafts using a local LLM, then sends them via Gmail.
- **Scheduling calendar events** — creates Google Calendar meetings with attendees from natural language input.
- **Research tasks** — delegates web research queries to an AI agent and returns structured findings.

### Problem It Solves

Knowledge workers lose hours daily switching between email, calendars, and search engines. StellarMind consolidates these workflows behind a single conversational interface. Instead of manually visiting Gmail, composing messages, and creating events, users issue natural language commands and the system executes multi-step tasks autonomously.

### Why AI Agents + Workflow Orchestration

Rather than a monolithic LLM call, the system uses **agentic workflows** orchestrated by **n8n**:

| Concept | Purpose |
|---|---|
| **Intent Classification** | A local LLM determines what the user wants (email summary, compose, schedule, research). |
| **Agent Routing** | A switch node dispatches the classified intent to a dedicated agent workflow. |
| **Specialised Agents** | Each agent has its own tools, prompts, and API integrations — keeping logic modular and testable. |
| **Orchestrator Pattern** | n8n acts as the central coordinator, executing sub-workflows and returning unified responses. |

This architecture enables adding new agents (e.g., Slack, Jira, CRM) without modifying the core application code.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER (Browser)                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FRONTEND  (React + Vite)                      │
│  • Google OAuth login via @react-oauth/google                   │
│  • Chat interface (ChatPage → ChatWindow → ChatInput)           │
│  • Email Summary renderer with priority bucketing               │
│  • Axios HTTP client → Vite dev proxy → Backend                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │  HTTP  (POST /chat, GET /gmail/*, ...)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND  (Express.js)                         │
│  • Google OAuth2 token exchange & in-memory storage             │
│  • Gmail API proxy  (list, unread, send)                        │
│  • Calendar API proxy  (list events, create event)              │
│  • n8n integration — forwards /chat to webhook                  │
│  • Ollama integration — email formatting via Llama 3            │
└─────────┬──────────────────────────────┬────────────────────────┘
          │                              │
          │  POST (webhook)              │  POST /api/generate
          ▼                              ▼
┌───────────────────────┐    ┌────────────────────────────┐
│   n8n ORCHESTRATOR    │    │   OLLAMA  (Local LLM)      │
│                       │    │   Model: llama3             │
│  Webhook receiver     │    │   Endpoint: :11434          │
│  → Intent Classifier  │    └────────────────────────────┘
│  → Switch Router      │
│  → Agent Sub-Workflows│
│     ├─ Email Summary  │
│     ├─ Email Composer  │
│     ├─ Calendar Agent  │
│     └─ Research Agent  │
└─────────┬─────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL APIs                                 │
│  • Gmail API  (googleapis)                                      │
│  • Google Calendar API  (googleapis)                            │
│  • Web Search APIs  (via n8n nodes)                             │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Summary

1. **User** types a message in the StellarMind chat UI.
2. **Frontend** sends `POST /chat` with `{ message, userEmail }` to the backend via the Vite proxy.
3. **Backend** forwards the payload to the **n8n Webhook** endpoint.
4. **n8n Orchestrator** receives the webhook, runs **intent classification** using Llama 3, and routes to the correct **agent sub-workflow**.
5. The agent executes its task (e.g., fetches Gmail messages, calls the LLM for summarization).
6. The agent response propagates back through n8n → Backend → Frontend.
7. **Frontend** renders the response — either as a text bubble or a structured email summary card.

---

## n8n Workflow Architecture

The AI orchestration layer runs entirely inside **n8n**, an open-source workflow automation tool. It follows a **Webhook → Classify → Route → Execute → Respond** pipeline.

All workflow JSON files are located in the `n8n_workflows/` directory and can be imported directly into any n8n instance.

### Orchestrator Workflow (`main-orchestration.json`)

```
Webhook Trigger (POST /webhook/agent)
        │
        ▼
 ┌──────────────────┐
 │  Message a model  │   Ollama node using llama3:latest
 │  (Intent Classify) │   Prompt: "Classify into exactly ONE intent:
 │                    │   email_summary, email_compose, calendar_schedule,
 │                    │   reminder_create, research_query"
 └──────┬───────────┘
        │
        ▼
 ┌──────────────┐
 │  Edit Fields  │   Extracts the classified intent string
 └──────┬───────┘
        │
        ▼
 ┌──────────────┐
 │  Agent Router │   Switch node — routes on exact string match
 │  (Switch)     │
 └──┬───┬───┬───┘
    │   │   │   │
    ▼   ▼   ▼   ▼
 ┌────┐┌────┐┌────┐┌────────┐
 │ ES ││ EC ││ CS ││Research │    ES = Execute Email Summarizer
 └──┬─┘└──┬─┘└──┬─┘└──┬─────┘    EC = Execute Email Composer
    │      │     │     │          CS = Execute Calendar Scheduler
    ▼      ▼     ▼     ▼
 ┌──────────────────────────┐
 │  Format Response          │   Sets { status: "success", result }
 └──────────┬───────────────┘
            │
            ▼
 ┌──────────────────────────┐
 │  Respond to Webhook      │   Sends JSON back to the Express backend
 └──────────────────────────┘
```

**Intent Classification Prompt (from `main-orchestration.json`):**

```
You are an intent classification system.

Classify the user request into exactly ONE of the following intents:

email_summary
email_compose
calendar_schedule
reminder_create
research_query

Rules:
- Return ONLY the intent name.
- Do NOT explain.
- Do NOT add extra text.

User message:
{{ $json.body.message }}
```

### Agent Workflows

| Agent | File | Trigger Intent | Node Pipeline |
|---|---|---|---|
| **Email Summarizer** | `agent-email-summarizer.json` | `email_summary` | HTTP Request (GET `/gmail/unread`) → Prepare Email Text → Gemini 2.5 Flash (summarize & classify by priority) → Format Response |
| **Email Composer** | `agent-email-composer.json` | `email_compose` | Execute Workflow Trigger → Return Status Message _(stub — ready for expansion)_ |
| **Calendar Scheduler** | `agent-calendar-scheduler.json` | `calendar_schedule` | Execute Workflow Trigger → Return Status Message _(stub — ready for expansion)_ |
| **Research Agent** | `agent-research.json` | `research_query` | Execute Workflow Trigger → Return Status Message _(stub — ready for expansion)_ |

### Email Summarizer Agent (Detail)

This is the most complete agent workflow. Its pipeline:

1. **Triggered** by the orchestrator via `executeWorkflow` with `{ message, userEmail }`.
2. **HTTP Request** — calls `GET /gmail/unread` on the Express backend to fetch unread emails.
3. **Prepare Email Text** — extracts the `messages` array from the HTTP response.
4. **Google Gemini 2.5 Flash** — sends the email text to the LLM with a structured prompt that classifies each email into `high_priority`, `medium_priority`, or `low_priority` with fields: `subject`, `sender`, `summary`, `action_required`.
5. **Format Response** — extracts the `content` field from the LLM output as `summary`.

> **Note:** The email summarizer has an Ollama/Llama 3 node available (currently disabled) and uses **Google Gemini 2.5 Flash** as the active LLM for higher-quality structured JSON output.

### Webhook ↔ Backend Contract

The backend sends:

```json
{
  "message": "summarize my unread emails",
  "userEmail": "user@gmail.com"
}
```

n8n returns (example for email summary):

```json
{
  "response": "Here is your email summary",
  "high_priority": [...],
  "medium_priority": [...],
  "low_priority": [...]
}
```

The `n8nService.js` on the backend normalizes this into `{ response, raw }` before sending it to the frontend.

---

## Technology Stack

### Frontend

| Technology | Purpose |
|---|---|
| **React 18** | Component-based UI framework |
| **Vite 5** | Development server with hot module replacement and API proxy |
| **Tailwind CSS 4** | Utility-first CSS framework with custom theme tokens |
| **@react-oauth/google** | Google OAuth 2.0 authorization code flow |
| **Axios** | HTTP client for backend API calls |

### Backend

| Technology | Purpose |
|---|---|
| **Node.js ≥ 18** | JavaScript runtime |
| **Express 4** | HTTP server and routing framework |
| **googleapis** | Official Google API client (Gmail, Calendar) |
| **google-auth-library** | OAuth 2.0 token exchange and verification |
| **dotenv** | Environment variable management |

### AI / Automation

| Technology | Purpose |
|---|---|
| **n8n** | Visual workflow automation — orchestrates agent pipelines |
| **Ollama** | Local LLM inference server |
| **Llama 3** | Large language model for intent classification, summarization, email formatting |
| **Google Gemini 2.5 Flash** | Cloud LLM used by the email summarizer agent for structured JSON output |

### External APIs

| API | Scopes Used |
|---|---|
| **Gmail API** | `gmail.readonly`, `gmail.send`, `gmail.modify`, `gmail.compose` |
| **Google Calendar API** | `calendar` (full read/write) |
| **Google Identity** | `openid`, `profile`, `email` |

### Tools

| Tool | Purpose |
|---|---|
| **Git** | Version control |
| **Node.js / npm** | Package management and runtime |
| **Docker** (optional) | Containerized deployment for n8n |

---

## Project Structure

```
Agent_m/
│
├── README.md                    # ← You are here (project-wide documentation)
│
├── frontend/                    # React single-page application
│   ├── index.html               # HTML entry point
│   ├── package.json             # Frontend dependencies & scripts
│   ├── vite.config.js           # Vite dev server, proxy, and Tailwind plugin
│   └── src/
│       ├── main.jsx             # React root — wraps App in GoogleOAuthProvider
│       ├── App.jsx              # Auth gate — renders LoginPage or ChatPage
│       ├── index.css            # Global styles, Tailwind theme, animations
│       ├── App.css              # Additional component styles
│       ├── context/
│       │   └── AuthContext.jsx  # Global auth state (user, login, logout)
│       ├── pages/
│       │   ├── LoginPage.jsx    # Animated login page with Google OAuth
│       │   ├── ChatPage.jsx     # Main chat interface (Navbar + Chat + Input)
│       │   └── Dashboard.jsx    # Alt dashboard with email/calendar widgets
│       ├── components/
│       │   ├── LoginForm.jsx    # Google OAuth button & auth-code flow
│       │   ├── Navbar.jsx       # Top bar — logo, status indicator, logout
│       │   ├── ChatWindow.jsx   # Scrollable message list + typing indicator
│       │   ├── ChatInput.jsx    # Auto-resizing textarea + send button
│       │   ├── MessageBubble.jsx# Renders user/AI messages, detects summaries
│       │   └── EmailSummary.jsx # Priority-bucketed email summary cards
│       └── services/
│           └── api.js           # Axios instance & all API call functions
│
├── backend/                     # Express API server
│   ├── package.json             # Backend dependencies & scripts
│   ├── server.js                # Express app setup, middleware, routes, OAuth
│   ├── middleware/
│   │   └── auth.js              # Bearer token extraction middleware
│   ├── routes/
│   │   ├── auth.js              # POST /auth/google, POST /auth/logout
│   │   ├── chat.js              # POST /chat → aiController.chat
│   │   ├── gmail.js             # GET /gmail/messages, /unread, POST /send
│   │   ├── calendar.js          # GET /calendar/events, POST /calendar/create
│   │   └── email.js             # POST /email/format (Llama 3 formatting)
│   ├── controllers/
│   │   ├── aiController.js      # Chat (n8n) + email formatting (Ollama)
│   │   ├── gmailController.js   # Gmail CRUD + token resolution logic
│   │   └── calendarController.js# Calendar event listing & creation
│   └── services/
│       ├── googleAuth.js        # OAuth2 client factory, token store, exchange
│       ├── gmailService.js      # Gmail API wrapper (list, unread, send)
│       ├── calendarService.js   # Calendar API wrapper (list, create)
│       ├── n8nService.js        # Forwards messages to n8n webhook
│       └── ollamaService.js     # Ollama API wrapper (format, generate)
│
└── n8n_workflows/                       # Exported n8n workflow JSON files
    ├── main-orchestration.json          # Webhook → Intent Classifier (Llama 3) → Switch Router → Agent dispatch
    ├── agent-email-summarizer.json      # Fetches unread Gmail → Gemini 2.5 Flash summarization → priority JSON
    ├── agent-email-composer.json        # Formats & sends professional emails (sub-workflow stub)
    ├── agent-calendar-scheduler.json    # Creates Google Calendar events (sub-workflow stub)
    └── agent-research.json              # Web research agent (sub-workflow stub)
```

---

## Frontend Explanation

### Overview

The frontend is a **React 18 SPA** built with **Vite** and styled with **Tailwind CSS 4**. It presents a space-themed UI branded **"StellarMind"** with custom Orbitron typography, glass-morphism effects, and smooth animations.

### Authentication Flow

1. `main.jsx` wraps the entire app in `<GoogleOAuthProvider>` using the client ID from `VITE_GOOGLE_CLIENT_ID`.
2. `App.jsx` checks `AuthContext` — if no user is authenticated, it renders `LoginPage`; otherwise, `ChatPage`.
3. `LoginForm.jsx` initiates the **Google OAuth 2.0 Authorization Code Flow** via `useGoogleLogin({ flow: 'auth-code' })`.
4. On success, the authorization code is sent to `POST /auth/google` on the backend.
5. The backend exchanges the code for tokens, verifies the ID token, and returns `{ name, email, picture, accessToken }`.
6. `AuthContext` stores the user object in React state **and** `localStorage` for session persistence.
7. The access token is attached to all future Axios requests via `Authorization: Bearer <token>` and `X-User-Email` headers.

### Chat Interface

- **`ChatPage.jsx`** — orchestrates the conversation state, sends messages via `sendChatMessage()`, and manages the typing indicator.
- **`ChatWindow.jsx`** — renders a scrollable list of `MessageBubble` components with auto-scroll to the latest message.
- **`ChatInput.jsx`** — an auto-resizing textarea that sends on Enter (Shift+Enter for newlines).
- **`MessageBubble.jsx`** — detects whether an AI response contains an email summary (via `isEmailSummary()`) and renders either a plain text bubble or a structured `EmailSummary` card.

### Email Summary Rendering

`EmailSummary.jsx` performs a deep recursive search through the raw response data for objects containing `high_priority`, `medium_priority`, and `low_priority` arrays. Each email is rendered as a colour-coded card with subject, sender, summary, and action-required fields.

### API Service Layer

All HTTP calls are centralised in `services/api.js`:

| Function | Endpoint | Purpose |
|---|---|---|
| `googleLogin(code)` | `POST /auth/google` | Exchange auth code for tokens |
| `googleLogout(email)` | `POST /auth/logout` | Clear server-side credentials |
| `sendChatMessage(msg, email)` | `POST /chat` | Send chat to n8n orchestrator |
| `getGmailMessages()` | `GET /gmail/messages` | Fetch 5 recent emails |
| `sendGmailEmail({to, subject, body})` | `POST /gmail/send` | Send email via Gmail |
| `getCalendarEvents()` | `GET /calendar/events` | Fetch upcoming events |
| `createCalendarEvent({...})` | `POST /calendar/create` | Create calendar event |
| `formatEmail(message)` | `POST /email/format` | Format text via Llama 3 |

---

## Backend Explanation

### Express Server Setup

`server.js` initialises Express with:

- **CORS** configured for `http://localhost:5173` (Vite dev server) with credentials enabled.
- **body-parser** for JSON request parsing.
- Five route modules mounted at `/auth`, `/chat`, `/gmail`, `/calendar`, `/email`.
- A `/health` endpoint for service health checks.
- A browser-based OAuth flow at `GET /auth/login` → `GET /auth/callback` for developer testing via curl.
- A global error handler for uncaught exceptions.

### Authentication

Two authentication paths are supported:

1. **Frontend flow** — `POST /auth/google` receives an authorization code from the React app, exchanges it via `googleAuth.exchangeCodeForTokens()`, and returns user info + access token.
2. **Browser flow** — `GET /auth/login` redirects to Google consent screen, `GET /auth/callback` stores tokens server-side for curl-based development.

Tokens are stored in an **in-memory `Map`** keyed by user email. The `requireAuth` middleware extracts the `Bearer` token from the `Authorization` header and attaches it to `req.accessToken`.

### Request Lifecycle

```
HTTP Request
    │
    ▼
Express Router (routes/*.js)
    │
    ▼
Middleware (auth.js — if required)
    │
    ▼
Controller (controllers/*.js — validation + orchestration)
    │
    ▼
Service (services/*.js — external API call)
    │
    ▼
HTTP Response (JSON)
```

### Gmail Integration

| Layer | File | Responsibility |
|---|---|---|
| Route | `routes/gmail.js` | Maps HTTP verbs to controller methods |
| Controller | `controllers/gmailController.js` | Resolves access token (header → store → env fallback), validates input, calls service |
| Service | `services/gmailService.js` | Builds authenticated Gmail client, executes API calls, returns normalised data |

### Calendar Integration

| Layer | File | Responsibility |
|---|---|---|
| Route | `routes/calendar.js` | Requires `requireAuth` middleware |
| Controller | `controllers/calendarController.js` | Validates event fields, delegates to service |
| Service | `services/calendarService.js` | Builds Calendar client, lists/creates events with timezone support |

### n8n Integration

`services/n8nService.js` forwards user messages to the n8n webhook via `POST`. It handles response parsing (JSON or plain text), extracts the response text from multiple possible field names (`response`, `message`, `output`, `text`), and returns `{ response, raw }`.

### Ollama Integration

`services/ollamaService.js` provides two functions:

- `formatEmail(message)` — sends a formatting prompt to Llama 3 and returns `{ formattedEmail, model }`.
- `generateCompletion(prompt)` — generic prompt completion for future agent tasks.

---

## API Documentation

### Authentication

#### Exchange Google Auth Code

```
POST /auth/google
```

**Request Body:**

```json
{
  "code": "<google_authorization_code>"
}
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

#### Logout

```
POST /auth/logout
```

**Request Body:**

```json
{
  "email": "john@gmail.com"
}
```

**Response (200):**

```json
{
  "success": true
}
```

---

### Chat (n8n Orchestrator)

#### Send Message

```
POST /chat
```

**Request Body:**

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
  "raw": {
    "high_priority": [
      {
        "subject": "Urgent: Server Down",
        "sender": "ops@company.com",
        "summary": "Production server needs immediate attention",
        "action_required": "Check server status immediately"
      }
    ],
    "medium_priority": [],
    "low_priority": []
  }
}
```

---

### Gmail

#### List Recent Messages

```
GET /gmail/messages
```

**Headers:** `Authorization: Bearer <token>` or `X-User-Email: <email>`

**Response (200):**

```json
{
  "messages": [
    {
      "id": "18f1a2b3c4d",
      "subject": "Meeting Tomorrow",
      "sender": "alice@company.com",
      "snippet": "Hi, just a reminder about our meeting..."
    }
  ]
}
```

#### List Unread Messages

```
GET /gmail/unread?maxResults=20
```

**Response (200):**

```json
{
  "count": 3,
  "messages": [
    {
      "id": "18f1a2b3c4d",
      "subject": "Action Required",
      "sender": "hr@company.com",
      "snippet": "Please submit your timesheet...",
      "date": "Mon, 10 Mar 2026 09:00:00 +0000"
    }
  ]
}
```

#### Send Email

```
POST /gmail/send
```

**Headers:** `Authorization: Bearer <token>` or `X-User-Email: <email>`

**Request Body:**

```json
{
  "to": "recipient@gmail.com",
  "subject": "Project Update",
  "body": "Hi team, here is the weekly update..."
}
```

**Response (200):**

```json
{
  "messageId": "18f1a2b3c4d",
  "threadId": "18f1a2b3c4d"
}
```

---

### Calendar

#### List Upcoming Events

```
GET /calendar/events
```

**Headers:** `Authorization: Bearer <token>` (required)

**Response (200):**

```json
{
  "events": [
    {
      "id": "abc123",
      "title": "Team Standup",
      "start": "2026-03-10T09:00:00+05:30",
      "end": "2026-03-10T09:30:00+05:30"
    }
  ]
}
```

#### Create Event

```
POST /calendar/create
```

**Headers:** `Authorization: Bearer <token>` (required)

**Request Body:**

```json
{
  "title": "Sprint Planning",
  "date": "2026-03-15",
  "time": "14:00",
  "attendees": ["alice@company.com", "bob@company.com"]
}
```

**Response (200):**

```json
{
  "eventId": "xyz789",
  "eventLink": "https://www.google.com/calendar/event?eid=..."
}
```

---

### Email Formatting (Ollama / Llama 3)

#### Format Email

```
POST /email/format
```

**Headers:** `Authorization: Bearer <token>` (required)

**Request Body:**

```json
{
  "message": "tell john meeting moved to tomorrow 3pm"
}
```

**Response (200):**

```json
{
  "formattedEmail": "Dear John,\n\nI hope this message finds you well. I wanted to inform you that our meeting has been rescheduled to tomorrow at 3:00 PM.\n\nPlease let me know if this works for you.\n\nBest regards",
  "model": "llama3"
}
```

---

### Health Check

```
GET /health
```

**Response (200):**

```json
{
  "status": "ok",
  "timestamp": "2026-03-09T12:00:00.000Z"
}
```

---

## Data Storage

The application currently uses **no database**. All state is stored in-memory:

| Data | Storage | Location |
|---|---|---|
| OAuth tokens (access, refresh, id) | In-memory `Map` | `backend/services/googleAuth.js` → `tokenStore` |
| User session (name, email, picture, token) | `localStorage` | `frontend/src/context/AuthContext.jsx` |
| Chat messages | React component state | `frontend/src/pages/ChatPage.jsx` |

**Implications:**

- Tokens are **lost on backend restart** — users must re-authenticate.
- Chat history is **lost on page refresh** — no conversation persistence.
- Suitable for **development and demo purposes**; production deployment should add a persistent store (Redis, PostgreSQL, etc.).

---

## Installation & Setup

### Prerequisites

| Requirement | Version |
|---|---|
| Node.js | ≥ 18.0.0 |
| npm | ≥ 9.0.0 |
| Ollama | Latest |
| n8n | Latest (self-hosted or Docker) |
| Google Cloud Project | OAuth 2.0 credentials configured |

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Agent_m
```

### 2. Set Up Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select an existing one).
3. Navigate to **APIs & Services → Credentials**.
4. Create an **OAuth 2.0 Client ID** (type: Web application).
5. Add authorized redirect URIs:
   - `http://localhost:5000/auth/callback`
6. Add authorized JavaScript origins:
   - `http://localhost:5173`
7. Enable the following APIs:
   - Gmail API
   - Google Calendar API
8. Note down the **Client ID** and **Client Secret**.

### 3. Install Backend Dependencies

```bash
cd backend
npm install
```

### 4. Configure Backend Environment

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
N8N_WEBHOOK_URL=http://localhost:5678/webhook/agent
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

### 5. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### 6. Configure Frontend Environment

Create a `.env` file in the `frontend/` directory:

```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 7. Set Up Ollama

```bash
# Install Ollama (https://ollama.ai)
curl -fsSL https://ollama.ai/install.sh | sh

# Pull the Llama 3 model
ollama pull llama3

# Start the Ollama server (runs on port 11434 by default)
ollama serve
```

### 8. Set Up n8n

```bash
# Option A: npm global install
npm install -g n8n
n8n start

# Option B: Docker
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n
```

Once n8n is running, import the workflow JSON files from the `n8n_workflows/` directory:

1. Open n8n at `http://localhost:5678`.
2. Go to **Workflows → Import from File**.
3. Import each workflow file:
   - `main-orchestration.json` — the central orchestrator
   - `agent-email-summarizer.json` — email summary agent
   - `agent-email-composer.json` — email composition agent
   - `agent-calendar-scheduler.json` — calendar scheduling agent
   - `agent-research.json` — research agent
4. Configure the **Ollama** credential in n8n (pointing to your Ollama instance).
5. Configure the **Google Gemini API** credential in n8n (used by the email summarizer).
6. **Activate** the `main-orchestration` workflow.
7. Verify the webhook URL matches the `N8N_WEBHOOK_URL` in your backend `.env`.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | Port the Express server listens on |
| `GOOGLE_CLIENT_ID` | **Yes** | — | Google OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | **Yes** | — | Google OAuth 2.0 Client Secret |
| `N8N_WEBHOOK_URL` | No | `http://10.64.57.185:5678/webhook-test/agent` | n8n orchestrator webhook endpoint |
| `OLLAMA_URL` | No | `http://localhost:11434` | Ollama inference server URL |
| `OLLAMA_MODEL` | No | `llama3` | LLM model name for Ollama |
| `GMAIL_ACCESS_TOKEN` | No | — | Dev fallback: hardcoded Gmail token for testing |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | **Yes** | — | Google OAuth 2.0 Client ID (same as backend) |

---

## Running the Project

Open **four terminals** and start each service:

### Terminal 1 — Ollama

```bash
ollama serve
```

### Terminal 2 — n8n

```bash
n8n start
# Or: docker start n8n
```

### Terminal 3 — Backend

```bash
cd backend
npm run dev
# Server starts at http://localhost:5000
```

### Terminal 4 — Frontend

```bash
cd frontend
npm run dev
# App opens at http://localhost:5173
```

### Verification

1. Open `http://localhost:5173` in a browser.
2. Click **"Continue with Google"** and authorize with a Google account.
3. Once logged in, type a message in the chat (e.g., _"summarize my unread emails"_).
4. The message flows through the backend → n8n → agents → back to the UI.

**Quick health check:**

```bash
curl http://localhost:5000/health
# → {"status":"ok","timestamp":"..."}
```

---

## Example End-to-End Workflow

### Scenario: "Summarize my unread emails"

```
  ┌──────────────────────────────────────────────────────┐
  │  1. USER types: "summarize my unread emails"         │
  └──────────────────────┬───────────────────────────────┘
                         │
                         ▼
  ┌──────────────────────────────────────────────────────┐
  │  2. FRONTEND sends POST /chat                        │
  │     Body: { message, userEmail }                     │
  └──────────────────────┬───────────────────────────────┘
                         │
                         ▼
  ┌──────────────────────────────────────────────────────┐
  │  3. BACKEND receives request (aiController.chat)     │
  │     → n8nService.forwardToOrchestrator()             │
  │     → POST to N8N_WEBHOOK_URL                        │
  └──────────────────────┬───────────────────────────────┘
                         │
                         ▼
  ┌──────────────────────────────────────────────────────┐
  │  4. n8n ORCHESTRATOR                                 │
  │     a) Webhook receives payload                      │
  │     b) Intent Classifier → "email_summary"           │
  │     c) Switch routes to Email Summarizer Agent       │
  └──────────────────────┬───────────────────────────────┘
                         │
                         ▼
  ┌──────────────────────────────────────────────────────┐
  │  5. EMAIL SUMMARIZER AGENT (n8n sub-workflow)        │
  │     a) Calls Gmail API → fetches unread messages     │
  │     b) Sends messages to Llama 3 with prompt:        │
  │        "Classify these emails by priority..."        │
  │     c) Returns structured JSON with priority buckets │
  └──────────────────────┬───────────────────────────────┘
                         │
                         ▼
  ┌──────────────────────────────────────────────────────┐
  │  6. RESPONSE propagates back:                        │
  │     n8n → Backend → Frontend                         │
  └──────────────────────┬───────────────────────────────┘
                         │
                         ▼
  ┌──────────────────────────────────────────────────────┐
  │  7. FRONTEND renders EmailSummary component          │
  │     → Colour-coded priority cards                    │
  │     → Subject, sender, summary, action required      │
  └──────────────────────────────────────────────────────┘
```

### Scenario: "Schedule a meeting with Alice tomorrow at 3pm"

1. User sends the message via chat.
2. Backend forwards to n8n.
3. Intent Classifier returns `calendar_schedule`.
4. Calendar Agent extracts: title, date, time, attendees.
5. Agent calls Google Calendar API → creates event.
6. Returns `{ eventId, eventLink }` to the user.

---

## Future Improvements

| Area | Enhancement |
|---|---|
| **Conversation Memory** | Add chat history persistence with a database (PostgreSQL / MongoDB) so context is retained across sessions. |
| **Vector Database / RAG** | Integrate a vector store (Pinecone, ChromaDB) for retrieval-augmented generation over emails and documents. |
| **Agent Planning** | Implement a ReAct-style planner that decomposes complex multi-step tasks autonomously. |
| **Streaming Responses** | Add Server-Sent Events (SSE) or WebSocket support for real-time token streaming from the LLM. |
| **Multi-Turn Context** | Pass conversation history to the orchestrator so agents have awareness of prior turns. |
| **Token Refresh** | Implement automatic Google OAuth token refresh using stored refresh tokens. |
| **Additional Agents** | Slack notifications, Jira ticket creation, CRM lookup, file search. |
| **Cloud Deployment** | Containerize with Docker Compose; deploy to AWS/GCP/Azure with managed n8n. |
| **Testing** | Add unit tests (Jest), integration tests (Supertest), and E2E tests (Playwright). |
| **Role-Based Access** | Add RBAC for team environments with shared agent capabilities. |

---

## Screenshots / Demo

> _Screenshots and demo recordings will be added here._

### UI Screenshots

| Screen | Description |
|---|---|
| ![Login Page](docs/screenshots/login.png) | Space-themed login page with Google OAuth |
| ![Chat Interface](docs/screenshots/chat.png) | Main chat interface with AI responses |
| ![Email Summary](docs/screenshots/email-summary.png) | Priority-bucketed email summary cards |

### n8n Workflow Diagrams

| Workflow | Description |
|---|---|
| ![Orchestrator](docs/screenshots/n8n-orchestrator.png) | Main orchestrator with intent classification and routing |
| ![Email Agent](docs/screenshots/n8n-email-agent.png) | Email summarizer agent workflow |

### Demo

> 🎬 _A walkthrough GIF/video demonstrating the full flow from login → chat → email summary will be added._

---

## License

This project is developed for educational and demonstration purposes.

---

<p align="center">
  Built with ❤️ using React, Express, n8n, Ollama, and Llama 3
</p>
