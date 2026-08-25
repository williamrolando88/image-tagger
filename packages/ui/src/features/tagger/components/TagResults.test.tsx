import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { TagResults } from './TagResults'

// Contrato de props que consume el componente. Se declara localmente a proposito:
// el componente aun no existe (lo crea el implementador), asi que no importamos
// sus tipos. Se usa el shape literal de Tag (label + confidence normalizada 0-1)
// en vez de importar el tipo, para desacoplar el test del modulo de dominio.
interface TagResultsProps {
  tags: { label: string; confidence: number }[]
}

function renderResults(props: TagResultsProps) {
  return render(<TagResults {...props} />)
}

describe('TagResults', () => {
  it('muestra un mensaje de "sin resultados" y no renderiza items cuando tags esta vacio', () => {
    renderResults({ tags: [] })

    // Copy flexible del estado vacio: lo define el implementador.
    expect(
      screen.getByText(/no se encontraron|no hay|sin etiquetas/i),
    ).toBeInTheDocument()
    // Sin tags no debe existir ningun item de lista.
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })

  it('renderiza el label de cada tag como texto', () => {
    renderResults({
      tags: [
        { label: 'Perro', confidence: 0.98 },
        { label: 'Parque', confidence: 0.91 },
        { label: 'Cielo', confidence: 0.75 },
      ],
    })

    // Matcher de subcadena: el label puede compartir nodo con el porcentaje
    // (p. ej. "Perro 98%"), asi que no exigimos coincidencia exacta.
    expect(screen.getByText(/Perro/)).toBeInTheDocument()
    expect(screen.getByText(/Parque/)).toBeInTheDocument()
    expect(screen.getByText(/Cielo/)).toBeInTheDocument()
  })

  it('muestra confidence (0-1) como porcentaje entero redondeado con %', () => {
    renderResults({
      tags: [
        { label: 'Exacto', confidence: 0.98 }, // 98% sin redondeo
        { label: 'Abajo', confidence: 0.912 }, // 91.2 -> redondea a 91%
        { label: 'Arriba', confidence: 0.916 }, // 91.6 -> redondea a 92%
        { label: 'Medio', confidence: 0.5 }, // 50%
      ],
    })

    // Matcher de subcadena/regex: el porcentaje puede compartir nodo con el label.
    expect(screen.getByText(/98%/)).toBeInTheDocument()
    expect(screen.getByText(/91%/)).toBeInTheDocument()
    expect(screen.getByText(/92%/)).toBeInTheDocument()
    expect(screen.getByText(/50%/)).toBeInTheDocument()
  })

  it('renderiza un item por tag y preserva el orden de entrada', () => {
    renderResults({
      tags: [
        { label: 'Primero', confidence: 0.9 },
        { label: 'Segundo', confidence: 0.8 },
        { label: 'Tercero', confidence: 0.7 },
      ],
    })

    const items = screen.getAllByRole('listitem')
    // Un <li> por tag.
    expect(items).toHaveLength(3)
    // El orden del DOM refleja el orden del arreglo de entrada.
    expect(within(items[0]).getByText(/Primero/)).toBeInTheDocument()
    expect(within(items[1]).getByText(/Segundo/)).toBeInTheDocument()
    expect(within(items[2]).getByText(/Tercero/)).toBeInTheDocument()
  })
})
