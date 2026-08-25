import { useHealthCheck } from './shared/hooks/useHealthCheck'
import { ConnectionStatus } from './shared/components/ConnectionStatus'
import { TaggerPage } from './features/tagger/TaggerPage'

/**
 * Layout raiz de la aplicacion: un header (navbar de daisyUI) con la marca
 * del proyecto y el indicador de conexion con el backend, y el contenido
 * principal (TaggerPage) dentro de <main>. El estado de salud del backend se
 * obtiene aqui via `useHealthCheck` y se pasa como prop al indicador
 * presentacional `ConnectionStatus`.
 */
function App() {
  const { status } = useHealthCheck()

  return (
    <div className="flex min-h-screen flex-col bg-base-200">
      <header className="navbar bg-base-100 px-4 shadow-sm">
        <div className="flex-1">
          <span className="text-lg font-bold">Picture Tagger</span>
        </div>
        <div className="flex-none">
          <ConnectionStatus status={status} />
        </div>
      </header>

      <main className="flex flex-1 justify-center">
        <TaggerPage />
      </main>
    </div>
  )
}

export default App
