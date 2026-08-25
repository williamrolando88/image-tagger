import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import type { AxiosProgressEvent, AxiosResponse } from 'axios'
import { analyzeImage } from './taggerApi'

// Mockeamos axios PRESERVANDO utilidades reales como `isAxiosError`, que la
// implementacion usa para distinguir un error del servidor (con `response`) de
// un error de red (sin `response`). Solo reemplazamos `post` por un mock
// controlable en cada test.
vi.mock('axios', async (importActual) => {
  const actual = await importActual<typeof import('axios')>()
  return {
    ...actual,
    default: { ...actual.default, post: vi.fn() },
  }
})

// Handle tipado al mock de `axios.post` para configurarlo por test.
const post = vi.mocked(axios.post)

// Construye un File valido en jsdom para simular la imagen subida por el usuario.
function createImageFile(name = 'foto.png', type = 'image/png'): File {
  return new File(['fake-image-bytes'], name, { type })
}

// Respuesta exitosa minima con la forma que devuelve el backend: { tags: [...] }.
function okResponse(
  tags: Array<{ label: string; confidence: number }>,
): AxiosResponse {
  return { data: { tags } } as AxiosResponse
}

// Simula el evento de progreso que axios pasa a `onUploadProgress`.
function progressEvent(
  loaded: number,
  total: number | undefined,
): AxiosProgressEvent {
  return { loaded, total, bytes: loaded, lengthComputable: total != null }
}

// Error con forma de AxiosError del backend (4xx/5xx): trae `response.data.error`
// y `isAxiosError: true` para que el `axios.isAxiosError` real lo reconozca.
function createServerError(message: string, code = 'BAD_REQUEST', status = 400) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: {
      status,
      data: { error: { message, code } },
    },
  })
}

// Error de red: sin `response` (fallo de conexion). El mensaje crudo de axios
// es "Network Error"; la implementacion debe traducirlo a algo amigable.
function createNetworkError() {
  return Object.assign(new Error('Network Error'), { isAxiosError: true })
}

describe('analyzeImage', () => {
  beforeEach(() => {
    // Limpia historial e implementacion del mock entre tests: los `vi.fn()`
    // acumulan estado si no se reinician y contaminan aserciones posteriores.
    post.mockReset()
  })

  it('envia el archivo como multipart a POST /api/analyze bajo el campo "image"', async () => {
    post.mockResolvedValueOnce(okResponse([]))
    const file = createImageFile()

    await analyzeImage(file)

    expect(post).toHaveBeenCalledTimes(1)
    const [url, body] = post.mock.calls[0]
    expect(url).toBe('/api/analyze')
    expect(body).toBeInstanceOf(FormData)

    const sent = (body as FormData).get('image')
    expect(sent).toBeInstanceOf(File)
    expect((sent as File).name).toBe(file.name)
    expect((sent as File).type).toBe(file.type)
  })

  it('resuelve con el arreglo de tags de la respuesta, mismos valores y mismo orden', async () => {
    const tags = [
      { label: 'Perro', confidence: 0.98 },
      { label: 'Parque', confidence: 0.91 },
    ]
    post.mockResolvedValueOnce(okResponse(tags))

    const result = await analyzeImage(createImageFile())

    expect(result).toEqual(tags)
  })

  it('traduce el progreso de subida a porcentaje entero y lo reporta de forma progresiva', async () => {
    post.mockImplementation(
      async (_url: string, _data: unknown, config) => {
        config?.onUploadProgress?.(progressEvent(25, 100))
        config?.onUploadProgress?.(progressEvent(100, 100))
        return okResponse([])
      },
    )
    const onUploadProgress = vi.fn()

    await analyzeImage(createImageFile(), { onUploadProgress })

    expect(onUploadProgress).toHaveBeenCalledTimes(2)
    expect(onUploadProgress).toHaveBeenNthCalledWith(1, 25)
    expect(onUploadProgress).toHaveBeenNthCalledWith(2, 100)
  })

  it('redondea el porcentaje de progreso a un entero (loaded 3 / total 4 -> 75)', async () => {
    post.mockImplementation(
      async (_url: string, _data: unknown, config) => {
        config?.onUploadProgress?.(progressEvent(3, 4))
        return okResponse([])
      },
    )
    const onUploadProgress = vi.fn()

    await analyzeImage(createImageFile(), { onUploadProgress })

    expect(onUploadProgress).toHaveBeenCalledWith(75)
  })

  it('no reporta progreso ni lanza cuando total es 0 o indefinido', async () => {
    post.mockImplementation(
      async (_url: string, _data: unknown, config) => {
        config?.onUploadProgress?.(progressEvent(10, 0))
        return okResponse([])
      },
    )
    const onUploadProgress = vi.fn()

    await expect(
      analyzeImage(createImageFile(), { onUploadProgress }),
    ).resolves.toBeDefined()
    expect(onUploadProgress).not.toHaveBeenCalled()
  })

  it('lanza un Error con el mensaje del backend ante una respuesta de error (4xx/5xx)', async () => {
    post.mockRejectedValueOnce(
      createServerError('El archivo es demasiado grande', 'FILE_TOO_LARGE', 413),
    )

    await expect(analyzeImage(createImageFile())).rejects.toThrow(
      'El archivo es demasiado grande',
    )
  })

  it('lanza un Error de conectividad amigable ante un error de red (sin response)', async () => {
    post.mockRejectedValueOnce(createNetworkError())

    // Capturamos el rechazo para inspeccionar el mensaje traducido al usuario.
    // Si `analyzeImage` resolviera (impl incorrecta), `error` seria el arreglo
    // de tags y `toBeInstanceOf(Error)` fallaria de forma clara.
    const error = await analyzeImage(createImageFile()).catch(
      (e: unknown) => e,
    )

    expect(error).toBeInstanceOf(Error)
    const message = (error as Error).message
    expect(message).not.toBe('')
    // No debe filtrar el mensaje crudo de axios al usuario.
    expect(message).not.toBe('Network Error')
    // Debe ser un mensaje amigable en espanol sobre la conexion/servidor/red.
    expect(message).toMatch(/conect|servidor|red/i)
  })
})
