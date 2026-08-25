import type { Tag } from '../taggerTypes'
import { ProgressBar } from '../../../shared/components/ProgressBar'

interface TagResultsProps {
  tags: Tag[]
}

/**
 * Lista de resultados del analisis: una etiqueta por fila con su nivel de
 * confianza (0-1) mostrado como barra + porcentaje via el componente compartido
 * `ProgressBar`. Si no hay tags, muestra un mensaje de estado vacio. El
 * contenedor usa `aria-live` para que los lectores de pantalla anuncien los
 * resultados cuando el analisis termina.
 */
export function TagResults({ tags }: TagResultsProps) {
  if (tags.length === 0) {
    return (
      <p aria-live="polite" className="text-base-content/70">
        No se encontraron etiquetas para esta imagen.
      </p>
    )
  }

  return (
    <div aria-live="polite" className="card bg-base-100 shadow-sm w-full max-w-md">
      <div className="card-body gap-3">
        <h2 className="card-title text-base">Etiquetas</h2>

        <ul className="flex flex-col gap-3">
          {tags.map((tag, index) => (
            // Los labels pueden repetirse o venir vacios (fallback del adapter),
            // asi que se combina con el indice para una key estable y unica.
            <li key={`${tag.label}-${index}`} className="flex flex-col gap-1">
              <span className="truncate">{tag.label}</span>
              <ProgressBar value={tag.confidence * 100} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
