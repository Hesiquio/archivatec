import { Hono } from 'hono'
import { authService } from './auth.service'
import {
  LoginSchema, RegisterSchema, CreateUsuarioSchema, UpdateUsuarioSchema,
  type LoginDTO, type RegisterDTO, type CreateUsuarioDTO, type UpdateUsuarioDTO,
} from './auth.schema'
import { validateBody } from '../../middleware/validator.middleware'
import { authMiddleware } from '../../middleware/auth.middleware'
import { adminOnly } from '../../middleware/rbac.middleware'
import { authRateLimitMiddleware } from '../../middleware/rateLimit.middleware'
import { HTTPException } from 'hono/http-exception'
import { db } from '../../infrastructure/database/client'
import { usuarios } from '../../infrastructure/database/schema'
import { eq } from 'drizzle-orm'

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
  const canCreate = caller.rol === 'ADMIN' || caller.permisos?.crearUsuarios === true
  if (!canCreate) {
    throw new HTTPException(403, { message: 'No tienes permiso para crear usuarios' })
  }
  const body = c.req.valid('json') as CreateUsuarioDTO
  const result = await authService.createUsuario(body)
  return c.json({ success: true, data: result }, 201)
})

// GET /usuarios — Lista todos los usuarios (sólo admin con crearUsuarios)
authRoutes.get('/usuarios', authMiddleware, async (c) => {
  const caller = c.get('user') as any
  const canView = caller.rol === 'ADMIN' || caller.permisos?.crearUsuarios === true
  if (!canView) throw new HTTPException(403, { message: 'Acceso denegado' })

  const lista = await db
    .select({
      id:                 usuarios.id,
      username:           usuarios.email,   // username = email completo
      nombre:             usuarios.nombre,
      division:           usuarios.division,
      rol:                usuarios.rol,
      crearUsuarios:      usuarios.crearUsuarios,
      subirArchivos:      usuarios.subirArchivos,
      modificarArchivos:  usuarios.modificarArchivos,
      eliminarArchivos:   usuarios.eliminarArchivos,
      verOtrasDivisiones: usuarios.verOtrasDivisiones,
    })
    .from(usuarios)
    .orderBy(usuarios.creadoEn)

  // Normalizar al formato que espera el frontend
  const data = lista.map(u => ({
    id:       u.id,
    username: u.username.split('@')[0],  // quitar dominio para mostrar
    nombre:   u.nombre,
    division: u.division,
    rol:      u.rol,
    permisos: {
      crearUsuarios:      u.crearUsuarios,
      subirArchivos:      u.subirArchivos,
      modificarArchivos:  u.modificarArchivos,
      eliminarArchivos:   u.eliminarArchivos,
      verOtrasDivisiones: u.verOtrasDivisiones,
    },
  }))

  return c.json({ success: true, data })
})

// PATCH /usuarios/:id — Editar usuario + opcionalmente cambiar contraseña
// Requiere autenticación + permiso crearUsuarios (sólo admins editan a otros)
authRoutes.patch('/usuarios/:id', authMiddleware, validateBody(UpdateUsuarioSchema), async (c) => {
  const caller = c.get('user') as any
  const canEdit = caller.rol === 'ADMIN' || caller.permisos?.crearUsuarios === true
  if (!canEdit) throw new HTTPException(403, { message: 'No tienes permiso para editar usuarios' })

  const id   = c.req.param('id')
  const body = c.req.valid('json') as UpdateUsuarioDTO
  const result = await authService.updateUsuario(id, body)
  return c.json({ success: true, data: result })
})

// DELETE /usuarios/:id — Eliminar usuario
authRoutes.delete('/usuarios/:id', authMiddleware, async (c) => {
  const caller = c.get('user') as any
  const canDelete = caller.rol === 'ADMIN' || caller.permisos?.crearUsuarios === true
  if (!canDelete) throw new HTTPException(403, { message: 'No tienes permiso para eliminar usuarios' })

  const id = c.req.param('id')
  const [deleted] = await db
    .delete(usuarios)
    .where(eq(usuarios.id, id))
    .returning({ id: usuarios.id })

  if (!deleted) throw new HTTPException(404, { message: 'Usuario no encontrado' })
  return c.json({ success: true, message: 'Usuario eliminado' })
})
