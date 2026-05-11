import { Hono } from 'hono'
import { digitalizacionService } from './digitalizacion.service'
import {
  DigitalizacionSchema,
  ActualizarEstadoSchema,
  DigitalizacionQuerySchema,
  type DigitalizacionDTO,
  type ActualizarEstadoDTO,
  type DigitalizacionQueryDTO,
} from './digitalizacion.schema'
import { validateBody, validateQuery } from '../../middleware/validator.middleware'
import { authMiddleware } from '../../middleware/auth.middleware'
import { requireRole } from '../../middleware/rbac.middleware'

export const digitalizacionRoutes = new Hono()

digitalizacionRoutes.use('*', authMiddleware)

digitalizacionRoutes.get('/', validateQuery(DigitalizacionQuerySchema), async (c) => {
  const query = c.req.valid('query') as DigitalizacionQueryDTO
  const result = await digitalizacionService.listar(query)
  return c.json({ success: true, ...result })
})

digitalizacionRoutes.get('/:id', async (c) => {
  const result = await digitalizacionService.obtenerPorId(c.req.param('id'))
  return c.json({ success: true, data: result })
})

digitalizacionRoutes.post(
  '/',
  requireRole('DIGITALIZADOR', 'ARCHIVISTA', 'ADMIN'),
  validateBody(DigitalizacionSchema),
  async (c) => {
    const body = c.req.valid('json') as DigitalizacionDTO
    const user = c.get('user')
    const result = await digitalizacionService.iniciar(body, user.sub)
    return c.json({ success: true, data: result }, 201)
  },
)

digitalizacionRoutes.patch(
  '/:id/estado',
  requireRole('DIGITALIZADOR', 'ARCHIVISTA', 'ADMIN'),
  validateBody(ActualizarEstadoSchema),
  async (c) => {
    const body = c.req.valid('json') as ActualizarEstadoDTO
    const result = await digitalizacionService.actualizarEstado(c.req.param('id'), body)
    return c.json({ success: true, data: result })
  },
)
