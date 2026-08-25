import { useCallback, useEffect, useRef, useState } from 'react'
import { analyzeImage } from '../services/taggerApi'
import type { Tag } from '../taggerTypes'

// Estados del flujo de analisis de una imagen: desde que no hay nada
// seleccionado hasta el resultado final (exito o error).
export type AnalysisStatus =
  | 'idle'
  | 'fileSelected'
  | 'uploading'
  | 'processing'
  | 'success'
  | 'error'

interface UseImageAnalysisResult {
  status: AnalysisStatus
  file: File | null
  previewUrl: string | null
  progress: number
  tags: Tag[]
  error: string | null
  selectFile: (file: File) => void
  analyze: () => Promise<void>
  reset: () => void
}

const UNEXPECTED_ERROR_MESSAGE = 'Ocurrió un error inesperado al analizar la imagen.'

/**
 * Orquesta el flujo de UI para analizar una imagen: seleccion de archivo,
 * subida con progreso, y resultado (tags o error). No conoce detalles de
 * red: delega en `analyzeImage` (`services/taggerApi.ts`).
 */
export function useImageAnalysis(): UseImageAnalysisResult {
  const [status, setStatus] = useState<AnalysisStatus>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [tags, setTags] = useState<Tag[]>([])
  const [error, setError] = useState<string | null>(null)

  // Referencia al preview vigente para poder revocarlo sin depender del
  // valor de estado dentro de un updater (evita doble-revocacion bajo
  // StrictMode, donde los updaters pueden re-ejecutarse).
  const previewUrlRef = useRef<string | null>(null)

  const selectFile = useCallback((selected: File) => {
    // Revoca el preview anterior (si existia) antes de crear el nuevo, para
    // no filtrar object URLs.
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
    }

    const nextPreviewUrl = URL.createObjectURL(selected)
    previewUrlRef.current = nextPreviewUrl

    setFile(selected)
    setPreviewUrl(nextPreviewUrl)
    setStatus('fileSelected')
    setProgress(0)
    setTags([])
    setError(null)
  }, [])

  const analyze = useCallback(async () => {
    // Sin archivo seleccionado no hay nada que analizar.
    if (!file) return

    setStatus('uploading')
    setProgress(0)
    setError(null)
    setTags([])

    try {
      const result = await analyzeImage(file, {
        onUploadProgress: (percent) => {
          setProgress(percent)
          setStatus(percent >= 100 ? 'processing' : 'uploading')
        },
      })
      setTags(result)
      setStatus('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : UNEXPECTED_ERROR_MESSAGE)
      setStatus('error')
    }
  }, [file])

  const reset = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }

    setStatus('idle')
    setFile(null)
    setPreviewUrl(null)
    setProgress(0)
    setTags([])
    setError(null)
  }, [])

  // Revoca el ultimo object URL vigente al desmontar, para no filtrar el blob
  // si el componente se desmonta sin pasar antes por reset/selectFile.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  return {
    status,
    file,
    previewUrl,
    progress,
    tags,
    error,
    selectFile,
    analyze,
    reset,
  }
}
