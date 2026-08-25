interface SpinnerProps {
  label?: string
}

/**
 * Indicador de carga presentacional (daisyUI). `role="status"` anuncia el
 * estado a tecnologias asistivas; el `label` es opcional y solo se
 * renderiza cuando se provee.
 */
export function Spinner({ label }: SpinnerProps) {
  return (
    <div role="status" className="flex items-center gap-2">
      <span className="loading loading-spinner loading-md text-primary" />
      {label && <span className="text-sm text-base-content/70">{label}</span>}
    </div>
  )
}
