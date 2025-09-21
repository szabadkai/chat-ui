# Chat UI

Modern React chat UI with light/dark themes and optional backend integration.

## Quick Start

Frontend (Vite):
- Install deps: `npm install`
- Start dev: `npm run dev` (default at `http://localhost:5173`)

Backend (Express + Socket.io):
- In `server/`: `npm install` then `npm run dev` (default at `http://localhost:8787`)

## Backend Integration

Set the following environment variables for the frontend (create `.env.local` from `.env.example`):
- `VITE_API_URL`: REST API base URL, e.g. `http://localhost:8787`
- `VITE_SOCKET_URL`: Socket.io URL, usually same as API

Server CORS and JWT:
- `CORS_ORIGIN`: Allowed origin for the frontend (defaults to `http://localhost:5173`)
- `JWT_SECRET`: Secret for signing tokens (defaults to `dev-secret`)

When `VITE_API_URL` is set, the app auto-provisions a demo user on first run, persists the token, lists/creates a default room, and switches to live data. Messages stream via Socket.io.

## Theme

- Uses CSS variables for major surfaces and borders.
- Respects system preference on first load; persists user choice.
- Toggle button in the sidebar switches light/dark without flicker.

## Notes

- This repo includes a simple in-memory backend for local development. It is not intended for production use.
- If you change dev ports, update `CORS_ORIGIN` and the Vite env URLs accordingly.
