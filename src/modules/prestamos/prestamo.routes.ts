import { Hono } from 'hono'
import { prestamoService } from './prestamo.service'
import {
  PrestamoSchema,
  DevolverPrestamoSchema,
  ExtenderPrestamoSchema,
  PrestamoQuerySchema,
  type PrestamoDTO,
  type DevolverPrestamoDTO,
  type ExtenderPrestamoDTO,
  type PrestamoQueryDTO,
} from './prestamo.schema'
import { validateBody, validateQuery } from '../../middleware/validator.middleware'
import { authMiddleware } from '../../middleware/auth.middleware'
import { requireRole } from '../../middleware/rbac.middleware'

export const prestamoRoutes = new Hono()

prestamoRoutes.use('*', authMiddleware)

prestamoRoutes.get('/', validateQuery(PrestamoQuerySchema), async (c) => {
  const query = c.req.valid('query') as PrestamoQueryDTO
  const result = await prestamoService.listar(query)
  return c.json({ success: true, ...result })
})

prestamoRoutes.get('/vencidos', requireRole('ARCHIVISTA', 'ADMIN'), async (c) => {
  const result = await prestamoService.vencidos()
  return c.json({ success: true, data: result, total: result.length })
})

prestamoRoutes.get('/:id', async (c) => {
  const result = await prestamoService.obtenerPorId(c.req.param('id'))
  return c.json({ success: true, data: result })
})

prestamoRoutes.post(
  '/',
  requireRole('ARCHIVISTA', 'ADMIN'),
  validateBody(PrestamoSchema),
  async (c) => {
    const body = c.req.valid('json') as PrestamoDTO
    const user = c.get('user')
    const result = await prestamoService.crear(body, user.sub)
    return c.json({ success: true, data: result }, 201)
  },
)

prestamoRoutes.patch(
  '/:id/devolver',
  requireRole('ARCHIVISTA', 'ADMIN'),
  validateBody(DevolverPrestamoSchema),
  async (c) => {
    const body = c.req.valid('json') as DevolverPrestamoDTO
    const result = await prestamoService.devolver(c.req.param('id'), body)
    return c.json({ success: true, data: result })
  },
)

prestamoRoutes.patch(
  '/:id/extender',
  requireRole('ARCHIVISTA', 'ADMIN'),
  validateBody(ExtenderPrestamoSchema),
  async (c) => {
    const body = c.req.valid('json') as ExtenderPrestamoDTO
    const result = await prestamoService.extender(c.req.param('id'), body)
    return c.json({ success: true, data: result })
  },
)
