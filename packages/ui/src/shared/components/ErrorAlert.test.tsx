import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorAlert } from './ErrorAlert'

// Contrato de props que consume el componente. Se declara localmente a proposito:
// el componente aun no existe (lo crea el implementador), asi que no importamos
// sus tipos; esta interfaz solo tipa las props que pasamos en los tests.
interface ErrorAlertProps {
  message: string
  onRetry?: () => void
}

function renderErrorAlert(props: ErrorAlertProps) {
  return render(<ErrorAlert {...props} />)
}

describe('ErrorAlert', () => {
  it('expone role="alert" y muestra el message como texto', () => {
    renderErrorAlert({ message: 'Fallo la conexion con el servidor' })

    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    // El mensaje vive dentro del contenedor con role="alert".
    expect(alert).toHaveTextContent('Fallo la conexion con el servidor')
  })

  it('renderiza un boton de reintento cuando se provee onRetry', () => {
    renderErrorAlert({ message: 'Error temporal', onRetry: vi.fn() })

    expect(
      screen.getByRole('button', { name: /reintentar|intentar/i }),
    ).toBeInTheDocument()
  })

  it('llama onRetry una sola vez al hacer click en el boton de reintento', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderErrorAlert({ message: 'Error temporal', onRetry })

    await user.click(
      screen.getByRole('button', { name: /reintentar|intentar/i }),
    )

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('no renderiza boton de reintento cuando no se provee onRetry', () => {
    renderErrorAlert({ message: 'Error sin reintento' })

    // Sin onRetry no debe existir ningun boton en el alert.
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
