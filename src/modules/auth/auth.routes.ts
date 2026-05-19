import { Hono } from 'hono'
import { authService } from './auth.service'
import {
  LoginSchema, RegisterSchema, CreateUsuarioSchema,
  type LoginDTO, type RegisterDTO, type CreateUsuarioDTO,
} from './auth.schema'
import { validateBody } from '../../middleware/validator.middleware'
import { authMiddleware } from '../../middleware/auth.middleware'
import { adminOnly } from '../../middleware/rbac.middleware'
import { authRateLimitMiddleware } from '../../middleware/rateLimit.middleware'
import { HTTPException } from 'hono/http-exception'

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

// POST /usuarios — Crear usuario desde el modal del frontend
// Requiere autenticación + permiso crear_usuarios
authRoutes.post('/usuarios', authMiddleware, validateBody(CreateUsuarioSchema), async (c) => {
  const caller = c.get('user') as any
  // Verificar permiso granular (ADMIN siempre puede)
  const canCreate = caller.rol === 'ADMIN' || caller.permisos?.crearUsuarios === true
  if (!canCreate) {
    throw new HTTPException(403, { message: 'No tienes permiso para crear usuarios' })
  }
  const body = c.req.valid('json') as CreateUsuarioDTO
  const result = await authService.createUsuario(body)
  return c.json({ success: true, data: result }, 201)
})
