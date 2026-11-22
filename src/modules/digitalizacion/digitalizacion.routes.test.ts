import { beforeEach, expect, mock, test } from 'bun:test'

const createSignedUploadUrl = mock(async () => 'signed-upload-token')
const fileExists = mock(async () => true)
const getPublicUrl = mock(() => 'https://storage.example.test/public.pdf')
const iniciar = mock(async (_data: unknown, _operadorId: string) => ({ id: 'digitalizacion-id' }))

mock.module('./digitalizacion.service', () => ({
  digitalizacionService: {
    listar: mock(),
    obtenerPorExpediente: mock(),
    obtenerPorId: mock(),
    iniciar,
    eliminar: mock(),
    actualizarEstado: mock(),
  },
}))

mock.module('../../infrastructure/storage/supabase-storage', () => ({
  storageService: {
    createSignedUploadUrl,
    fileExists,
    getPublicUrl,
    deleteFile: mock(),
  },
}))

const { digitalizacionRoutes } = await import('./digitalizacion.routes')
const { env } = await import('../../config/env')
const { sign } = await import('hono/jwt')
const { Hono } = await import('hono')

const app = new Hono()
app.route('/api/v1/digitalizacion', digitalizacionRoutes)

async function tokenFor(role: string, subirArchivos: boolean) {
  const now = Math.floor(Date.now() / 1000)
  return sign({
    sub: '00000000-0000-0000-0000-000000000001',
    email: 'archivista@itse.edu.mx',
    rol: role,
    permisos: { subirArchivos },
    iat: now,
    exp: now + 60,
  }, env.JWT_SECRET)
}

beforeEach(() => {
  createSignedUploadUrl.mockClear()
  fileExists.mockClear()
  getPublicUrl.mockClear()
  iniciar.mockClear()
  createSignedUploadUrl.mockResolvedValue('signed-upload-token')
  fileExists.mockResolvedValue(true)
})

test('creates a signed upload URL without sending PDF bytes through the API', async () => {
  const token = await tokenFor('ARCHIVISTA', true)
  const response = await app.request('/api/v1/digitalizacion/upload-url/3S.14.01', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: 'Acta de academia.pdf', contentType: 'application/pdf' }),
  })

  expect(response.status).toBe(200)
  const payload = await response.json() as {
    success: boolean
    data: { bucket: string; token: string; path: string }
  }
  expect(payload).toMatchObject({
    success: true,
    data: { bucket: env.STORAGE_BUCKET, token: 'signed-upload-token' },
  })
  expect(payload.data.path).toMatch(/^digitalizados\/3S\.14\.01\/\d{13}-[0-9a-f-]{36}-Actadeacademia\.pdf$/i)
  expect(createSignedUploadUrl).toHaveBeenCalledWith(env.STORAGE_BUCKET, payload.data.path)
})

test('requires the granular upload permission before issuing a signed URL', async () => {
  const token = await tokenFor('ARCHIVISTA', false)
  const response = await app.request('/api/v1/digitalizacion/upload-url/3S.14.01', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: 'Acta.pdf', contentType: 'application/pdf' }),
  })

  expect(response.status).toBe(403)
  expect(createSignedUploadUrl).not.toHaveBeenCalled()
})

test('registers metadata only after the object exists in Storage', async () => {
  const token = await tokenFor('ARCHIVISTA', true)
  const path = 'digitalizados/3S.14.01/1700000000000-550e8400-e29b-41d4-a716-446655440000-acta.pdf'
  const response = await app.request('/api/v1/digitalizacion/upload/3S.14.01', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, checksumSha256: 'a'.repeat(64) }),
  })

  expect(response.status).toBe(201)
  expect(fileExists).toHaveBeenCalledWith(env.STORAGE_BUCKET, path)
  expect(iniciar).toHaveBeenCalledWith({
    expedienteId: '3S.14.01',
    urlArchivo: 'https://storage.example.test/public.pdf',
    totalPaginas: 1,
    checksumSha256: 'a'.repeat(64),
    resolucionDpi: 300,
    formatoArchivo: 'PDF',
  }, '00000000-0000-0000-0000-000000000001')
})

test('does not register metadata when Storage has not completed the upload', async () => {
  fileExists.mockResolvedValue(false)
  const token = await tokenFor('ARCHIVISTA', true)
  const response = await app.request('/api/v1/digitalizacion/upload/3S.14.01', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: 'digitalizados/3S.14.01/1700000000000-550e8400-e29b-41d4-a716-446655440000-acta.pdf',
      checksumSha256: 'a'.repeat(64),
    }),
  })

  expect(response.status).toBe(422)
  expect(iniciar).not.toHaveBeenCalled()
})
