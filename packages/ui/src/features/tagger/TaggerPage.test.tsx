import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { analyzeImage } from './services/taggerApi'
import { TaggerPage } from './TaggerPage'

// Test de INTEGRACION del feature tagger: montamos la pagina real, que compone
// el hook `useImageAnalysis` con los componentes reales (ImageUploader,
// ProgressBar, Spinner, TagResults, ErrorAlert). Mockeamos SOLO la capa de red
// (`./services/taggerApi`) para controlar progreso, exito y error sin tocar la
// API. El hook importa el mismo modulo (`../services/taggerApi`), que resuelve
// al mismo archivo, asi que el automock aplica en toda la cadena.
vi.mock('./services/taggerApi')

// Handle tipado al mock del servicio para configurarlo en cada test.
const analyze = vi.mocked(analyzeImage)

// Etiquetas de ejemplo devueltas por el "servicio de IA" en el flujo feliz.
const SAMPLE_TAGS = [{ label: 'Perro', confidence: 0.98 }]

// Selecciona una imagen valida a traves del input oculto de react-dropzone
// (mismo patron que ImageUploader.test.tsx) y espera a que el preview habilite
// el boton "Analizar". Devuelve el File subido para poder asertar identidad.
async function selectValidImage(
  user: ReturnType<typeof userEvent.setup>,
  container: HTMLElement,
): Promise<File> {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File(['x'], 'foto.png', { type: 'image/png' })

  await user.upload(input, file)

  // react-dropzone procesa los archivos de forma asincrona: el boton se
  // habilita cuando el hook ya tiene el preview del archivo seleccionado.
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /analizar/i })).toBeEnabled(),
  )

  return file
}

describe('TaggerPage (integracion)', () => {
  beforeEach(() => {
    // Cada test parte de un mock limpio y define su propio comportamiento.
    analyze.mockReset()
  })

  it('flujo feliz: uploading -> processing -> success muestra los tags', async () => {
    const user = userEvent.setup()

    // Controlamos progreso y resolucion manualmente para observar cada estado
    // intermedio (patron de useImageAnalysis.test.ts): capturamos las opciones
    // (para disparar onUploadProgress) y diferimos la resolucion.
    let captured: { onUploadProgress?: (percent: number) => void } | undefined
    let resolveAnalyze!: (
      tags: Array<{ label: string; confidence: number }>,
    ) => void
    analyze.mockImplementation((_file, options) => {
      captured = options
      return new Promise<Array<{ label: string; confidence: number }>>(
        (resolve) => {
          resolveAnalyze = resolve
        },
      )
    })

    const { container } = render(<TaggerPage />)

    await selectValidImage(user, container)

    // Dispara el analisis: entra en 'uploading'. No hacemos await del efecto
    // interno porque la promesa esta diferida (queremos ver el estado en vuelo).
    await user.click(screen.getByRole('button', { name: /analizar/i }))

    // uploading -> barra de progreso visible y el boton de seleccion OCULTO.
    // Guardamos la referencia a la barra de carga para comprobar despues que
    // desaparece (TagResults tiene sus propias <progress>, asi que no sirve
    // queryByRole('progressbar') para ese chequeo).
    const loadingBar = screen.getByRole('progressbar')
    expect(loadingBar).toBeInTheDocument()
    // Nuevo contrato: en uploading la seleccion NO esta permitida, asi que el
    // boton "Seleccionar imagen" no se renderiza (se oculta, no se deshabilita).
    expect(
      screen.queryByRole('button', { name: /seleccionar imagen/i }),
    ).toBeNull()

    // El servicio recibio el File subido por el usuario.
    expect(analyze).toHaveBeenCalledTimes(1)
    const sentFile = analyze.mock.calls[0][0]
    expect(sentFile).toBeInstanceOf(File)
    expect(sentFile.name).toBe('foto.png')

    // Progreso parcial (50%): sigue en 'uploading' y refleja el porcentaje.
    act(() => {
      captured!.onUploadProgress!(50)
    })
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.getByText(/50\s*%/)).toBeInTheDocument()

    // Progreso completo (100%): subida terminada, esperando a la IA -> spinner.
    act(() => {
      captured!.onUploadProgress!(100)
    })
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText(/procesando/i)).toBeInTheDocument()

    // La IA responde con exito: se muestran las etiquetas (TagResults).
    await act(async () => {
      resolveAnalyze(SAMPLE_TAGS)
    })

    expect(await screen.findByText('Perro')).toBeInTheDocument()
    expect(screen.getByText('98%')).toBeInTheDocument()

    // Ya no queda rastro del indicador de carga: ni la barra de progreso de la
    // subida ni el spinner de procesamiento.
    expect(loadingBar).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    // En success la seleccion tampoco esta permitida: el boton "Seleccionar
    // imagen" permanece oculto y para elegir otra imagen aparece el reset.
    expect(
      screen.queryByRole('button', { name: /seleccionar imagen/i }),
    ).toBeNull()
    expect(
      screen.getByRole('button', { name: /analizar otra imagen/i }),
    ).toBeInTheDocument()
  })

  it('ruta de error: muestra ErrorAlert con el mensaje y boton Reintentar', async () => {
    const user = userEvent.setup()
    // El servicio falla: el hook debe pasar a 'error' con el mensaje.
    analyze.mockRejectedValue(new Error('No se pudo conectar con el servidor.'))

    const { container } = render(<TaggerPage />)
    await selectValidImage(user, container)

    await user.click(screen.getByRole('button', { name: /analizar/i }))

    // Aparece la alerta de error con el mensaje del servicio y el reintento.
    const alert = await screen.findByRole('alert')
    expect(
      within(alert).getByText(/no se pudo conectar con el servidor/i),
    ).toBeInTheDocument()
    expect(
      within(alert).getByRole('button', { name: /reintentar/i }),
    ).toBeInTheDocument()
  })

  it('reintentar re-ejecuta el analisis', async () => {
    const user = userEvent.setup()
    analyze.mockRejectedValue(new Error('No se pudo conectar con el servidor.'))

    const { container } = render(<TaggerPage />)
    await selectValidImage(user, container)

    await user.click(screen.getByRole('button', { name: /analizar/i }))

    const alert = await screen.findByRole('alert')
    expect(analyze).toHaveBeenCalledTimes(1)

    // Click en "Reintentar" vuelve a invocar el analisis (el archivo sigue
    // seleccionado en el hook, asi que analyze() no es no-op).
    await user.click(within(alert).getByRole('button', { name: /reintentar/i }))

    await waitFor(() => expect(analyze).toHaveBeenCalledTimes(2))
  })

  // Nuevo contrato (review CLI): la seleccion de imagen (boton "Seleccionar
  // imagen" Y el drag&drop) esta permitida en 'idle' Y 'fileSelected' (imagen
  // elegida pero aun sin analizar -> poder cambiarla). En 'uploading',
  // 'processing', 'success' y 'error' NO esta permitida: el boton se OCULTA y el
  // drag&drop se deshabilita. El flujo feliz de arriba ya cubre 'uploading' y
  // 'success'; aqui cubrimos 'idle' y 'fileSelected'.
  describe('seleccion permitida en idle y fileSelected', () => {
    it('estado inicial (idle): el boton "Seleccionar imagen" esta presente y habilitado', () => {
      // Al montar la pagina sin seleccionar nada, status = 'idle': la seleccion
      // esta permitida.
      render(<TaggerPage />)

      expect(
        screen.getByRole('button', { name: /seleccionar imagen/i }),
      ).toBeEnabled()
    })

    it('tras seleccionar imagen (fileSelected): el boton "Seleccionar imagen" sigue presente y habilitado', async () => {
      const user = userEvent.setup()
      const { container } = render(<TaggerPage />)

      // Solo seleccionamos el archivo (no disparamos el analisis): status pasa a
      // 'fileSelected'. No hace falta configurar el mock de analyze para esto.
      await selectValidImage(user, container)

      // Nuevo contrato: en 'fileSelected' se puede elegir otra imagen, asi que el
      // boton sigue presente y habilitado (invierte la asercion de R3).
      expect(
        screen.getByRole('button', { name: /seleccionar imagen/i }),
      ).toBeEnabled()
    })

    it('tras seleccionar imagen (fileSelected): el drag&drop sigue activo (no deshabilitado)', async () => {
      const user = userEvent.setup()
      const { container } = render(<TaggerPage />)

      await selectValidImage(user, container)

      // NOTA (react-dropzone v20.1.1): la libreria solo agrega
      // `aria-disabled="true"` al root de getRootProps cuando el dropzone esta
      // deshabilitado; cuando esta activo NO agrega el atributo. La senal fiable
      // de que el drag&drop sigue activo en 'fileSelected' es la AUSENCIA de
      // aria-disabled="true" en el root (el div padre del input).
      const dropzone = container.querySelector<HTMLElement>('input[type="file"]')
        ?.parentElement as HTMLElement

      expect(dropzone).not.toHaveAttribute('aria-disabled', 'true')
    })
  })
})
