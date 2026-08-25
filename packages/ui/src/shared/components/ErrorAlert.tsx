interface ErrorAlertProps {
  message: string
  onRetry?: () => void
}

/**
 * Alerta de error presentacional (daisyUI). Muestra `message` dentro de un
 * contenedor con `role="alert"`. El boton de reintento solo se renderiza
 * cuando se provee `onRetry`.
 */
export function ErrorAlert({ message, onRetry }: ErrorAlertProps) {
  return (
    <div role="alert" className="alert alert-error">
      <span>{message}</span>

      {onRetry && (
        <button type="button" className="btn btn-sm" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  )
}
