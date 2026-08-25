import { useEffect, useState } from 'react'
import axios from 'axios'

// Estados posibles de la verificacion de salud del backend.
export type HealthStatus = 'loading' | 'connected' | 'disconnected'

// Forma esperada de la respuesta de GET /api/health.
interface HealthCheckResponse {
  status?: string
}

/**
 * Consulta `GET /api/health` al montar para determinar si el backend esta
 * disponible. Arranca en `'loading'`, pasa a `'connected'` cuando el backend
 * responde `{ status: 'ok' }`, y a `'disconnected'` en cualquier otro caso
 * (otro valor de `status` o peticion fallida).
 */
export function useHealthCheck(): { status: HealthStatus } {
  const [status, setStatus] = useState<HealthStatus>('loading')

  useEffect(() => {
    // Evita setear estado si el componente ya se desmonto cuando la
    // peticion resuelve (previene actualizaciones sobre un componente
    // desmontado).
    let cancelled = false

    async function checkHealth() {
      try {
        const response = await axios.get<HealthCheckResponse>('/api/health')
        if (cancelled) return
        setStatus(response.data.status === 'ok' ? 'connected' : 'disconnected')
      } catch {
        if (!cancelled) setStatus('disconnected')
      }
    }

    void checkHealth()

    return () => {
      cancelled = true
    }
  }, [])

  return { status }
}
