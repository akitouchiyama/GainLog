import { fileURLToPath } from 'node:url'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const alias = { '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)) }

export default defineConfig({
  test: {
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/testing/**',
        'src/client/main.tsx',
        'src/api/index.ts',
      ],
    },
    projects: [
      {
        resolve: { alias },
        test: { name: 'shared', environment: 'node', include: ['src/shared/**/*.test.ts'] },
      },
      {
        resolve: { alias },
        plugins: [react()],
        test: {
          name: 'client',
          environment: 'jsdom',
          include: ['src/client/**/*.test.{ts,tsx}'],
          setupFiles: ['./src/client/testing/setup.ts'],
        },
      },
      {
        resolve: { alias },
        plugins: [
          cloudflareTest(async () => ({
            wrangler: { configPath: './wrangler.jsonc' },
            miniflare: { bindings: { TEST_MIGRATIONS: await readD1Migrations('migrations') } },
          })),
        ],
        test: {
          name: 'api',
          include: ['src/api/**/*.test.ts'],
          setupFiles: ['./src/api/testing/apply-migrations.ts'],
        },
      },
    ],
  },
})
