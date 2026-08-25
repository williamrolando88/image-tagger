import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import axios from 'axios'
import App from './App'

// Mockeamos axios PRESERVANDO utilidades reales (mismo patron que
// taggerApi.test.ts): solo reemplazamos `get`, que es lo unico que consume
// `useHealthCheck` al montar (GET /api/health). Asi controlamos la respuesta
// del backend sin tocar la red ni el resto de la API de axios.
vi.mock('axios', async (importActual) => {
  const actual = await importActual<typeof import('axios')>()
  return {
    ...actual,
    default: { ...actual.default, get: vi.fn() },
  }
})

// Handle tipado al mock de `axios.get` para configurarlo por test.
const get = vi.mocked(axios.get)

describe('App (integracion ligera)', () => {
  beforeEach(() => {
    // Cada test parte de un mock limpio. Por defecto el backend responde sano
    // ({ status: 'ok' }); los tests que necesiten otro escenario lo redefinen.
    get.mockReset()
    get.mockResolvedValue({ data: { status: 'ok' } })
  })

  it('muestra el indicador de estado del backend en el header', async () => {
    render(<App />)

    // La leyenda "Estado:" pertenece a <ConnectionStatus> y se renderiza de
    // inmediato (es texto estatico, independiente del estado del health check).
    expect(screen.getByText(/estado/i)).toBeInTheDocument()

    // Tras resolver GET /api/health con { status: 'ok' }, el indicador pasa a
    // "Conectado".
    expect(await screen.findByText('Conectado')).toBeInTheDocument()
  })

  it('monta la pagina del analizador (TaggerPage)', async () => {
    render(<App />)

    // TaggerPage compone el uploader, que siempre renderiza el boton
    // "Analizar" (deshabilitado hasta seleccionar imagen). findByRole ademas
    // deja asentar la actualizacion async del health check (evita warnings de
    // act) sin acoplar este caso a un estado de conexion concreto.
    expect(
      await screen.findByRole('button', { name: /analizar/i }),
    ).toBeInTheDocument()

    // Opcional: el encabezado de la pagina del analizador.
    expect(
      screen.getByRole('heading', { name: /analizador de imágenes/i }),
    ).toBeInTheDocument()
  })

  it('muestra "Desconectado" cuando el health check falla', async () => {
    // El backend no responde: GET /api/health rechaza. `useHealthCheck` debe
    // caer a 'disconnected'.
    get.mockRejectedValue(new Error('Network Error'))

    render(<App />)

    expect(await screen.findByText('Desconectado')).toBeInTheDocument()
  })
})
