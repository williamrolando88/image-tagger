import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImageUploader } from './ImageUploader'

// Contrato de props que consume el componente. Se declara localmente a proposito:
// esta interfaz solo tipa las props que pasamos en los tests. Tras el refactor,
// el disparo del analisis (boton "Analizar"/onAnalyze) ya NO vive aqui: lo
// provee `AnalysisControls`. Este componente solo selecciona y previsualiza.
interface ImageUploaderProps {
  previewUrl: string | null
  disabled?: boolean
  acceptedTypes?: string[]
  maxSizeBytes?: number
  onFileSelected: (file: File) => void
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
    // Tras el refactor el boton "Analizar" ya NO vive en el uploader: ahora lo
    // provee AnalysisControls. Su ausencia forma parte del nuevo contrato.
    expect(
      screen.queryByRole('button', { name: /analizar/i }),
    ).not.toBeInTheDocument()
  })

  it('llama onFileSelected una sola vez con el File al subir una imagen valida', async () => {
    const user = userEvent.setup()
    const onFileSelected = vi.fn()
    const { getFileInput } = renderUploader({
      previewUrl: null,
      onFileSelected,
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
    })

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'blob:xyz')
    // alt no vacio: la imagen debe exponer un nombre accesible.
    expect(img).toHaveAccessibleName()
  })

  it('muestra el boton "Seleccionar imagen" habilitado cuando disabled es false', () => {
    // Nuevo contrato: disabled=false significa "seleccion permitida" -> el boton
    // de fallback se renderiza y esta habilitado.
    renderUploader({
      previewUrl: 'blob:xyz',
      disabled: false,
      onFileSelected: vi.fn(),
    })

    expect(
      screen.getByRole('button', { name: /seleccionar imagen/i }),
    ).toBeEnabled()
  })

  it('oculta el boton "Seleccionar imagen" y deshabilita el dropzone cuando disabled es true', () => {
    // Nuevo contrato (review CLI): disabled=true significa "seleccion NO
    // permitida". El boton de fallback ya NO se deshabilita: se OCULTA (no se
    // renderiza). El drag&drop, en cambio, se sigue deshabilitando.
    const { getFileInput } = renderUploader({
      previewUrl: 'blob:xyz',
      disabled: true,
      onFileSelected: vi.fn(),
    })

    // El boton NO esta en el DOM (oculto, no deshabilitado).
    expect(
      screen.queryByRole('button', { name: /seleccionar imagen/i }),
    ).toBeNull()

    // El dropzone queda deshabilitado. react-dropzone v20 NO agrega `disabled`
    // al <input>; la senal fiable es aria-disabled="true" en el root de
    // getRootProps (el div padre del input).
    const dropzone = getFileInput().parentElement as HTMLElement
    expect(dropzone).toHaveAttribute('aria-disabled', 'true')

    // La preview se muestra SIEMPRE que haya previewUrl, con independencia de
    // disabled: el ocultamiento afecta solo al boton, no a la imagen.
    expect(screen.getByRole('img')).toBeInTheDocument()
  })
})
