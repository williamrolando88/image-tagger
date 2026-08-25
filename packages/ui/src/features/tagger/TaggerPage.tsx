import { AnalysisControls } from './components/AnalysisControls'
import { ImageUploader } from './components/ImageUploader'
import { TagResults } from './components/TagResults'
import { useImageAnalysis } from './hooks/useImageAnalysis'

/**
 * Pagina principal del feature "tagger": compone el hook `useImageAnalysis`
 * con los componentes presentacionales para cubrir todo el flujo (seleccion
 * de imagen, subida con progreso, procesamiento por IA, y resultado --
 * etiquetas o error con reintento). `ImageUploader` solo selecciona y
 * previsualiza; `AnalysisControls` aisla toda la interaccion dirigida por el
 * estado del analisis (disparo, progreso, procesamiento, error y reinicio).
 */
export function TaggerPage() {
  const { status, previewUrl, progress, tags, error, selectFile, analyze, reset } =
    useImageAnalysis()

  // Solo se puede (re)seleccionar imagen antes de iniciar el analisis: sin
  // imagen (idle) o con una elegida pero aun sin analizar (fileSelected).
  const canSelectImage = status === 'idle' || status === 'fileSelected'

  return (
    <section className="flex w-full flex-col items-center gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">Analizador de imágenes</h1>

      <ImageUploader
        previewUrl={previewUrl}
        disabled={!canSelectImage}
        onFileSelected={selectFile}
      />

      <AnalysisControls
        status={status}
        progress={progress}
        error={error}
        onAnalyze={analyze}
        onReset={reset}
      />

      {status === 'success' && <TagResults tags={tags} />}
    </section>
  )
}
