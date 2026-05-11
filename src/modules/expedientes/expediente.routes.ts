import { Hono } from 'hono'
import { expedienteService } from './expediente.service'
import {
  ExpedienteSchema,
  ExpedienteUpdateSchema,
  BusquedaAvanzadaSchema,
  ExpedienteQuerySchema,
  type ExpedienteDTO,
  type ExpedienteUpdateDTO,
  type BusquedaAvanzadaDTO,
  type ExpedienteQueryDTO,
} from './expediente.schema'
import { validateBody, validateQuery } from '../../middleware/validator.middleware'
import { authMiddleware } from '../../middleware/auth.middleware'
import { requireRole } from '../../middleware/rbac.middleware'

export const expedienteRoutes = new Hono()

expedienteRoutes.use('*', authMiddleware)

expedienteRoutes.get('/', validateQuery(ExpedienteQuerySchema), async (c) => {
  const query = c.req.valid('query') as ExpedienteQueryDTO
  const result = await expedienteService.listar(query)
  return c.json({ success: true, ...result })
})

expedienteRoutes.get('/:id', async (c) => {
  const result = await expedienteService.obtenerPorId(c.req.param('id'))
  return c.json({ success: true, data: result })
})

expedienteRoutes.post('/buscar', validateBody(BusquedaAvanzadaSchema), async (c) => {
  const body = c.req.valid('json') as BusquedaAvanzadaDTO
  const result = await expedienteService.busquedaAvanzada(body)
  return c.json({ success: true, ...result })
})

expedienteRoutes.post(
  '/',
  requireRole('ARCHIVISTA', 'ADMIN'),
  validateBody(ExpedienteSchema),
  async (c) => {
    const body = c.req.valid('json') as ExpedienteDTO
    const result = await expedienteService.crear(body)
    return c.json({ success: true, data: result }, 201)
  },
)

expedienteRoutes.patch(
  '/:id',
  requireRole('ARCHIVISTA', 'ADMIN'),
  validateBody(ExpedienteUpdateSchema),
  async (c) => {
    const body = c.req.valid('json') as ExpedienteUpdateDTO
    const result = await expedienteService.actualizar(c.req.param('id'), body)
    return c.json({ success: true, data: result })
  },
)
