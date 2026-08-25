import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnalysisControls } from './AnalysisControls'

// Contrato de props que consume el componente. Se declara localmente a proposito:
// el componente aun no existe (lo crea el implementador), asi que no importamos
// sus tipos; esta interfaz solo tipa las props que pasamos en los tests.
interface AnalysisControlsProps {
  status: 'idle' | 'fileSelected' | 'uploading' | 'processing' | 'success' | 'error'
  progress: number
  error: string | null
  onAnalyze: () => void
  onReset: () => void
}

// Renderiza el componente con props por defecto y permite sobreescribir solo lo
// relevante por caso. Devuelve las props (incluidos los mocks) para poder
// asertar las interacciones sin recrearlos en cada test.
function renderControls(overrides: Partial<AnalysisControlsProps> = {}) {
  const props: AnalysisControlsProps = {
    status: 'idle',
    progress: 0,
    error: null,
    onAnalyze: vi.fn(),
    onReset: vi.fn(),
    ...overrides,
  }

  render(<AnalysisControls {...props} />)
  return props
}

describe('AnalysisControls', () => {
  it('no renderiza ningun control cuando status es "idle"', () => {
    renderControls({ status: 'idle' })

    // idle = aun no hay archivo seleccionado: no hay accion posible todavia.
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('muestra "Analizar" habilitado en "fileSelected" y llama onAnalyze una sola vez al hacer click', async () => {
    const user = userEvent.setup()
    const { onAnalyze } = renderControls({ status: 'fileSelected' })

    const analyzeButton = screen.getByRole('button', { name: /analizar/i })
    expect(analyzeButton).toBeEnabled()

    await user.click(analyzeButton)

    expect(onAnalyze).toHaveBeenCalledTimes(1)
    // Con el archivo listo (aun sin disparar) no hay progreso ni spinner.
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('muestra la barra de progreso con el porcentaje y oculta "Analizar" en "uploading"', () => {
    renderControls({ status: 'uploading', progress: 40 })

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    // El progreso se refleja como texto (ProgressBar redondea y agrega "%").
    expect(screen.getByText(/40\s*%/)).toBeInTheDocument()
    // Durante la subida no se puede volver a disparar el analisis.
    expect(
      screen.queryByRole('button', { name: /analizar/i }),
    ).not.toBeInTheDocument()
  })

  it('muestra el spinner de "procesando" y oculta "Analizar" en "processing"', () => {
    renderControls({ status: 'processing' })

    const status = screen.getByRole('status')
    expect(status).toBeInTheDocument()
    expect(within(status).getByText(/procesando/i)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /analizar/i }),
    ).not.toBeInTheDocument()
  })

  it('muestra un boton para reiniciar en "success" y llama onReset una sola vez al hacer click', async () => {
    const user = userEvent.setup()
    const { onReset, onAnalyze } = renderControls({ status: 'success' })

    // El copy exacto lo define el implementador; el matcher acepta las variantes
    // esperadas para reiniciar el flujo (analizar otra imagen).
    const resetButton = screen.getByRole('button', {
      name: /otra imagen|analizar otra|empezar|reiniciar/i,
    })

    await user.click(resetButton)

    expect(onReset).toHaveBeenCalledTimes(1)
    // El boton de reinicio NO dispara el analisis.
    expect(onAnalyze).not.toHaveBeenCalled()
    // En exito no hay indicadores de carga.
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('muestra la alerta de error con el mensaje y un boton "Reintentar" que llama onAnalyze en "error"', async () => {
    const user = userEvent.setup()
    const errorMessage = 'No se pudo conectar con el servidor.'
    const { onAnalyze } = renderControls({ status: 'error', error: errorMessage })

    const alert = screen.getByRole('alert')
    expect(within(alert).getByText(/no se pudo conectar con el servidor/i)).toBeInTheDocument()

    const retryButton = within(alert).getByRole('button', { name: /reintentar/i })
    await user.click(retryButton)

    // Reintentar re-ejecuta el analisis (mismo archivo ya seleccionado en el hook).
    expect(onAnalyze).toHaveBeenCalledTimes(1)
  })
})
