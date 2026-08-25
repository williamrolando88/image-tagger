import { defineConfig } from 'vitest/config';

// Configuración de Vitest para el backend. Los tests viven colocados junto a su
// código (`src/**/*.test.ts`), no en una carpeta separada.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Fija variables de entorno dummy antes de importar la app (ver vitest.setup.ts).
    setupFiles: ['./vitest.setup.ts'],
    // Evita que la suite falle cuando aún no existen tests en un paquete.
    passWithNoTests: true,
  },
});
