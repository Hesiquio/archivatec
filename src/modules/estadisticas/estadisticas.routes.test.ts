import { expect, mock, test } from 'bun:test'
import { Hono } from 'hono'

const from = mock(async () => [{ total: '7' }])
const select = mock(() => ({ from }))

mock.module('../../infrastructure/database/client', () => ({
  db: { select },
}))

const { estadisticasRoutes } = await import('./estadisticas.routes')

test('returns the total number of digitalized documents', async () => {
  const app = new Hono()
  app.route('/api/v1/estadisticas', estadisticasRoutes)

  const response = await app.request('/api/v1/estadisticas/total-documentos')

  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    success: true,
    data: { total: 7 },
  })
  expect(select).toHaveBeenCalledTimes(1)
  expect(from).toHaveBeenCalledTimes(1)
})
