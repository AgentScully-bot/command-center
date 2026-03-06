import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'

let wss: WebSocketServer

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'connected' }))

    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping()
      }
    }, 30000)

    ws.on('close', () => clearInterval(interval))
  })

  console.log('[ws] WebSocket server ready on /ws')
}

export function broadcast(channel: string) {
  if (!wss) return
  const msg = JSON.stringify({ type: 'update', channel, timestamp: Date.now() })
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg)
    }
  }
}
