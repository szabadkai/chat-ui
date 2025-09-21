import express from 'express'
import http from 'node:http'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Server as SocketIOServer } from 'socket.io'
import { db } from './db.js'

const PORT = process.env.PORT || 8787
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'
const ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173'

const app = express()
app.use(cors({ origin: ORIGIN, credentials: true }))
app.use(express.json())

// --- Auth helpers ---
function sign(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
}
function auth(req, res, next) {
  const hdr = req.headers.authorization || ''
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing token' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = { id: payload.sub, email: payload.email }
    return next()
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// --- Routes ---
app.get('/health', (_req, res) => res.json({ ok: true }))

// Auth
app.post('/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ error: 'email and password required' })
    const password_hash = await bcrypt.hash(password, 10)
    const user = await db.createUser({ email, password_hash })
    const token = sign(user)
    res.json({ token, user: { id: user.id, email: user.email } })
  } catch (e) {
    res.status(400).json({ error: e.message || 'Signup failed' })
  }
})

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ error: 'email and password required' })
    const user = await db.findUserByEmail(email)
    if (!user || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    const token = sign(user)
    res.json({ token, user: { id: user.id, email: user.email } })
  } catch (e) {
    res.status(400).json({ error: e.message || 'Login failed' })
  }
})

// User device token (push) — stored, not used in this proto
app.post('/me/fcm', auth, async (req, res) => {
  const { fcm_token } = req.body || {}
  const user = await db.updateUserToken(req.user.id, fcm_token)
  res.json({ ok: true, user: user && { id: user.id, email: user.email, fcm_token: user.fcm_token } })
})

// Rooms
app.get('/rooms', auth, async (_req, res) => {
  const rooms = await db.listRooms()
  res.json({ rooms })
})

app.post('/rooms', auth, async (req, res) => {
  const { name } = req.body || {}
  if (!name) return res.status(400).json({ error: 'name required' })
  const room = await db.createRoom({ name, created_by: req.user.id })
  res.json({ room })
})

app.get('/rooms/:id', auth, async (req, res) => {
  const room = await db.getRoom(req.params.id)
  if (!room) return res.status(404).json({ error: 'Room not found' })
  const messages = await db.listMessages(room.id, { limit: 50 })
  res.json({ room, messages })
})

// Messages
app.get('/rooms/:id/messages', auth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200)
  const before = req.query.before || undefined
  const room = await db.getRoom(req.params.id)
  if (!room) return res.status(404).json({ error: 'Room not found' })
  const messages = await db.listMessages(room.id, { limit, before })
  res.json({ messages })
})

app.post('/rooms/:id/messages', auth, async (req, res) => {
  const { content } = req.body || {}
  if (!content) return res.status(400).json({ error: 'content required' })
  const room = await db.getRoom(req.params.id)
  if (!room) return res.status(404).json({ error: 'Room not found' })
  const msg = await db.addMessage({ room_id: room.id, user_id: req.user.id, content })
  io.to(`room:${room.id}`).emit('message:new', msg)
  res.json({ message: msg })
})

// --- HTTP + Socket.io ---
const server = http.createServer(app)
const io = new SocketIOServer(server, { cors: { origin: ORIGIN } })

io.use((socket, next) => {
  // Optional auth for proto: allow unauthenticated, but parse token if present
  const token = socket.handshake.auth?.token
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET)
      socket.data.user = { id: payload.sub, email: payload.email }
    } catch (_) {
      // ignore invalid; keep socket unauthenticated
    }
  }
  next()
})

io.on('connection', (socket) => {
  socket.on('room:join', (roomId) => {
    socket.join(`room:${roomId}`)
  })
  socket.on('room:leave', (roomId) => {
    socket.leave(`room:${roomId}`)
  })
  socket.on('message:send', async ({ roomId, content }) => {
    if (!roomId || !content) return
    const userId = socket.data.user?.id
    if (!userId) return // require auth token for sending in this proto
    try {
      const room = await db.getRoom(roomId)
      if (!room) return
      const msg = await db.addMessage({ room_id: roomId, user_id: userId, content })
      io.to(`room:${roomId}`).emit('message:new', msg)
    } catch (e) {
      // swallow
    }
  })
})

server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})

