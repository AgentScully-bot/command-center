import { ref } from 'vue'

type UpdateHandler = (channel: string) => void

const handlers = new Set<UpdateHandler>()
let ws: WebSocket | null = null
const connected = ref(false)

function connect() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  ws = new WebSocket(`${protocol}//${window.location.host}/ws`)

  ws.onopen = () => {
    connected.value = true
    console.log('[ws] connected')
  }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data)
      if (msg.type === 'update' && msg.channel) {
        for (const handler of handlers) {
          handler(msg.channel)
        }
      }
    } catch { /* ignore malformed messages */ }
  }

  ws.onclose = () => {
    connected.value = false
    console.log('[ws] disconnected, reconnecting in 3s...')
    setTimeout(connect, 3000)
  }

  ws.onerror = () => {
    ws?.close()
  }
}

let started = false
function ensureStarted() {
  if (!started) {
    started = true
    connect()
  }
}

export function useWebSocket() {
  ensureStarted()
  return { connected }
}

export function onWsUpdate(handler: UpdateHandler): () => void {
  ensureStarted()
  handlers.add(handler)
  return () => handlers.delete(handler)
}
