import { useState } from 'react'
import type { Tag } from '../taggerTypes'
import { ProgressBar } from '../../../shared/components/ProgressBar'

interface TagResultsProps {
  tags: Tag[]
}

// El backend no limita la cantidad de tags devueltos; el frontend acota la
// vista inicial a este numero y ofrece un toggle para desplegar el resto.
const VISIBLE_LIMIT = 5

/**
 * Lista de resultados del analisis: una etiqueta por fila con su nivel de
 * confianza (0-1) mostrado como barra + porcentaje via el componente compartido
 * `ProgressBar`. Si no hay tags, muestra un mensaje de estado vacio. El
 * contenedor usa `aria-live` para que los lectores de pantalla anuncien los
 * resultados cuando el analisis termina. Cuando hay mas de `VISIBLE_LIMIT`
 * tags, se muestran solo los primeros y un boton permite desplegar/colapsar
 * el listado completo.
 */
export function TagResults({ tags }: TagResultsProps) {
  // Declarado antes del early-return del estado vacio para respetar las
  // reglas de hooks (orden estable entre renders).
  const [expanded, setExpanded] = useState(false)

  if (tags.length === 0) {
    return (
      <p aria-live="polite" className="text-base-content/70">
        No se encontraron etiquetas para esta imagen.
      </p>
    )
  }

  const hasMoreThanLimit = tags.length > VISIBLE_LIMIT
  const visibleTags = expanded ? tags : tags.slice(0, VISIBLE_LIMIT)

  return (
    <div aria-live="polite" className="card bg-base-100 shadow-sm w-full max-w-md">
      <div className="card-body gap-3">
        <h2 className="card-title text-base">Etiquetas</h2>

        <ul id="tag-results-list" className="flex flex-col gap-3">
          {visibleTags.map((tag, index) => (
            // Los labels pueden repetirse o venir vacios (fallback del adapter),
            // asi que se combina con el indice para una key estable y unica.
            <li key={`${tag.label}-${index}`} className="flex flex-col gap-1">
              <span className="truncate">{tag.label}</span>
              <ProgressBar value={tag.confidence * 100} />
            </li>
          ))}
        </ul>

        {hasMoreThanLimit && (
          <button
            type="button"
            className="btn btn-ghost btn-sm self-start"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            aria-controls="tag-results-list"
          >
            {expanded ? 'Mostrar menos' : 'Mostrar más'}
          </button>
        )}
      </div>
    </div>
  )
}
