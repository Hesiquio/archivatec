import { Hono } from 'hono'
import { ubicacionService } from './ubicacion.service'
import {
  UbicacionSchema,
  UbicacionUpdateSchema,
  UbicacionQuerySchema,
  type UbicacionDTO,
  type UbicacionUpdateDTO,
  type UbicacionQueryDTO,
} from './ubicacion.schema'
import { validateBody, validateQuery } from '../../middleware/validator.middleware'
import { authMiddleware } from '../../middleware/auth.middleware'
import { requireRole } from '../../middleware/rbac.middleware'

export const ubicacionRoutes = new Hono()

ubicacionRoutes.use('*', authMiddleware)

ubicacionRoutes.get('/', validateQuery(UbicacionQuerySchema), async (c) => {
  const query = c.req.valid('query') as UbicacionQueryDTO
  const result = await ubicacionService.listar(query)
  return c.json({ success: true, ...result })
})

ubicacionRoutes.get('/:id', async (c) => {
  const result = await ubicacionService.obtenerPorId(c.req.param('id'))
  return c.json({ success: true, data: result })
})

ubicacionRoutes.post(
  '/',
  requireRole('ARCHIVISTA', 'ADMIN'),
  validateBody(UbicacionSchema),
  async (c) => {
    const body = c.req.valid('json') as UbicacionDTO
    const result = await ubicacionService.crear(body)
    return c.json({ success: true, data: result }, 201)
  },
)

ubicacionRoutes.patch(
  '/:id',
  requireRole('ARCHIVISTA', 'ADMIN'),
  validateBody(UbicacionUpdateSchema),
  async (c) => {
    const body = c.req.valid('json') as UbicacionUpdateDTO
    const result = await ubicacionService.actualizar(c.req.param('id'), body)
    return c.json({ success: true, data: result })
  },
)

ubicacionRoutes.delete('/:id', requireRole('ADMIN'), async (c) => {
  await ubicacionService.desactivar(c.req.param('id'))
  return c.json({ success: true, message: 'Ubicación desactivada' })
})
