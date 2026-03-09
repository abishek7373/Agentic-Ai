# StellarMind — Frontend

> React 18 single-page application with Google OAuth, a conversational chat interface, and intelligent email summary rendering — styled with Tailwind CSS 4 and a custom space theme.

---

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Authentication Flow](#authentication-flow)
- [Chat Interface](#chat-interface)
- [Email Summary Rendering](#email-summary-rendering)
- [API Service Layer](#api-service-layer)
- [Styling & Theme](#styling--theme)
- [Development Setup](#development-setup)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Vite Proxy Configuration](#vite-proxy-configuration)

---

## Overview

The frontend provides the user-facing layer of StellarMind. It handles:

- **Google OAuth 2.0 login** using the Authorization Code flow.
- **Conversational chat UI** where users issue natural language commands.
- **Structured rendering** of AI agent responses (e.g., priority-bucketed email summaries).
- **HTTP communication** with the Express backend via Vite's dev proxy.

---

## Technology Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 18.3 | Component-based UI framework |
| Vite | 5.4 | Dev server, HMR, build tool, API proxy |
| Tailwind CSS | 4.2 | Utility-first CSS with `@tailwindcss/vite` plugin |
| @react-oauth/google | 0.12 | Google OAuth 2.0 Authorization Code flow |
| Axios | 1.7 | HTTP client for backend API calls |

---

## Project Structure

```
frontend/
├── index.html                  # HTML shell — loads /src/main.jsx
├── package.json                # Dependencies & scripts
├── vite.config.js              # Vite plugins, proxy, dev server config
│
└── src/
    ├── main.jsx                # React root — GoogleOAuthProvider wrapper
    ├── App.jsx                 # Auth gate: LoginPage ↔ ChatPage
    ├── index.css               # Global styles, Tailwind theme, keyframes
    ├── App.css                 # Component-specific styles
    │
    ├── context/
    │   └── AuthContext.jsx     # Global auth state + login/logout logic
    │
    ├── pages/
    │   ├── LoginPage.jsx       # Animated login page with particles
    │   ├── ChatPage.jsx        # Main chat layout (Navbar + Chat + Input)
    │   └── Dashboard.jsx       # Alt dashboard: email composer, calendar
    │
    ├── components/
    │   ├── LoginForm.jsx       # Google OAuth button + scope configuration
    │   ├── Navbar.jsx          # Top bar: logo, status indicator, logout
    │   ├── ChatWindow.jsx      # Scrollable message list + typing dots
    │   ├── ChatInput.jsx       # Auto-resizing textarea + send button
    │   ├── MessageBubble.jsx   # User/AI bubble, detects email summaries
    │   └── EmailSummary.jsx    # Priority-bucketed email summary cards
    │
    └── services/
        └── api.js              # Axios instance, auth helpers, all API calls
```

---

## Architecture

```
                ┌─────────────────────────────────┐
                │           main.jsx               │
                │   GoogleOAuthProvider wrapper     │
                └───────────────┬─────────────────┘
                                │
                                ▼
                ┌─────────────────────────────────┐
                │            App.jsx               │
                │   AuthProvider → AppContent       │
                │   user ? ChatPage : LoginPage     │
                └───────┬──────────────┬──────────┘
                        │              │
               ┌────────▼──────┐ ┌─────▼──────────┐
               │  LoginPage    │ │   ChatPage      │
               │  └ LoginForm  │ │  ├ Navbar       │
               │    (OAuth)    │ │  ├ ChatWindow   │
               └───────────────┘ │  │  └ Messages  │
                                 │  └ ChatInput    │
                                 └────────┬────────┘
                                          │
                                          ▼
                                 ┌────────────────┐
                                 │   api.js        │
                                 │   (Axios)       │
                                 └───────┬────────┘
                                         │  Vite Proxy
                                         ▼
                                 ┌────────────────┐
                                 │   Backend API   │
                                 │   :5000         │
                                 └────────────────┘
```

---

## Authentication Flow

### Sequence

```
User clicks "Continue with Google"
           │
           ▼
LoginForm triggers useGoogleLogin({ flow: 'auth-code' })
           │
           ▼
Google consent screen → returns authorization code
           │
           ▼
AuthContext.login(code) → api.googleLogin(code)
           │
           ▼
POST /auth/google { code } → Backend exchanges for tokens
           │
           ▼
Response: { name, email, picture, accessToken }
           │
           ▼
AuthContext stores user in state + localStorage
setAuthToken(accessToken) → Axios default header
setUserEmail(email) → X-User-Email header
           │
           ▼
App re-renders → ChatPage is shown
```

### OAuth Scopes Requested

```
openid
profile
email
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/gmail.compose
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/calendar
```

### Session Persistence

- User data (including `accessToken`) is stored in `localStorage` under key `agent_m_user`.
- On page reload, `AuthContext` reads from `localStorage` and restores the session.
- On logout, `localStorage` is cleared and `POST /auth/logout` notifies the backend.

---

## Chat Interface

### Component Hierarchy

```
ChatPage
  ├── Navbar            (fixed top bar)
  ├── ChatWindow        (scrollable message area)
  │   ├── Empty state   ("How can I help you?")
  │   ├── MessageBubble (per message)
  │   │   ├── Text bubble (plain AI/user message)
  │   │   └── EmailSummary (structured email cards)
  │   └── TypingIndicator (animated dots)
  └── ChatInput         (textarea + send button)
```

### Message Flow

1. User types in `ChatInput` and presses Enter.
2. `ChatPage.handleSend(text)` adds a `{ role: 'user', content }` message to state.
3. `isTyping` is set to `true` — `TypingIndicator` appears.
4. `sendChatMessage(text, email)` fires `POST /chat` to the backend.
5. On response, an `{ role: 'ai', content, rawData }` message is appended.
6. `ChatWindow` auto-scrolls to the bottom via `useRef`.
7. `MessageBubble` checks if `rawData` contains an email summary → renders `EmailSummary` or plain text.

### Error Handling

If the API call fails, an error message is shown as an AI bubble:

> _"Connection disrupted. Unable to reach the server. Please try again."_

---

## Email Summary Rendering

The `EmailSummary` component handles complex nested JSON responses from the n8n email agent.

### Detection Logic (`isEmailSummary`)

1. Performs a recursive deep search (`findSummaryNode`) through the raw data object.
2. Looks for objects containing `high_priority`, `medium_priority`, or `low_priority` arrays.
3. Handles JSON strings embedded within response fields (double-encoded payloads).
4. Falls back to parsing the `content` string as JSON.

### Rendering

| Priority | Colour | Icon |
|---|---|---|
| High | Red (`#ff4d4f`) | 🔥 |
| Medium | Yellow (`#faad14`) | ⚠️ |
| Low | Green (`#52c41a`) | 📩 |

Each email card displays:

- **Subject** — email subject line
- **From** — sender address
- **Summary** — AI-generated summary text
- **Action** — action required badge (if applicable)

---

## API Service Layer

All backend communication is centralised in `services/api.js`.

### Axios Configuration

```javascript
const api = axios.create({
  baseURL: '/',                    // Vite proxy handles routing
  headers: { 'Content-Type': 'application/json' },
});
```

### Auth Header Management

| Function | Effect |
|---|---|
| `setAuthToken(token)` | Sets `Authorization: Bearer <token>` on all requests |
| `setUserEmail(email)` | Sets `X-User-Email: <email>` on all requests |

### Available Functions

| Function | Method | Endpoint | Returns |
|---|---|---|---|
| `googleLogin(code)` | POST | `/auth/google` | `{ name, email, picture, accessToken }` |
| `googleLogout(email)` | POST | `/auth/logout` | `{ success }` |
| `sendChatMessage(msg, email)` | POST | `/chat` | `{ response, raw }` |
| `getGmailMessages()` | GET | `/gmail/messages` | `{ messages: [...] }` |
| `sendGmailEmail({to, subject, body})` | POST | `/gmail/send` | `{ messageId, threadId }` |
| `getCalendarEvents()` | GET | `/calendar/events` | `{ events: [...] }` |
| `createCalendarEvent({...})` | POST | `/calendar/create` | `{ eventId, eventLink }` |
| `formatEmail(message)` | POST | `/email/format` | `{ formattedEmail, model }` |

---

## Styling & Theme

### Theme Tokens (Tailwind CSS 4)

Defined in `index.css` via `@theme`:

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#1B1F3B` | Page background |
| `--color-primary-light` | `#232848` | Card / navbar background |
| `--color-accent` | `#FF6F61` | Brand colour, buttons, highlights |
| `--color-secondary` | `#3B4D88` | Borders, secondary elements |
| `--color-text` | `#E8E8F0` | Primary text |
| `--color-text-muted` | `#9090A8` | Secondary text |
| `--font-orbitron` | Orbitron | Logo / heading font |
| `--font-body` | Inter | Body text font |

### Visual Effects

- **Glass morphism** — `backdrop-blur` with semi-transparent backgrounds.
- **Particle animation** — floating dots on the login page.
- **Typing indicator** — three bouncing dots during AI response loading.
- **Fade-in-up** — messages animate into view on arrival.
- **Auto-resize textarea** — grows with input, capped at 150px.

---

## Development Setup

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- Backend server running on `http://localhost:5000`

### Install

```bash
cd frontend
npm install
```

### Configure

Create a `.env` file:

```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### Run

```bash
npm run dev
# → http://localhost:5173
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | **Yes** | Google OAuth 2.0 Client ID. Must match the backend's `GOOGLE_CLIENT_ID`. |

---

## Available Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `npm run dev` | Start Vite dev server with HMR on port 5173 |
| `build` | `npm run build` | Production build to `dist/` |
| `preview` | `npm run preview` | Preview the production build locally |

---

## Vite Proxy Configuration

The Vite dev server proxies API requests to the backend to avoid CORS issues during development:

```javascript
// vite.config.js
proxy: {
  '/auth':     'http://localhost:5000',
  '/chat':     'http://localhost:5000',
  '/gmail':    'http://localhost:5000',
  '/calendar': 'http://localhost:5000',
  '/email':    'http://localhost:5000',
}
```

All requests matching these prefixes are transparently forwarded to the Express server on port 5000. In production, a reverse proxy (e.g., Nginx) would handle routing instead.

---

<p align="center">
  Part of the <strong>StellarMind</strong> AI Productivity Automation Platform
</p>
