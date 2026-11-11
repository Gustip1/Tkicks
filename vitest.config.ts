import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // El mismo alias que tsconfig ("@/lib/..."): sin esto los tests que importan
  // código de la app no encontraban los módulos
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  // JSX como lo compila Next (sin importar React en cada archivo)
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Los de Playwright corren aparte (npx playwright test)
    exclude: ['node_modules/**', 'tests/e2e/**', '.next/**'],
  },
});
