Backend (MVP)

Run locally
- cd server
- npm install
- npm run dev

Env vars (optional)
- PORT: defaults 8787
- CORS_ORIGIN: defaults http://localhost:5173
- JWT_SECRET: defaults dev-secret
- DATABASE_URL: (not used in proto; in-memory DB is default)

API
- GET /health
- POST /auth/signup { email, password }
- POST /auth/login { email, password }
- POST /me/fcm { fcm_token } (Bearer token)
- GET /rooms (Bearer token)
- POST /rooms { name } (Bearer token)
- GET /rooms/:id (Bearer token)
- GET /rooms/:id/messages?limit=&before= (Bearer token)
- POST /rooms/:id/messages { content } (Bearer token)

Socket.io
- connect with auth: { token }
- room:join (roomId)
- room:leave (roomId)
- message:send { roomId, content } (requires auth)
- message:new (server broadcast)

Notes
- Uses in-memory storage for the proto. Swap to Postgres later.
- Push notifications are out-of-scope for local proto; we only store fcm_token.

