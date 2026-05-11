import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'

export type Role = 'ADMIN' | 'ARCHIVISTA' | 'CONSULTA' | 'DIGITALIZADOR'

// Jerarquía de permisos: cada rol tiene acceso a sus permisos y los de menor jerarquía
const ROLE_HIERARCHY: Record<Role, number> = {
  ADMIN: 4,
  ARCHIVISTA: 3,
  DIGITALIZADOR: 2,
  CONSULTA: 1,
}

/**
 * Requiere que el usuario tenga al menos uno de los roles especificados.
 * Uso: requireRole('ADMIN', 'ARCHIVISTA')
 */
export const requireRole = (...roles: Role[]) =>
  createMiddleware(async (c, next) => {
    const user = c.get('user')

    if (!user) {
      throw new HTTPException(401, { message: 'No autenticado' })
    }

    const userRole = user.rol as Role
    const hasPermission = roles.some((role) => {
      // Acceso exacto al rol O rol con mayor jerarquía
      return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[role]
    })

    if (!hasPermission) {
      throw new HTTPException(403, {
        message: `Acceso denegado. Se requiere rol: ${roles.join(' o ')}`,
      })
    }

    await next()
  })

/**
 * Requiere que el usuario sea exactamente ADMIN
 */
export const adminOnly = requireRole('ADMIN')
