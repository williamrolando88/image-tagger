import { useCallback, useMemo, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import type { Accept, FileRejection } from 'react-dropzone'

// Valores por defecto cuando el caller no los especifica.
const DEFAULT_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const DEFAULT_MAX_SIZE_BYTES = 10 * 1024 * 1024

interface ImageUploaderProps {
  previewUrl: string | null
  disabled?: boolean
  acceptedTypes?: string[]
  maxSizeBytes?: number
  onFileSelected: (file: File) => void
}

// Traduce el primer codigo de rechazo de react-dropzone a un mensaje en
// espanol legible para el usuario.
function buildRejectionMessage(rejection: FileRejection, maxSizeBytes: number): string {
  const code = rejection.errors[0]?.code

  if (code === 'file-too-large') {
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')
    return `El archivo es demasiado grande. Tamaño máximo: ${maxMb} MB.`
  }

  if (code === 'file-invalid-type') {
    return 'Formato no soportado. Sube una imagen JPG, PNG, WEBP o GIF.'
  }

  return 'No se pudo procesar el archivo. Intenta con otra imagen.'
}

/**
 * Area de subida de imagenes: arrastrar y soltar (via react-dropzone) o
 * boton de fallback. Muestra la preview de la imagen seleccionada y los
 * errores de validacion (tipo/tamano). El disparo del analisis vive en
 * `AnalysisControls`. Cuando `disabled` es true la seleccion no esta
 * permitida: el boton de fallback se oculta (no se renderiza) y el
 * drag&drop del dropzone se deshabilita.
 */
export function ImageUploader({
  previewUrl,
  disabled = false,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
  onFileSelected,
}: ImageUploaderProps) {
  const [validationError, setValidationError] = useState<string | null>(null)

  const accept: Accept = useMemo(
    () => Object.fromEntries(acceptedTypes.map((type) => [type, []])),
    [acceptedTypes],
  )

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (accepted[0]) {
        setValidationError(null)
        onFileSelected(accepted[0])
        return
      }

      if (rejections[0]) {
        setValidationError(buildRejectionMessage(rejections[0], maxSizeBytes))
      }
    },
    [onFileSelected, maxSizeBytes],
  )

  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    accept,
    maxSize: maxSizeBytes,
    multiple: false,
    disabled,
    // El area no abre el dialogo al hacer click: solo reacciona a drag&drop.
    // El boton de fallback es el unico que llama a open() explicitamente,
    // para evitar que se abra el selector dos veces.
    noClick: true,
    onDrop,
  })

  return (
    <div className="card bg-base-100 shadow-sm w-full max-w-md">
      <div className="card-body gap-4">
        <div
          {...getRootProps()}
          className={`rounded-box border-2 border-dashed flex flex-col items-center justify-center gap-3 p-8 text-center transition-colors ${
            isDragActive ? 'border-primary bg-primary/10' : 'border-base-300'
          }`}
        >
          <input {...getInputProps()} />

          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Vista previa de la imagen seleccionada"
              className="max-h-64 w-full rounded-box object-contain"
            />
          ) : (
            <p className="text-base-content/70">
              Arrastra y suelta una imagen aquí, o usa el botón para seleccionarla.
            </p>
          )}

          {!disabled && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={open}
            >
              Seleccionar imagen
            </button>
          )}
        </div>

        {validationError && (
          <div role="alert" className="alert alert-error">
            <span>{validationError}</span>
          </div>
        )}
      </div>
    </div>
  )
}
