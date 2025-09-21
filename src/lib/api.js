const API_URL = import.meta.env.VITE_API_URL || ''

const authKey = 'auth.token.v1'

export function getToken() {
  return localStorage.getItem(authKey) || ''
}

export function setToken(token) {
  if (token) localStorage.setItem(authKey, token)
}

async function req(path, { method = 'GET', body, auth = true } = {}) {
  if (!API_URL) throw new Error('API URL not configured')
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const t = getToken()
    if (t) headers.Authorization = `Bearer ${t}`
  }
  const res = await fetch(API_URL + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText)
  return res.json()
}

export const api = {
  url: API_URL,
  async signup(email, password) { return req('/auth/signup', { method: 'POST', body: { email, password }, auth: false }) },
  async login(email, password) { return req('/auth/login', { method: 'POST', body: { email, password }, auth: false }) },
  async listRooms() { return req('/rooms') },
  async createRoom(name) { return req('/rooms', { method: 'POST', body: { name } }) },
  async getRoom(id) { return req(`/rooms/${id}`) },
  async listMessages(id, params = {}) {
    const q = new URLSearchParams()
    if (params.limit) q.set('limit', String(params.limit))
    if (params.before) q.set('before', params.before)
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return req(`/rooms/${id}/messages${suffix}`)
  },
  async sendMessage(id, content) { return req(`/rooms/${id}/messages`, { method: 'POST', body: { content } }) },
}

