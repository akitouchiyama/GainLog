import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/api/infrastructure/db/schema.ts',
  out: './migrations',
})
