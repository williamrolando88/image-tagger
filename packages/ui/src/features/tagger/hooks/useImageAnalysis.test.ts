import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { analyzeImage } from '../services/taggerApi'
import { useImageAnalysis } from './useImageAnalysis'

// Mockeamos el servicio de red: el hook orquesta el flujo de estados, no debe
// tocar la API real. Con el automock, `analyzeImage` queda como un `vi.fn()`
// que controlamos por test (progreso, resolucion y rechazo).
vi.mock('../services/taggerApi')

// Handle tipado al mock del servicio para configurarlo en cada test.
const mockAnalyze = vi.mocked(analyzeImage)

// `URL.createObjectURL`/`revokeObjectURL` ya vienen stubbeados como `vi.fn()`
// desde `vitest.setup.ts` (jsdom no los implementa). Los espiamos aqui para
// asegurar la creacion del preview y la revocacion de object URLs (sin fugas).
const createObjectURL = vi.mocked(URL.createObjectURL)
const revokeObjectURL = vi.mocked(URL.revokeObjectURL)

// Construye un File valido en jsdom para simular la imagen subida por el usuario.
function createImageFile(name = 'foto.png', type = 'image/png'): File {
  return new File(['fake-image-bytes'], name, { type })
}

describe('useImageAnalysis', () => {
  beforeEach(() => {
    // `mockReset` borra historial e implementacion del servicio para que cada
    // test parta de un mock limpio y defina su propio comportamiento.
    mockAnalyze.mockReset()
    // Solo limpiamos el historial de las utilidades de URL: conservan su
    // implementacion del setup (crear/revocar object URLs) entre tests.
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
  })

  it('inicia en estado idle con todos los campos vacios', () => {
    const { result } = renderHook(() => useImageAnalysis())

    expect(result.current.status).toBe('idle')
    expect(result.current.file).toBeNull()
    expect(result.current.previewUrl).toBeNull()
    expect(result.current.progress).toBe(0)
    expect(result.current.tags).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('selectFile guarda el archivo, crea el preview y pasa a fileSelected', () => {
    const { result } = renderHook(() => useImageAnalysis())
    const file = createImageFile()

    act(() => {
      result.current.selectFile(file)
    })

    // Se crea el object URL a partir del file y el preview es ese retorno.
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(createObjectURL).toHaveBeenCalledWith(file)
    expect(result.current.previewUrl).toBe(createObjectURL.mock.results[0].value)

    expect(result.current.file).toBe(file)
    expect(result.current.status).toBe('fileSelected')
    // Selección limpia cualquier resultado/estado previo de un flujo anterior.
    expect(result.current.progress).toBe(0)
    expect(result.current.tags).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('selectFile por segunda vez revoca el preview anterior (evita fugas)', () => {
    // Retornos distintos por llamada para distinguir el preview viejo del nuevo.
    createObjectURL
      .mockReturnValueOnce('blob:preview-1')
      .mockReturnValueOnce('blob:preview-2')

    const { result } = renderHook(() => useImageAnalysis())

    act(() => {
      result.current.selectFile(createImageFile('primera.png'))
    })
    expect(result.current.previewUrl).toBe('blob:preview-1')

    act(() => {
      result.current.selectFile(createImageFile('segunda.png'))
    })

    // Se libera el object URL anterior y queda vigente el nuevo.
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-1')
    expect(result.current.previewUrl).toBe('blob:preview-2')
  })

  it('analyze sin archivo seleccionado es no-op (no llama al servicio ni cambia el estado)', async () => {
    const { result } = renderHook(() => useImageAnalysis())

    await act(async () => {
      await result.current.analyze()
    })

    expect(mockAnalyze).not.toHaveBeenCalled()
    expect(result.current.status).toBe('idle')
  })

  it('analyze happy path transiciona uploading -> processing -> success', async () => {
    // Controlamos progreso y resolucion manualmente para observar cada estado.
    let captured: { onUploadProgress?: (percent: number) => void } | undefined
    let resolveAnalyze!: (
      tags: Array<{ label: string; confidence: number }>,
    ) => void
    mockAnalyze.mockImplementation((_file, options) => {
      captured = options
      return new Promise((resolve) => {
        resolveAnalyze = resolve
      })
    })

    const { result } = renderHook(() => useImageAnalysis())
    const file = createImageFile()
    act(() => {
      result.current.selectFile(file)
    })

    // Sin await: queremos inspeccionar el estado intermedio 'uploading'.
    act(() => {
      void result.current.analyze()
    })
    expect(result.current.status).toBe('uploading')
    expect(mockAnalyze).toHaveBeenCalledTimes(1)
    expect(mockAnalyze.mock.calls[0][0]).toBe(file)

    // Progreso parcial: sigue subiendo y refleja el porcentaje reportado.
    act(() => {
      captured!.onUploadProgress!(60)
    })
    expect(result.current.progress).toBe(60)
    expect(result.current.status).toBe('uploading')

    // Progreso 100: subida completa, esperando a la IA.
    act(() => {
      captured!.onUploadProgress!(100)
    })
    expect(result.current.progress).toBe(100)
    expect(result.current.status).toBe('processing')

    // La IA responde: exito con las etiquetas devueltas.
    const tags = [{ label: 'Perro', confidence: 0.9 }]
    await act(async () => {
      resolveAnalyze(tags)
    })
    expect(result.current.status).toBe('success')
    expect(result.current.tags).toEqual(tags)
  })

  it('analyze error deja status error con el mensaje y sin tags', async () => {
    // Rechazo diferido para controlar el momento del fallo.
    let rejectAnalyze!: (error: Error) => void
    mockAnalyze.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectAnalyze = reject
        }),
    )

    const { result } = renderHook(() => useImageAnalysis())
    act(() => {
      result.current.selectFile(createImageFile())
    })
    act(() => {
      void result.current.analyze()
    })
    expect(result.current.status).toBe('uploading')

    // Envolvemos el rechazo en act async para que React procese el update.
    await act(async () => {
      rejectAnalyze(new Error('No se pudo analizar la imagen'))
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('No se pudo analizar la imagen')
    expect(result.current.tags).toEqual([])
  })

  it('reset vuelve a idle, limpia el estado y revoca el preview vigente', async () => {
    mockAnalyze.mockResolvedValue([{ label: 'Gato', confidence: 0.8 }])

    const { result } = renderHook(() => useImageAnalysis())
    act(() => {
      result.current.selectFile(createImageFile())
    })
    // Preview vigente antes del reset: debe ser el que se revoque.
    const previewUrl = result.current.previewUrl

    await act(async () => {
      await result.current.analyze()
    })
    expect(result.current.status).toBe('success')

    act(() => {
      result.current.reset()
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.file).toBeNull()
    expect(result.current.previewUrl).toBeNull()
    expect(result.current.tags).toEqual([])
    expect(result.current.error).toBeNull()
    expect(result.current.progress).toBe(0)
    // Se libera el object URL que seguia vigente al momento del reset.
    expect(revokeObjectURL).toHaveBeenCalledWith(previewUrl)
  })
})
