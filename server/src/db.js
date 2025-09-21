// Simple in-memory store with optional future Postgres swap
// Schema (MVP): users, rooms, messages
import crypto from 'node:crypto'

const now = () => new Date().toISOString()
const genId = () => (crypto.randomUUID ? crypto.randomUUID() : 'id_' + Math.random().toString(36).slice(2, 10))

const store = {
  users: new Map(), // id -> { id, email, password_hash, fcm_token, created_at }
  rooms: new Map(), // id -> { id, name, created_by, created_at }
  messages: new Map(), // room_id -> Array<{ id, room_id, user_id, content, timestamp }>
}

// Seed one room for initial testing
const seedUserId = genId()
const seedRoomId = genId()
store.users.set(seedUserId, { id: seedUserId, email: 'demo@example.com', password_hash: '', fcm_token: null, created_at: now() })
store.rooms.set(seedRoomId, { id: seedRoomId, name: 'General', created_by: seedUserId, created_at: now() })
store.messages.set(seedRoomId, [])

export const db = {
  // Users
  async createUser({ email, password_hash, fcm_token = null }) {
    const exists = Array.from(store.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase())
    if (exists) throw new Error('Email already exists')
    const id = genId()
    const user = { id, email, password_hash, fcm_token, created_at: now() }
    store.users.set(id, user)
    return user
  },
  async findUserByEmail(email) {
    return Array.from(store.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase()) || null
  },
  async findUserById(id) { return store.users.get(id) || null },
  async updateUserToken(id, fcm_token) {
    const u = store.users.get(id)
    if (!u) return null
    const nu = { ...u, fcm_token }
    store.users.set(id, nu)
    return nu
  },

  // Rooms
  async createRoom({ name, created_by }) {
    const id = genId()
    const room = { id, name, created_by, created_at: now() }
    store.rooms.set(id, room)
    if (!store.messages.has(id)) store.messages.set(id, [])
    return room
  },
  async listRooms() { return Array.from(store.rooms.values()).sort((a,b) => a.created_at.localeCompare(b.created_at)) },
  async getRoom(id) { return store.rooms.get(id) || null },

  // Messages
  async addMessage({ room_id, user_id, content }) {
    if (!store.rooms.get(room_id)) throw new Error('Room not found')
    const id = genId()
    const m = { id, room_id, user_id, content, timestamp: now() }
    const arr = store.messages.get(room_id) || []
    arr.push(m)
    store.messages.set(room_id, arr)
    return m
  },
  async listMessages(room_id, { limit = 50, before } = {}) {
    let arr = store.messages.get(room_id) || []
    if (before) arr = arr.filter(m => m.timestamp < before)
    return arr.slice(-limit)
  },
}

