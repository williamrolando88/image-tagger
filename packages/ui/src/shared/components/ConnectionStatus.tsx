import type { HealthStatus } from '../hooks/useHealthCheck'

interface ConnectionStatusProps {
  status: HealthStatus
}

// Texto legible por estado (contrato exacto verificado por tests).
const STATUS_LABEL: Record<HealthStatus, string> = {
  loading: 'Conectando…',
  connected: 'Conectado',
  disconnected: 'Desconectado',
}

// Color del punto indicador segun estado: verde si conectado, rojo si
// desconectado, y un pulso mientras el estado aun no se conoce.
const STATUS_DOT_CLASS: Record<HealthStatus, string> = {
  loading: 'bg-base-content/40 animate-pulse',
  connected: 'bg-success',
  disconnected: 'bg-error',
}

/**
 * Indicador presentacional del estado de conexion con el backend (daisyUI).
 * `role="status"` + `aria-live="polite"` anuncian el estado a tecnologias
 * asistivas; `data-status` expone el estado crudo para que los consumidores
 * (tests incluidos) no dependan del texto renderizado. El punto de color es
 * decorativo (`aria-hidden`).
 */
export function ConnectionStatus({ status }: ConnectionStatusProps) {
  return (
    <div
      role="status"
      data-status={status}
      aria-live="polite"
      className="flex items-center gap-2"
    >
      <span
        aria-hidden="true"
        className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT_CLASS[status]}`}
      />
      <span className="text-sm text-base-content/70">Estado:</span>
      <span className="text-sm font-medium">{STATUS_LABEL[status]}</span>
    </div>
  )
}
