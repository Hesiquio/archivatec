import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { db } from '../../infrastructure/database/client'
import { digitalizaciones } from '../../infrastructure/database/schema'

export const estadisticasRoutes = new Hono()

estadisticasRoutes.get('/total-documentos', async (c) => {
  const [result] = await db
    .select({ total: sql<number>`count(*)` })
    .from(digitalizaciones)

  return c.json({ success: true, data: { total: Number(result.total) } })
})
