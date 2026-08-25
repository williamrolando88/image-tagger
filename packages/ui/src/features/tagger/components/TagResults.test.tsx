import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagResults } from './TagResults'

// Contrato de props que consume el componente. Se declara localmente a proposito:
// el componente aun no existe (lo crea el implementador), asi que no importamos
// sus tipos. Se usa el shape literal de Tag (label + confidence normalizada 0-1)
// en vez de importar el tipo, para desacoplar el test del modulo de dominio.
interface TagResultsProps {
  tags: { label: string; confidence: number }[]
}

// Limite de tags visibles antes de requerir "Mostrar mas". Es una constante de
// IMPLEMENTACION: el test la asume = 5 (el implementador debe usar el mismo
// valor). Si cambia en produccion, estos casos deben actualizarse en conjunto.
const VISIBLE_LIMIT = 5

// Contrato de copy de los controles de paginacion (regex flexible para que el
// implementador elija el texto exacto). El contrato fijado aqui es:
//   - Expandir:  "Mostrar mas"   (acepta variante "Ver mas")
//   - Colapsar:  "Mostrar menos" (acepta variante "Ver menos")
const SHOW_MORE = /mostrar m[aá]s|ver m[aá]s/i
const SHOW_LESS = /mostrar menos|ver menos/i

function renderResults(props: TagResultsProps) {
  return render(<TagResults {...props} />)
}

// Crea `count` tags con labels distintos ("Tag 1".."Tag N") y confidences
// unicas y decrecientes, para poder contar y ubicar items sin ambiguedad y
// verificar el orden preservado. Los labels no colisionan por subcadena en los
// tamanos usados aqui (<= 7, nunca aparece "Tag 10"+).
function makeTags(count: number): TagResultsProps['tags'] {
  return Array.from({ length: count }, (_, index) => ({
    label: `Tag ${index + 1}`,
    confidence: (90 - index) / 100,
  }))
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
    // Un <li> por tag (<= limite, se muestran todos).
    expect(items).toHaveLength(3)
    // El orden del DOM refleja el orden del arreglo de entrada.
    expect(within(items[0]).getByText(/Primero/)).toBeInTheDocument()
    expect(within(items[1]).getByText(/Segundo/)).toBeInTheDocument()
    expect(within(items[2]).getByText(/Tercero/)).toBeInTheDocument()
  })

  describe('paginacion (limite = 5)', () => {
    it('con <= 5 tags muestra todos y NO renderiza el boton "Mostrar mas"', () => {
      // 3 tags: por debajo del limite.
      renderResults({ tags: makeTags(3) })

      expect(screen.getAllByRole('listitem')).toHaveLength(3)
      // Sin exceso de tags no debe existir control de expandir.
      expect(
        screen.queryByRole('button', { name: SHOW_MORE }),
      ).toBeNull()
    })

    it('con > 5 tags muestra exactamente 5 items y el boton "Mostrar mas"', () => {
      // 7 tags: por encima del limite.
      renderResults({ tags: makeTags(7) })

      // Colapsado por defecto: solo los primeros `VISIBLE_LIMIT`.
      expect(screen.getAllByRole('listitem')).toHaveLength(VISIBLE_LIMIT)
      // Aparece el control para desplegar el resto.
      expect(
        screen.getByRole('button', { name: SHOW_MORE }),
      ).toBeInTheDocument()
    })

    it('con > 5 tags los primeros 5 mostrados son los primeros del arreglo (orden preservado)', () => {
      renderResults({ tags: makeTags(7) })

      const items = screen.getAllByRole('listitem')
      expect(items).toHaveLength(VISIBLE_LIMIT)
      // Se muestran "Tag 1".."Tag 5" en orden; "Tag 6"/"Tag 7" quedan ocultos.
      expect(within(items[0]).getByText(/Tag 1/)).toBeInTheDocument()
      expect(within(items[1]).getByText(/Tag 2/)).toBeInTheDocument()
      expect(within(items[2]).getByText(/Tag 3/)).toBeInTheDocument()
      expect(within(items[3]).getByText(/Tag 4/)).toBeInTheDocument()
      expect(within(items[4]).getByText(/Tag 5/)).toBeInTheDocument()
      // Los tags fuera del limite no estan en el DOM mientras esta colapsado.
      expect(screen.queryByText(/Tag 6/)).toBeNull()
      expect(screen.queryByText(/Tag 7/)).toBeNull()
    })

    it('al hacer click en "Mostrar mas" despliega el listado completo (7 items)', async () => {
      const user = userEvent.setup()
      renderResults({ tags: makeTags(7) })

      await user.click(screen.getByRole('button', { name: SHOW_MORE }))

      // Expandido: se muestran todos los tags.
      expect(screen.getAllByRole('listitem')).toHaveLength(7)
      // Los tags antes ocultos ahora son visibles.
      expect(screen.getByText(/Tag 6/)).toBeInTheDocument()
      expect(screen.getByText(/Tag 7/)).toBeInTheDocument()
    })

    it('tras expandir, "Mostrar menos" colapsa de nuevo a 5 items', async () => {
      const user = userEvent.setup()
      renderResults({ tags: makeTags(7) })

      // Expandir.
      await user.click(screen.getByRole('button', { name: SHOW_MORE }))
      expect(screen.getAllByRole('listitem')).toHaveLength(7)

      // El toggle ahora ofrece colapsar.
      const collapse = screen.getByRole('button', { name: SHOW_LESS })
      await user.click(collapse)

      // Colapsado: vuelve al limite de items visibles.
      expect(screen.getAllByRole('listitem')).toHaveLength(VISIBLE_LIMIT)
      // Y reaparece el control de expandir.
      expect(
        screen.getByRole('button', { name: SHOW_MORE }),
      ).toBeInTheDocument()
    })
  })
})
