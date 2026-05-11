import { rateLimiter } from 'hono-rate-limiter'

export const rateLimitMiddleware = rateLimiter({
  windowMs: 15 * 60 * 1000, // ventana de 15 minutos
  limit: 100,               // máximo 100 peticiones por ventana por IP
  standardHeaders: 'draft-6',
  keyGenerator: (c) =>
    c.req.header('x-forwarded-for') ??
    c.req.header('x-real-ip') ??
    'unknown',
})

// Rate limit estricto para endpoints de autenticación
export const authRateLimitMiddleware = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10, // solo 10 intentos de login por ventana
  standardHeaders: 'draft-6',
  keyGenerator: (c) =>
    c.req.header('x-forwarded-for') ??
    c.req.header('x-real-ip') ??
    'unknown',
})
