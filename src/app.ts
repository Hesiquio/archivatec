import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { prettyJSON } from 'hono/pretty-json'
import { trimTrailingSlash } from 'hono/trailing-slash'
import { serveStatic } from 'hono/bun'
import { env } from './config/env'
import { errorHandler } from './middleware/errorHandler.middleware'
import { rateLimitMiddleware } from './middleware/rateLimit.middleware'

// Módulos
import { authRoutes } from './modules/auth/auth.routes'
import { expedienteRoutes } from './modules/expedientes/expediente.routes'
import { ubicacionRoutes } from './modules/ubicaciones/ubicacion.routes'
import { cajaRoutes } from './modules/cajas/caja.routes'
import { prestamoRoutes } from './modules/prestamos/prestamo.routes'
import { digitalizacionRoutes } from './modules/digitalizacion/digitalizacion.routes'

const app = new Hono()

// ─── Middlewares Globales ─────────────────────────────────────────
app.use('*', logger())
app.use('*', secureHeaders())
app.use('*', cors({
  origin: env.ALLOWED_ORIGINS.split(','),
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))
app.use('*', prettyJSON())
app.use('*', trimTrailingSlash())
app.use('/api/*', rateLimitMiddleware)

// ─── Health Check ─────────────────────────────────────────────────
app.get('/health', (c) =>
  c.json({
    status: 'ok',
    service: 'Archivística AI-DLC API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  }),
)

// ─── API v1 ───────────────────────────────────────────────────────
const api = app.basePath('/api/v1')

api.route('/auth', authRoutes)
api.route('/expedientes', expedienteRoutes)
api.route('/ubicaciones', ubicacionRoutes)
api.route('/cajas', cajaRoutes)
api.route('/prestamos', prestamoRoutes)
api.route('/digitalizacion', digitalizacionRoutes)

// ─── Frontend estático desde /public ─────────────────────────────
app.get('/', serveStatic({ path: './public/index.html' }))
app.use('/*', serveStatic({ root: './public' }))

// ─── Manejo de errores y rutas no encontradas ─────────────────────
app.onError(errorHandler)
app.notFound((c) => c.json({ success: false, error: 'Ruta no encontrada' }, 404))

export default app
