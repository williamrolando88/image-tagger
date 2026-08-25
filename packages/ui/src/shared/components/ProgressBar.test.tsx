import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProgressBar } from './ProgressBar'

// Contrato de props que consume el componente. Se declara localmente a proposito:
// el componente aun no existe (lo crea el implementador), asi que no importamos
// sus tipos; esta interfaz solo tipa las props que pasamos en los tests.
interface ProgressBarProps {
  value: number
  label?: string
}

function renderProgressBar(props: ProgressBarProps) {
  return render(<ProgressBar {...props} />)
}

describe('ProgressBar', () => {
  it('expone el rol accesible de progressbar', () => {
    // daisyUI usa <progress class="progress">, cuyo rol implicito es progressbar.
    renderProgressBar({ value: 42 })

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('muestra el porcentaje como entero con % cuando value es exacto', () => {
    renderProgressBar({ value: 42 })

    // Matcher de subcadena/regex: el porcentaje puede compartir nodo con otro texto.
    expect(screen.getByText(/42%/)).toBeInTheDocument()
  })

  it('redondea value al entero mas cercano al mostrar el porcentaje', () => {
    // 66.6 -> redondea a 67% (no trunca a 66%).
    renderProgressBar({ value: 66.6 })

    expect(screen.getByText(/67%/)).toBeInTheDocument()
    expect(screen.queryByText(/66%/)).not.toBeInTheDocument()
  })

  it('no renderiza label cuando no se provee', () => {
    renderProgressBar({ value: 10 })

    // Sin label solo se muestra el porcentaje; ningun texto de etiqueta extra.
    expect(screen.queryByText(/Subiendo/i)).not.toBeInTheDocument()
  })

  it('renderiza el label como texto cuando se provee', () => {
    renderProgressBar({ value: 10, label: 'Subiendo…' })

    expect(screen.getByText(/Subiendo/i)).toBeInTheDocument()
  })
})
