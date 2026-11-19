import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { handlePortalAction } from './api/portal.js'

type DevRequest = {
  method?: string
  url?: string
  on: (event: string, listener: (chunk?: unknown) => void) => void
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const dbUrl = env.DATABASE_URL || ''

  return {
    plugins: [
      react(),
      {
        name: 'neon-portal-api',
        configureServer(server) {
          server.middlewares.use((rawReq, res, next) => {
            const req = rawReq as unknown as DevRequest
            if (
              req.method === 'POST' &&
              (req.url === '/api/portal' || req.url === '/api/command')
            ) {
              let raw = ''
              req.on('data', (chunk: unknown) => {
                raw += String(chunk ?? '')
              })
              req.on('end', () => {
                const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
                const payload =
                  req.url === '/api/command'
                    ? { action: 'send_command', ...parsed }
                    : parsed
                handlePortalAction(payload, dbUrl)
                  .then((result) => {
                    res.statusCode = result.status
                    res.setHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify(result.data))
                  })
                  .catch((err: unknown) => {
                    res.statusCode = 500
                    res.setHeader('Content-Type', 'application/json')
                    res.end(
                      JSON.stringify({
                        error: err instanceof Error ? err.message : String(err),
                      }),
                    )
                  })
              })
              return
            }
            next()
          })
        },
      },
    ],
    define: {
      'import.meta.env.VITE_NEON_CONFIGURED': JSON.stringify(Boolean(dbUrl)),
    },
    server: {
      port: 5173,
    },
    build: {
      outDir: 'dist',
    },
  }
})
