interface ProgressBarProps {
  value: number
  label?: string
}

/**
 * Barra de progreso presentacional (daisyUI). Redondea `value` al entero
 * mas cercano tanto para el atributo `value` del elemento nativo como para
 * el porcentaje mostrado como texto. El `label` es opcional y solo se
 * renderiza cuando se provee.
 */
export function ProgressBar({ value, label }: ProgressBarProps) {
  const percentage = Math.round(value)

  return (
    <div className="flex w-full flex-col gap-1">
      {label && <span className="text-sm text-base-content/70">{label}</span>}

      <div className="flex items-center gap-2">
        <progress className="progress progress-primary w-full" value={percentage} max={100} />
        <span className="text-sm tabular-nums shrink-0">{percentage}%</span>
      </div>
    </div>
  )
}
