import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Coverage policy lives in openspec/specs/test-coverage/spec.md:
// ≥80% lines and ≥80% branches at the bundle level.  Exclusions are
// listed explicitly with justifications so contributors know exactly
// what is and isn't measured.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 80,
        branches: 80,
      },
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // Entry points: trivial wiring, no logic.
        'src/main.tsx',
        'src/vite-env.d.ts',
        // Test infrastructure itself.
        'src/test/**',
        // Tests live alongside source; don't count them.
        'src/**/*.test.{ts,tsx}',
        // Type-only files contribute no executable code.
        'src/**/*.d.ts',
        // Vendored shadcn/ui primitives (copied via `npx shadcn add`).
        'src/components/ui/**',
        // cn() helper is a one-liner wrapper over tailwind-merge.
        'src/lib/utils.ts',
      ],
    },
  },
});
