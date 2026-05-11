import { db } from '../../infrastructure/database/client'
import { digitalizaciones, expedientes } from '../../infrastructure/database/schema'
import { eq, and, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import type { DigitalizacionDTO, ActualizarEstadoDTO, DigitalizacionQueryDTO } from './digitalizacion.schema'

export class DigitalizacionService {
  async listar(query: DigitalizacionQueryDTO) {
    const { page, limit, estado } = query
    const offset = (page - 1) * limit
    const conditions = estado ? [eq(digitalizaciones.estado, estado)] : []
    const where = conditions.length ? and(...conditions) : undefined

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(digitalizaciones).where(where).limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)` }).from(digitalizaciones).where(where),
    ])

    return {
      data: rows,
      meta: { total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) },
    }
  }

  async obtenerPorId(id: string) {
    const [dig] = await db
      .select()
      .from(digitalizaciones)
      .where(eq(digitalizaciones.id, id))
      .limit(1)

    if (!dig) throw new HTTPException(404, { message: `Digitalización ${id} no encontrada` })
    return dig
  }

  async iniciar(data: DigitalizacionDTO, operadorId: string) {
    // Verificar que el expediente exista
    const [exp] = await db
      .select({ id: expedientes.id, estado: expedientes.estado })
      .from(expedientes)
      .where(eq(expedientes.id, data.expedienteId))
      .limit(1)

    if (!exp) throw new HTTPException(404, { message: 'Expediente no encontrado' })

    const [nueva] = await db
      .insert(digitalizaciones)
      .values({ ...data, operadorId })
      .returning()

    // Actualizar URL del digitalizado en el expediente
    await db
      .update(expedientes)
      .set({ digitalizadoUrl: data.urlArchivo, estado: 'DIGITALIZADO' })
      .where(eq(expedientes.id, data.expedienteId))

    return nueva
  }

  async actualizarEstado(id: string, data: ActualizarEstadoDTO) {
    await this.obtenerPorId(id)

    const [actualizada] = await db
      .update(digitalizaciones)
      .set({ ...data, actualizadoEn: new Date() })
      .where(eq(digitalizaciones.id, id))
      .returning()

    return actualizada
  }
}

export const digitalizacionService = new DigitalizacionService()
