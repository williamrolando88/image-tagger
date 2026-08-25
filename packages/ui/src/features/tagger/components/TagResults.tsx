import type { Tag } from '../taggerTypes'

interface TagResultsProps {
  tags: Tag[]
}

/**
 * Lista de resultados del analisis: una etiqueta por fila con su nivel de
 * confianza como porcentaje entero redondeado. Si no hay tags, muestra un
 * mensaje de estado vacio en vez de la lista.
 */
export function TagResults({ tags }: TagResultsProps) {
  if (tags.length === 0) {
    return (
      <p className="text-base-content/70">No se encontraron etiquetas para esta imagen.</p>
    )
  }

  return (
    <div className="card bg-base-100 shadow-sm w-full max-w-md">
      <div className="card-body gap-3">
        <h2 className="card-title text-base">Etiquetas</h2>

        <ul className="flex flex-col gap-3">
          {tags.map((tag) => {
            const percentage = Math.round(tag.confidence * 100)

            return (
              <li key={tag.label} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{tag.label}</span>
                  <span className="badge badge-primary badge-sm shrink-0">{percentage}%</span>
                </div>
                <progress
                  className="progress progress-primary w-full"
                  value={percentage}
                  max={100}
                />
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
