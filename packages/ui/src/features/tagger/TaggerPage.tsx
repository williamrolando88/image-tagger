import { ImageUploader } from './components/ImageUploader'
import { TagResults } from './components/TagResults'
import { useImageAnalysis } from './hooks/useImageAnalysis'
import { ErrorAlert } from '../../shared/components/ErrorAlert'
import { ProgressBar } from '../../shared/components/ProgressBar'
import { Spinner } from '../../shared/components/Spinner'

/**
 * Pagina principal del feature "tagger": compone el hook `useImageAnalysis`
 * con los componentes presentacionales para cubrir todo el flujo (seleccion
 * de imagen, subida con progreso, procesamiento por IA, y resultado --
 * etiquetas o error con reintento).
 */
export function TaggerPage() {
  const { status, previewUrl, progress, tags, error, selectFile, analyze } =
    useImageAnalysis()

  // La subida y el procesamiento por IA deshabilitan el uploader para evitar
  // selecciones o analisis concurrentes.
  const isBusy = status === 'uploading' || status === 'processing'

  return (
    <section className="flex w-full flex-col items-center gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">Analizador de imágenes</h1>

      <ImageUploader
        previewUrl={previewUrl}
        disabled={isBusy}
        onFileSelected={selectFile}
        onAnalyze={analyze}
      />

      {status === 'uploading' && (
        <div className="w-full max-w-md">
          <ProgressBar value={progress} label="Subiendo imagen…" />
        </div>
      )}

      {status === 'processing' && <Spinner label="Procesando…" />}

      {status === 'error' && error && (
        // Reintentar vuelve a invocar el analisis: el archivo sigue
        // seleccionado en el hook, asi que `analyze` no es un no-op.
        <div className="w-full max-w-md">
          <ErrorAlert message={error} onRetry={analyze} />
        </div>
      )}

      {status === 'success' && <TagResults tags={tags} />}
    </section>
  )
}
