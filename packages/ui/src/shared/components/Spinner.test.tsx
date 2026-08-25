import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Spinner } from './Spinner'

// Contrato de props que consume el componente. Se declara localmente a proposito:
// el componente aun no existe (lo crea el implementador), asi que no importamos
// sus tipos; esta interfaz solo tipa las props que pasamos en los tests.
interface SpinnerProps {
  label?: string
}

function renderSpinner(props: SpinnerProps = {}) {
  return render(<Spinner {...props} />)
}

describe('Spinner', () => {
  it('expone role="status" para anunciar el estado de carga', () => {
    renderSpinner()

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('sigue exponiendo role="status" cuando se provee label', () => {
    renderSpinner({ label: 'Procesando…' })

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('muestra el label como texto cuando se provee', () => {
    renderSpinner({ label: 'Procesando…' })

    // Matcher de subcadena/regex: el copy exacto lo define el implementador.
    expect(screen.getByText(/Procesando/i)).toBeInTheDocument()
  })
})
