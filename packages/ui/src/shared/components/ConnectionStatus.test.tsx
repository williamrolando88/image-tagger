import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConnectionStatus } from './ConnectionStatus'

// Contrato de props que consume el componente. Se declara localmente a proposito:
// el componente aun no existe (lo crea el implementador), asi que no importamos
// sus tipos; esta interfaz solo tipa las props que pasamos en los tests.
interface ConnectionStatusProps {
  status: 'loading' | 'connected' | 'disconnected'
}

// CONTRATO de textos legibles por estado (match EXACTO en las aserciones). El
// implementador DEBE renderizar exactamente estos strings, cada uno en su
// propio elemento, para evitar ambiguedad de subcadena ("Desconectado"
// contiene "conectado"). "Conectando…" usa la elipsis U+2026 (…), no tres
// puntos, consistente con el copy existente en App.tsx.
const STATUS_LABEL: Record<ConnectionStatusProps['status'], string> = {
  loading: 'Conectando…',
  connected: 'Conectado',
  disconnected: 'Desconectado',
}

function renderConnectionStatus(props: ConnectionStatusProps) {
  return render(<ConnectionStatus {...props} />)
}

describe('ConnectionStatus', () => {
  it('muestra la leyenda "Estado:"', () => {
    renderConnectionStatus({ status: 'connected' })

    // La leyenda es fija e independiente del estado recibido.
    expect(screen.getByText(/estado/i)).toBeInTheDocument()
  })

  it("con status='loading' expone role=status con data-status='loading' y texto 'Conectando…'", () => {
    renderConnectionStatus({ status: 'loading' })

    // `data-status` desambigua el estado sin depender del texto renderizado.
    const container = screen.getByRole('status')
    expect(container).toHaveAttribute('data-status', 'loading')
    // Match EXACTO del texto legible (contrato STATUS_LABEL).
    expect(screen.getByText(STATUS_LABEL.loading)).toBeInTheDocument()
  })

  it("con status='connected' expone data-status='connected' y texto 'Conectado'", () => {
    renderConnectionStatus({ status: 'connected' })

    const container = screen.getByRole('status')
    expect(container).toHaveAttribute('data-status', 'connected')
    expect(screen.getByText(STATUS_LABEL.connected)).toBeInTheDocument()
  })

  it("con status='disconnected' expone data-status='disconnected' y texto 'Desconectado'", () => {
    renderConnectionStatus({ status: 'disconnected' })

    const container = screen.getByRole('status')
    expect(container).toHaveAttribute('data-status', 'disconnected')
    // Match EXACTO: distingue 'Desconectado' de la subcadena 'Conectado'.
    expect(screen.getByText(STATUS_LABEL.disconnected)).toBeInTheDocument()
  })
})
