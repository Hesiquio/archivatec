import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { env } from '../config/env'

export interface JwtPayload {
  sub: string
  email: string
  rol: string
  iat: number
  exp: number
}

declare module 'hono' {
  interface ContextVariableMap {
    user: JwtPayload
  }
}

/** Decodifica y verifica un JWT manualmente para compatibilidad con Bun + Hono */
async function verifyJwt(token: string, secret: string): Promise<JwtPayload> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('JWT malformado')

  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string]

  // Verificar firma con HMAC-SHA256
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )

  const data = encoder.encode(`${headerB64}.${payloadB64}`)
  const signature = Uint8Array.from(
    atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
    (c) => c.charCodeAt(0),
  )

  const valid = await crypto.subtle.verify('HMAC', key, signature, data)
  if (!valid) throw new Error('Firma JWT inválida')

  // Decodificar payload
  const payload = JSON.parse(
    atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')),
  ) as JwtPayload

  // Verificar expiración
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('JWT expirado')
  }

  return payload
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Token de autorización requerido' })
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    const payload = await verifyJwt(token, env.JWT_SECRET)
    c.set('user', payload)
    await next()
  } catch {
    throw new HTTPException(401, { message: 'Token inválido o expirado' })
  }
})


