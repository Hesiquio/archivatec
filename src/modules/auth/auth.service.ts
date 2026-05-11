import { db } from '../../infrastructure/database/client'
import { usuarios } from '../../infrastructure/database/schema'
import { eq } from 'drizzle-orm'
import { sign } from 'hono/jwt'
import { HTTPException } from 'hono/http-exception'
import { env } from '../../config/env'
import type { LoginDTO, RegisterDTO } from './auth.schema'

export class AuthService {
  async login(data: LoginDTO) {
    const [user] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, data.email))
      .limit(1)

    if (!user || !user.activo) {
      throw new HTTPException(401, { message: 'Credenciales inválidas' })
    }

    const passwordValid = await Bun.password.verify(data.password, user.passwordHash)
    if (!passwordValid) {
      throw new HTTPException(401, { message: 'Credenciales inválidas' })
    }

    const token = await sign(
      {
        sub: user.id,
        email: user.email,
        rol: user.rol,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60, // 8 horas
      },
      env.JWT_SECRET,
    )

    return {
      token,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      },
    }
  }

  async register(data: RegisterDTO) {
    const [existing] = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.email, data.email))
      .limit(1)

    if (existing) {
      throw new HTTPException(409, { message: 'El email ya está registrado' })
    }

    const passwordHash = await Bun.password.hash(data.password)

    const [newUser] = await db
      .insert(usuarios)
      .values({
        nombre: data.nombre,
        email: data.email,
        passwordHash,
        rol: data.rol,
      })
      .returning()

    return { id: newUser!.id, nombre: newUser!.nombre, email: newUser!.email, rol: newUser!.rol }
  }

  async me(userId: string) {
    const [user] = await db
      .select({
        id: usuarios.id,
        nombre: usuarios.nombre,
        email: usuarios.email,
        rol: usuarios.rol,
        creadoEn: usuarios.creadoEn,
      })
      .from(usuarios)
      .where(eq(usuarios.id, userId))
      .limit(1)

    if (!user) {
      throw new HTTPException(404, { message: 'Usuario no encontrado' })
    }

    return user
  }
}

export const authService = new AuthService()
