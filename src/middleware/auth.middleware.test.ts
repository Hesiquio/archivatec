import { afterAll, expect, mock, test } from 'bun:test'

const profile = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@itse.edu.mx',
  rol: 'ADMIN',
  division: 'Dirección General',
  crearUsuarios: false,
  subirArchivos: false,
  modificarArchivos: false,
  eliminarArchivos: false,
  verOtrasDivisiones: false,
  activo: true,
}

const db = {
  select: mock(() => {
    const builder = {
      from: () => builder,
      where: () => builder,
      limit: async () => [profile],
    }
    return builder
  }),
}

mock.module('../infrastructure/database/client', () => ({ db }))
const { authMiddleware } = await import('./auth.middleware')
const { Hono } = await import('hono')

const originalFetch = globalThis.fetch

function setFetchMock(implementation: (input: Request | string | URL, init?: RequestInit) => Promise<Response>) {
  globalThis.fetch = Object.assign(
    (input: Request | string | URL, init?: RequestInit) => implementation(input, init),
    { preconnect: originalFetch.preconnect },
  )
}

afterAll(() => {
  globalThis.fetch = originalFetch
})

test('authenticates Supabase access tokens and resolves permissions from the database profile', async () => {
  setFetchMock(mock(async (_input: Request | string | URL, init?: RequestInit) => {
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer supabase-access-token')
    return Response.json({ id: profile.id, email: profile.email })
  }))

  const app = new Hono()
  app.get('/protected', authMiddleware, (c) => c.json(c.get('user')))

  const response = await app.request('/protected', {
    headers: { Authorization: 'Bearer supabase-access-token' },
  })
  const payload = await response.json()

  expect(response.status).toBe(200)
  expect(payload).toMatchObject({
    sub: profile.id,
    rol: 'ADMIN',
    permisos: {
      crearUsuarios: true,
      subirArchivos: true,
      modificarArchivos: true,
      eliminarArchivos: true,
      verOtrasDivisiones: true,
    },
  })
})

test('rejects a Supabase token that Supabase does not validate', async () => {
  setFetchMock(mock(async () => new Response(null, { status: 401 })))

  const app = new Hono()
  app.get('/protected', authMiddleware, (c) => c.json({ success: true }))

  const response = await app.request('/protected', {
    headers: { Authorization: 'Bearer invalid-supabase-token' },
  })

  expect(response.status).toBe(401)
})
