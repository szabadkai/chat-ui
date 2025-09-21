import { io } from 'socket.io-client'
import { getToken } from './api.js'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || ''

export function createSocket() {
  if (!SOCKET_URL) return null
  const socket = io(SOCKET_URL, { transports: ['websocket'], auth: { token: getToken() } })
  return socket
}

