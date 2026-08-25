import type { AnalysisStatus } from '../hooks/useImageAnalysis'
import { ErrorAlert } from '../../../shared/components/ErrorAlert'
import { ProgressBar } from '../../../shared/components/ProgressBar'
import { Spinner } from '../../../shared/components/Spinner'

interface AnalysisControlsProps {
  status: AnalysisStatus
  progress: number
  error: string | null
  onAnalyze: () => void
  onReset: () => void
}

const UNEXPECTED_ERROR_MESSAGE = 'Ocurrió un error inesperado.'

/**
 * Interaccion dirigida por el estado del flujo de analisis: boton para
 * disparar el analisis, indicadores de progreso/procesamiento, alerta de
 * error con reintento, y boton para reiniciar tras el exito. Aislado de
 * `ImageUploader` (que solo selecciona y previsualiza) para mantener una
 * unica responsabilidad por componente.
 */
export function AnalysisControls({
  status,
  progress,
  error,
  onAnalyze,
  onReset,
}: AnalysisControlsProps) {
  if (status === 'idle') return null

  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      {status === 'fileSelected' && (
        <button type="button" className="btn btn-primary w-full" onClick={onAnalyze}>
          Analizar
        </button>
      )}

      {status === 'uploading' && <ProgressBar value={progress} label="Subiendo imagen…" />}

      {status === 'processing' && <Spinner label="Procesando…" />}

      {status === 'success' && (
        <button type="button" className="btn btn-outline w-full" onClick={onReset}>
          Analizar otra imagen
        </button>
      )}

      {status === 'error' && (
        <ErrorAlert message={error ?? UNEXPECTED_ERROR_MESSAGE} onRetry={onAnalyze} />
      )}
    </div>
  )
}
