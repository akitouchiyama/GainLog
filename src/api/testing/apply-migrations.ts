import { applyD1Migrations, type D1Migration } from 'cloudflare:test'
import { env } from 'cloudflare:workers'

const e = env as Cloudflare.Env & { TEST_MIGRATIONS: D1Migration[] }
await applyD1Migrations(e.DB, e.TEST_MIGRATIONS)
