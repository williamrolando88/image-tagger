import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImageUploader } from './ImageUploader'

// Contrato de props que consume el componente. Se declara localmente a proposito:
// el componente aun no existe (lo crea el implementador), asi que no importamos
// sus tipos; esta interfaz solo tipa las props que pasamos en los tests.
interface ImageUploaderProps {
  previewUrl: string | null
  disabled?: boolean
  acceptedTypes?: string[]
  maxSizeBytes?: number
  onFileSelected: (file: File) => void
  onAnalyze: () => void
}

// Renderiza el componente y expone un getter perezoso del input oculto de
// react-dropzone (se localiza por selector porque no tiene rol/label estable).
function renderUploader(props: ImageUploaderProps) {
  const view = render(<ImageUploader {...props} />)
  const getFileInput = () =>
    view.container.querySelector('input[type="file"]') as HTMLInputElement
  return { ...view, getFileInput }
}

// Construye un File en jsdom para simular una subida del usuario.
function createFile(content: string, name: string, type: string): File {
  return new File([content], name, { type })
}

describe('ImageUploader', () => {
  it('renderiza el area de arrastre, el boton de fallback y un input de archivo cuando no hay preview', () => {
    const { getFileInput } = renderUploader({
      previewUrl: null,
      onFileSelected: vi.fn(),
      onAnalyze: vi.fn(),
    })

    // Texto instructivo de arrastrar/soltar (matcher flexible: define el copy el
    // implementador).
    expect(screen.getByText(/arrastr|suelta|soltar/i)).toBeInTheDocument()
    // Boton de fallback para abrir el selector de archivos.
    expect(
      screen.getByRole('button', { name: /seleccionar imagen/i }),
    ).toBeInTheDocument()
    // react-dropzone renderiza un <input type="file"> via getInputProps.
    expect(getFileInput()).toBeInTheDocument()
  })

  it('llama onFileSelected una sola vez con el File al subir una imagen valida', async () => {
    const user = userEvent.setup()
    const onFileSelected = vi.fn()
    const { getFileInput } = renderUploader({
      previewUrl: null,
      onFileSelected,
      onAnalyze: vi.fn(),
    })
    const file = createFile('bytes', 'foto.png', 'image/png')

    await user.upload(getFileInput(), file)

    // react-dropzone procesa los archivos de forma asincrona: esperamos el callback.
    await waitFor(() => expect(onFileSelected).toHaveBeenCalledTimes(1))
    const selectedFile = onFileSelected.mock.calls[0][0] as File
    expect(selectedFile).toBeInstanceOf(File)
    expect(selectedFile.name).toBe('foto.png')
    expect(selectedFile.type).toBe('image/png')
  })

  it('no llama onFileSelected y muestra un error de formato al subir un archivo no-imagen', async () => {
    // applyAccept: false para que el archivo no-imagen atraviese el filtro propio
    // de user-event (que respeta el atributo `accept` del input) y llegue a la
    // validacion de react-dropzone, unica responsable del rechazo por tipo.
    const user = userEvent.setup({ applyAccept: false })
    const onFileSelected = vi.fn()
    const { getFileInput } = renderUploader({
      previewUrl: null,
      onFileSelected,
      onAnalyze: vi.fn(),
    })
    const file = createFile('x', 'notas.txt', 'text/plain')

    await user.upload(getFileInput(), file)

    expect(
      await screen.findByText(/formato|jpg|png|webp|gif|no soportad/i),
    ).toBeInTheDocument()
    expect(onFileSelected).not.toHaveBeenCalled()
  })

  it('no llama onFileSelected y muestra un error de tamano al superar maxSizeBytes', async () => {
    const user = userEvent.setup()
    const onFileSelected = vi.fn()
    const { getFileInput } = renderUploader({
      previewUrl: null,
      maxSizeBytes: 10,
      onFileSelected,
      onAnalyze: vi.fn(),
    })
    // Imagen valida por tipo pero con mas de 10 bytes: el unico rechazo posible
    // es el de tamano (no el de formato).
    const file = createFile('contenido-mayor-a-diez-bytes', 'foto.png', 'image/png')
    expect(file.size).toBeGreaterThan(10)

    await user.upload(getFileInput(), file)

    expect(
      await screen.findByText(/tama|máx|max|mb|grande/i),
    ).toBeInTheDocument()
    expect(onFileSelected).not.toHaveBeenCalled()
  })

  it('muestra la imagen de preview con el src del previewUrl y un alt accesible', () => {
    renderUploader({
      previewUrl: 'blob:xyz',
      onFileSelected: vi.fn(),
      onAnalyze: vi.fn(),
    })

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'blob:xyz')
    // alt no vacio: la imagen debe exponer un nombre accesible.
    expect(img).toHaveAccessibleName()
  })

  it('deshabilita el boton "Analizar" cuando no hay preview', () => {
    renderUploader({
      previewUrl: null,
      onFileSelected: vi.fn(),
      onAnalyze: vi.fn(),
    })

    expect(screen.getByRole('button', { name: /analizar/i })).toBeDisabled()
  })

  it('habilita "Analizar" con preview y llama onAnalyze una sola vez al hacer click', async () => {
    const user = userEvent.setup()
    const onAnalyze = vi.fn()
    renderUploader({
      previewUrl: 'blob:xyz',
      onFileSelected: vi.fn(),
      onAnalyze,
    })

    const analyzeButton = screen.getByRole('button', { name: /analizar/i })
    expect(analyzeButton).toBeEnabled()

    await user.click(analyzeButton)

    expect(onAnalyze).toHaveBeenCalledTimes(1)
  })

  it('deshabilita "Analizar" y "Seleccionar imagen" cuando disabled es true', () => {
    renderUploader({
      previewUrl: 'blob:xyz',
      disabled: true,
      onFileSelected: vi.fn(),
      onAnalyze: vi.fn(),
    })

    expect(screen.getByRole('button', { name: /analizar/i })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /seleccionar imagen/i }),
    ).toBeDisabled()
  })
})
