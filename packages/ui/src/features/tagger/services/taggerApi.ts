import axios from 'axios'
import type { Tag } from '../taggerTypes'

// Forma esperada de la respuesta exitosa del backend en POST /api/analyze.
interface AnalyzeResponse {
  tags: Tag[]
}

// Forma del cuerpo de error que devuelve el backend (ver
// `common/errors/errorHandler.ts` en la API): `{ error: { message, code } }`.
interface AnalyzeErrorBody {
  error?: { message?: string; code?: string }
}

interface AnalyzeImageOptions {
  onUploadProgress?: (percent: number) => void
}

// Mensaje amigable cuando la peticion no llega al backend (servidor caido,
// sin red, CORS, etc.). No mostramos al usuario el mensaje crudo de axios
// (ej. "Network Error") porque no es comprensible ni util.
const CONNECTION_ERROR_MESSAGE =
  'No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.'

const UNEXPECTED_ERROR_MESSAGE =
  'Ocurrió un error inesperado al analizar la imagen. Intenta de nuevo.'

/**
 * Envia la imagen al backend (`POST /api/analyze`) como `multipart/form-data`
 * y devuelve las etiquetas detectadas por el servicio de IA.
 *
 * `options.onUploadProgress`, si se provee, se invoca con el porcentaje
 * entero (0-100) de avance de la subida, para alimentar un indicador visual.
 */
export async function analyzeImage(
  file: File,
  options?: AnalyzeImageOptions,
): Promise<Tag[]> {
  const formData = new FormData()
  formData.append('image', file)

  try {
    const response = await axios.post<AnalyzeResponse>(
      '/api/analyze',
      formData,
      {
        onUploadProgress: (event) => {
          // `event.total` puede venir undefined/0 cuando el navegador no
          // logra calcular la longitud total del contenido; en ese caso no
          // hay forma confiable de calcular un porcentaje, asi que no se
          // reporta progreso (evita dividir por cero o mostrar valores
          // erroneos).
          if (!event.total) return
          const percent = Math.round((event.loaded / event.total) * 100)
          options?.onUploadProgress?.(percent)
        },
      },
    )

    return response.data.tags
  } catch (error) {
    // Normalizamos cualquier error a un `Error` con mensaje ya listo para
    // mostrar en la UI, sin exponer detalles internos de axios/HTTP.
    // Conservamos el error original en `cause` para no perder el detalle
    // tecnico (util para debugging/observabilidad) aunque el mensaje visible
    // sea el amigable.
    if (axios.isAxiosError<AnalyzeErrorBody>(error)) {
      const backendMessage = error.response?.data?.error?.message
      if (backendMessage) {
        // El backend ya entrega un mensaje claro (validacion, fallo de
        // Imagga, etc.): lo propagamos tal cual.
        throw new Error(backendMessage, { cause: error })
      }

      if (!error.response) {
        // Sin `response` la peticion nunca completo un ciclo HTTP (caida de
        // red, servidor no disponible): es un error de conectividad.
        throw new Error(CONNECTION_ERROR_MESSAGE, { cause: error })
      }
    }

    throw new Error(UNEXPECTED_ERROR_MESSAGE, { cause: error })
  }
}
