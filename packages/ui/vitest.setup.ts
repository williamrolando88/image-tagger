import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// RTL: desmonta el arbol renderizado tras cada test para aislar el DOM.
afterEach(() => {
  cleanup()
})

// jsdom no implementa algunas APIs del navegador que la UI usa (preview de la
// imagen via object URLs, y media queries para el tema). Se stubbean como
// `vi.fn()` para que los componentes puedan renderizarse en el entorno de
// test y los tests puedan espiar/controlar su comportamiento. Se stubbean
// siempre (sin el guard `typeof ... !== 'function'` previo): Node ya trae una
// implementacion nativa de `URL.createObjectURL` (para `Blob`), por lo que el
// guard nunca se activaba y dejaba la funcion real (no mockeable) en su
// lugar.
URL.createObjectURL = vi.fn(() => 'blob:mock-preview')
URL.revokeObjectURL = vi.fn()

if (typeof window.matchMedia !== 'function') {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}
