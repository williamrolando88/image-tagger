import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// RTL: desmonta el arbol renderizado tras cada test para aislar el DOM.
afterEach(() => {
  cleanup()
})

// jsdom no implementa algunas APIs del navegador que la UI usa (preview de la
// imagen via object URLs, y media queries para el tema). Se stubbean para que
// los componentes puedan renderizarse en el entorno de test.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = vi.fn(() => 'blob:mock-preview')
  URL.revokeObjectURL = vi.fn()
}

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
