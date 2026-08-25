import { useEffect, useState } from 'react'
import './App.css'

type Status = 'loading' | 'connected' | 'disconnected'

const LABELS: Record<Status, string> = {
  loading: 'Conectando…',
  connected: 'Conectado',
  disconnected: 'Desconectado',
}

function App() {
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    let cancelled = false

    async function checkHealth() {
      try {
        const res = await fetch('/api/health')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: { status?: string } = await res.json()
        if (!cancelled) {
          setStatus(data.status === 'ok' ? 'connected' : 'disconnected')
        }
      } catch {
        if (!cancelled) setStatus('disconnected')
      }
    }

    void checkHealth()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="app">
      <div className={`status status--${status}`} role="status" aria-live="polite">
        <span className="status__dot" aria-hidden="true" />
        <span className="status__label">{LABELS[status]}</span>
      </div>
    </main>
  )
}

export default App
