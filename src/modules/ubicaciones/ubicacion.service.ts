import { db } from '../../infrastructure/database/client'
import { ubicaciones } from '../../infrastructure/database/schema'
import { eq, and, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import type { UbicacionDTO, UbicacionUpdateDTO, UbicacionQueryDTO } from './ubicacion.schema'

export class UbicacionService {
  async listar(query: UbicacionQueryDTO) {
    const { page, limit, salon, activo } = query
    const offset = (page - 1) * limit

    const conditions = []
    if (salon) conditions.push(eq(ubicaciones.salon, salon))
    if (activo !== undefined) conditions.push(eq(ubicaciones.activo, activo === 'true'))

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(ubicaciones)
        .where(conditions.length ? and(...conditions) : undefined)
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)` }).from(ubicaciones)
        .where(conditions.length ? and(...conditions) : undefined),
    ])

    return {
      data: rows,
      meta: { total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) },
    }
  }

  async obtenerPorId(id: string) {
    const [ubicacion] = await db
      .select()
      .from(ubicaciones)
      .where(eq(ubicaciones.id, id))
      .limit(1)

    if (!ubicacion) {
      throw new HTTPException(404, { message: `Ubicación ${id} no encontrada` })
    }
    return ubicacion
  }

  async crear(data: UbicacionDTO) {
    const [existing] = await db
      .select({ id: ubicaciones.id })
      .from(ubicaciones)
      .where(eq(ubicaciones.codigo, data.codigo))
      .limit(1)

    if (existing) {
      throw new HTTPException(409, { message: `Ya existe una ubicación con el código ${data.codigo}` })
    }

    const [nueva] = await db.insert(ubicaciones).values(data).returning()
    return nueva
  }

  async actualizar(id: string, data: UbicacionUpdateDTO) {
    await this.obtenerPorId(id)

    const [actualizada] = await db
      .update(ubicaciones)
      .set({ ...data, actualizadoEn: new Date() })
      .where(eq(ubicaciones.id, id))
      .returning()

    return actualizada
  }

  async desactivar(id: string) {
    await this.obtenerPorId(id)
    const [result] = await db
      .update(ubicaciones)
      .set({ activo: false, actualizadoEn: new Date() })
      .where(eq(ubicaciones.id, id))
      .returning()
    return result ? { id: result.id } : undefined
  }
}

export const ubicacionService = new UbicacionService()
