import { Hono } from 'hono'

const app = new Hono<{ Bindings: Cloudflare.Env }>().get('/api/health', (c) =>
  c.json({ status: 'ok' }),
)

export type AppType = typeof app

export default app
