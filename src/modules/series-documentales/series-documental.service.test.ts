import { beforeEach, expect, mock, test } from 'bun:test'

const queryResults: unknown[][] = []
const databaseCalls: string[] = []
const whereArguments: unknown[] = []
let insertedValues: Record<string, unknown> | undefined

function query(result: unknown[]) {
  const builder: Record<string, any> = {}
  for (const method of ['from', 'leftJoin', 'where', 'orderBy', 'limit', 'offset', 'values', 'set']) {
    builder[method] = (...args: unknown[]) => {
      databaseCalls.push(method)
      if (method === 'where') whereArguments.push(args[0])
      if (method === 'values') insertedValues = args[0] as Record<string, unknown>
      return builder
    }
  }
  builder.returning = () => Promise.resolve(result)
  builder.then = (resolve: (value: unknown[]) => unknown, reject: (error: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return builder
}

const db = {
  select: mock(() => query(queryResults.shift() || [])),
  insert: mock(() => query([{ id: 'new-series' }])),
  update: mock(() => query([{ id: 'series-id', nombre: 'Editada' }])),
  delete: mock(() => query([])),
}

mock.module('../../infrastructure/database/client', () => ({ db }))
const { SerieDocumentalService } = await import('./series-documental.service')
const service = new SerieDocumentalService()
const { seriesDocumentalesRoutes } = await import('./series-documental.routes')
const { sign } = await import('hono/jwt')
const { env } = await import('../../config/env')
const { Hono } = await import('hono')

const app = new Hono()
app.route('/api/v1/series-documentales', seriesDocumentalesRoutes)

async function tokenFor(role: string, canManage = true) {
  const now = Math.floor(Date.now() / 1000)
  return sign({
    sub: '00000000-0000-0000-0000-000000000001',
    email: 'admin@itse.edu.mx',
    rol: role,
    permisos: { crearUsuarios: canManage },
    iat: now,
    exp: now + 60,
  }, env.JWT_SECRET)
}

beforeEach(() => {
  queryResults.length = 0
  databaseCalls.length = 0
  whereArguments.length = 0
  insertedValues = undefined
  db.select.mockClear()
  db.insert.mockClear()
})

test('lists series with joined user data and database pagination totals', async () => {
  queryResults.push(
    [{ id: 'series-id', codigo: '1S.90', encargadoNombre: 'Encargada' }],
    [{ total: '17' }],
  )

  const result = await service.listar({ page: 2, limit: 8, categoria: 'sustantivas', buscar: 'Encargada' })

  expect(result.data[0].encargadoNombre).toBe('Encargada')
  expect(result.meta).toEqual({ total: 17, page: 2, limit: 8, totalPages: 3 })
  expect(databaseCalls.filter((call) => call === 'leftJoin')).toHaveLength(2)
})

test('applies the subdirection filter to rows and pagination totals', async () => {
  queryResults.push([], [{ total: '0' }])

  await service.listar({
    page: 1,
    limit: 100,
    subdireccion: 'Subdirección Académica',
  })

  expect(whereArguments).toHaveLength(2)
  expect(whereArguments.every(Boolean)).toBe(true)
})

test('validates the assigned user and stores parent, category, and creator', async () => {
  queryResults.push(
    [{ id: 'user-id' }],
    [{ codigo: '1S', categoria: 'sustantivas' }],
    [],
  )

  await service.crear({
    codigo: '1S.90',
    nombre: 'Serie de prueba',
    categoria: 'sustantivas',
    codigoPadre: '1S',
    encargadoId: '00000000-0000-0000-0000-000000000001',
  }, 'creator-id')

  expect(insertedValues).toMatchObject({
    codigo: '1S.90',
    codigoPadre: '1S',
    encargadoId: '00000000-0000-0000-0000-000000000001',
    creadoPorId: 'creator-id',
  })
})

test('rejects codes outside authorized catalog roots before writing', async () => {
  await expect(service.crear({
    codigo: '6S.01',
    nombre: 'Serie fuera del catálogo',
    categoria: 'sustantivas',
  })).rejects.toMatchObject({ status: 422 })

  expect(db.select).not.toHaveBeenCalled()
  expect(db.insert).not.toHaveBeenCalled()
})

test('rejects an assigned user that does not exist', async () => {
  queryResults.push([])

  await expect(service.crear({
    codigo: '1S.90',
    nombre: 'Serie de prueba',
    categoria: 'sustantivas',
    encargadoId: '00000000-0000-0000-0000-000000000001',
  })).rejects.toMatchObject({ status: 422 })

  expect(db.insert).not.toHaveBeenCalled()
})

test('rejects a dynamic parent from a different category', async () => {
  queryResults.push(
    [{ codigo: '1C', categoria: 'comunes' }],
  )

  await expect(service.crear({
    codigo: '1S.90',
    nombre: 'Serie de prueba',
    categoria: 'sustantivas',
    codigoPadre: '1C',
  })).rejects.toMatchObject({ status: 422 })

  expect(db.insert).not.toHaveBeenCalled()
})

test('rejects a static parent whose code belongs to a different category', async () => {
  queryResults.push([])

  await expect(service.crear({
    codigo: '1S.90',
    nombre: 'Serie de prueba',
    categoria: 'sustantivas',
    codigoPadre: '1C.01',
  })).rejects.toMatchObject({ status: 422 })

  expect(db.insert).not.toHaveBeenCalled()
})

test('serves paginated search results through the authenticated Hono route', async () => {
  queryResults.push(
    [{ id: 'series-id', codigo: '1S.90', nombre: 'Archivo', categoria: 'sustantivas' }],
    [{ total: '1' }],
  )

  const token = await tokenFor('CONSULTA', false)
  const response = await app.request(
    '/api/v1/series-documentales?page=2&limit=8&categoria=sustantivas&buscar=Archivo',
    { headers: { Authorization: `Bearer ${token}` } },
  )

  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    success: true,
    data: [{ codigo: '1S.90' }],
    meta: { total: 1, page: 2, limit: 8, totalPages: 1 },
  })
})

test('validates writes and restricts create, edit, and delete to administrators', async () => {
  const adminToken = await tokenFor('ADMIN')
  const headers = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }

  const invalid = await app.request('/api/v1/series-documentales', {
    method: 'POST',
    headers,
    body: JSON.stringify({ codigo: 'bad code', nombre: '', categoria: 'other' }),
  })
  expect(invalid.status).toBe(422)

  const readerToken = await tokenFor('CONSULTA', false)
  for (const request of [
    app.request('/api/v1/series-documentales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${readerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: '1S.90', nombre: 'Serie', categoria: 'sustantivas' }),
    }),
    app.request('/api/v1/series-documentales/series-id', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${readerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Editada' }),
    }),
    app.request('/api/v1/series-documentales/series-id', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${readerToken}` },
    }),
  ]) {
    expect((await request).status).toBe(403)
  }
})

test('creates, edits, and deletes a series through the Hono API', async () => {
  queryResults.push([], [{ id: 'created-series', codigo: '1S.90' }])
  const token = await tokenFor('ADMIN')
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const created = await app.request('/api/v1/series-documentales', {
    method: 'POST',
    headers,
    body: JSON.stringify({ codigo: '1S.90', nombre: 'Nueva serie', categoria: 'sustantivas' }),
  })
  expect(created.status).toBe(201)

  queryResults.push([{ id: 'created-series' }], [{ id: 'created-series', nombre: 'Editada' }])
  const updated = await app.request('/api/v1/series-documentales/created-series', {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ nombre: 'Editada', encargadoId: null }),
  })
  expect(updated.status).toBe(200)
  expect(await updated.json()).toMatchObject({ data: { nombre: 'Editada' } })

  queryResults.push(
    [{ id: 'created-series', codigo: '1S.90' }],
    [{ total: '0' }],
    [],
  )
  const deleted = await app.request('/api/v1/series-documentales/created-series', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(deleted.status).toBe(200)
})
