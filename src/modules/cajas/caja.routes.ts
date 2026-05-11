import { Hono } from 'hono'
import { cajaService } from './caja.service'
import {
  CajaSchema,
  CajaUpdateSchema,
  MoverCajaSchema,
  CajaQuerySchema,
  type CajaDTO,
  type CajaUpdateDTO,
  type MoverCajaDTO,
  type CajaQueryDTO,
} from './caja.schema'
import { validateBody, validateQuery } from '../../middleware/validator.middleware'
import { authMiddleware } from '../../middleware/auth.middleware'
import { requireRole } from '../../middleware/rbac.middleware'

export const cajaRoutes = new Hono()

cajaRoutes.use('*', authMiddleware)

cajaRoutes.get('/', validateQuery(CajaQuerySchema), async (c) => {
  const query = c.req.valid('query') as CajaQueryDTO
  const result = await cajaService.listar(query)
  return c.json({ success: true, ...result })
})

cajaRoutes.get('/:id', async (c) => {
  const result = await cajaService.obtenerPorId(c.req.param('id'))
  return c.json({ success: true, data: result })
})

cajaRoutes.post(
  '/',
  requireRole('ARCHIVISTA', 'ADMIN'),
  validateBody(CajaSchema),
  async (c) => {
    const body = c.req.valid('json') as CajaDTO
    const result = await cajaService.crear(body)
    return c.json({ success: true, data: result }, 201)
  },
)

cajaRoutes.patch(
  '/:id',
  requireRole('ARCHIVISTA', 'ADMIN'),
  validateBody(CajaUpdateSchema),
  async (c) => {
    const body = c.req.valid('json') as CajaUpdateDTO
    const result = await cajaService.actualizar(c.req.param('id'), body)
    return c.json({ success: true, data: result })
  },
)

cajaRoutes.patch(
  '/:id/mover',
  requireRole('ARCHIVISTA', 'ADMIN'),
  validateBody(MoverCajaSchema),
  async (c) => {
    const body = c.req.valid('json') as MoverCajaDTO
    const result = await cajaService.mover(c.req.param('id'), body)
    return c.json({ success: true, data: result })
  },
)

cajaRoutes.delete('/:id', requireRole('ADMIN'), async (c) => {
  await cajaService.darDeBaja(c.req.param('id'))
  return c.json({ success: true, message: 'Caja dada de baja' })
})
