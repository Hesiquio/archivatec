import { Hono } from 'hono'
import { authService } from './auth.service'
import { LoginSchema, RegisterSchema, type LoginDTO, type RegisterDTO } from './auth.schema'
import { validateBody } from '../../middleware/validator.middleware'
import { authMiddleware } from '../../middleware/auth.middleware'
import { adminOnly } from '../../middleware/rbac.middleware'
import { authRateLimitMiddleware } from '../../middleware/rateLimit.middleware'

export const authRoutes = new Hono()

// POST /auth/login
authRoutes.post('/login', authRateLimitMiddleware, validateBody(LoginSchema), async (c) => {
  const body = c.req.valid('json') as LoginDTO
  const result = await authService.login(body)
  return c.json({ success: true, data: result }, 200)
})

// POST /auth/register — Solo ADMIN puede crear usuarios (vía API directa)
authRoutes.post(
  '/register',
  authMiddleware,
  adminOnly,
  validateBody(RegisterSchema),
  async (c) => {
    const body = c.req.valid('json') as RegisterDTO
    const result = await authService.register(body)
    return c.json({ success: true, data: result }, 201)
  },
)

// GET /auth/me — Perfil del usuario autenticado (incluye permisos)
authRoutes.get('/me', authMiddleware, async (c) => {
  const user = c.get('user')
  const result = await authService.me(user.sub)
  return c.json({ success: true, data: result })
})
