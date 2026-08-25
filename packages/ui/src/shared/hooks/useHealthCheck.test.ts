import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import axios from 'axios'
import type { AxiosResponse } from 'axios'
import { useHealthCheck } from './useHealthCheck'

// Mockeamos axios PRESERVANDO utilidades reales (mismo patron que
// taggerApi.test.ts): solo reemplazamos `get` por un mock controlable en cada
// test. El hook consulta el health del backend con `axios.get('/api/health')`.
vi.mock('axios', async (importActual) => {
  const actual = await importActual<typeof import('axios')>()
  return {
    ...actual,
    default: { ...actual.default, get: vi.fn() },
  }
})

// Handle tipado al mock de `axios.get` para configurarlo por test.
const get = vi.mocked(axios.get)

// Respuesta minima con la forma que devuelve GET /api/health: { status }.
function healthResponse(status: string): AxiosResponse {
  return { data: { status } } as AxiosResponse
}

describe('useHealthCheck', () => {
  beforeEach(() => {
    // Limpia historial e implementacion del mock entre tests: los `vi.fn()`
    // acumulan estado si no se reinician y contaminan aserciones posteriores.
    get.mockReset()
  })

  it("inicia en estado 'loading' antes de que resuelva la peticion", () => {
    // La promesa nunca resuelve: capturamos el estado inicial sincrono, antes
    // de cualquier transicion, para verificar que arranca en 'loading'.
    get.mockReturnValueOnce(new Promise(() => {}))

    const { result } = renderHook(() => useHealthCheck())

    expect(result.current.status).toBe('loading')
  })

  it("consulta GET '/api/health' al montar", async () => {
    get.mockResolvedValueOnce(healthResponse('ok'))

    renderHook(() => useHealthCheck())

    await waitFor(() => {
      expect(get).toHaveBeenCalledTimes(1)
      expect(get).toHaveBeenCalledWith('/api/health')
    })
  })

  it("pasa a 'connected' cuando el backend responde status 'ok'", async () => {
    get.mockResolvedValueOnce(healthResponse('ok'))

    const { result } = renderHook(() => useHealthCheck())

    await waitFor(() => {
      expect(result.current.status).toBe('connected')
    })
  })

  it("pasa a 'disconnected' cuando el status no es 'ok' (ej. 'degraded')", async () => {
    get.mockResolvedValueOnce(healthResponse('degraded'))

    const { result } = renderHook(() => useHealthCheck())

    await waitFor(() => {
      expect(result.current.status).toBe('disconnected')
    })
  })

  it("pasa a 'disconnected' cuando axios.get rechaza (error de red)", async () => {
    get.mockRejectedValueOnce(new Error('Network Error'))

    const { result } = renderHook(() => useHealthCheck())

    await waitFor(() => {
      expect(result.current.status).toBe('disconnected')
    })
  })
})
