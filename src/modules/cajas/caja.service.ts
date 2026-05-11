import { db } from '../../infrastructure/database/client'
import { cajas, ubicaciones } from '../../infrastructure/database/schema'
import { eq, and, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import type { CajaDTO, CajaUpdateDTO, MoverCajaDTO, CajaQueryDTO } from './caja.schema'

export class CajaService {
  async listar(query: CajaQueryDTO) {
    const { page, limit, tipoDocumento, estado, ubicacionId } = query
    const offset = (page - 1) * limit
    const conditions = []

    if (tipoDocumento) conditions.push(eq(cajas.tipoDocumento, tipoDocumento))
    if (estado) conditions.push(eq(cajas.estado, estado))
    if (ubicacionId) conditions.push(eq(cajas.ubicacionId, ubicacionId))

    const where = conditions.length ? and(...conditions) : undefined

    const [rows, [{ total }]] = await Promise.all([
      db.select({
        id: cajas.id,
        numeroCaja: cajas.numeroCaja,
        tipoDocumento: cajas.tipoDocumento,
        estado: cajas.estado,
        totalExpedientes: cajas.totalExpedientes,
        creadoEn: cajas.creadoEn,
        ubicacion: {
          id: ubicaciones.id,
          codigo: ubicaciones.codigo,
          salon: ubicaciones.salon,
        },
      })
        .from(cajas)
        .leftJoin(ubicaciones, eq(cajas.ubicacionId, ubicaciones.id))
        .where(where)
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)` }).from(cajas).where(where),
    ])

    return {
      data: rows,
      meta: { total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) },
    }
  }

  async obtenerPorId(id: string) {
    const [caja] = await db
      .select()
      .from(cajas)
      .where(eq(cajas.id, id))
      .limit(1)

    if (!caja) {
      throw new HTTPException(404, { message: `Caja ${id} no encontrada` })
    }
    return caja
  }

  async crear(data: CajaDTO) {
    const [existing] = await db
      .select({ id: cajas.id })
      .from(cajas)
      .where(eq(cajas.numeroCaja, data.numeroCaja))
      .limit(1)

    if (existing) {
      throw new HTTPException(409, { message: `Ya existe una caja con el número ${data.numeroCaja}` })
    }

    const [nuevaCaja] = await db.insert(cajas).values(data).returning()

    // Incrementar ocupación en la ubicación
    await db
      .update(ubicaciones)
      .set({ ocupacionActual: sql`${ubicaciones.ocupacionActual} + 1` })
      .where(eq(ubicaciones.id, data.ubicacionId))

    return nuevaCaja
  }

  async actualizar(id: string, data: CajaUpdateDTO) {
    await this.obtenerPorId(id)

    const [actualizada] = await db
      .update(cajas)
      .set({ ...data, actualizadoEn: new Date() })
      .where(eq(cajas.id, id))
      .returning()

    return actualizada
  }

  async mover(id: string, data: MoverCajaDTO) {
    const caja = await this.obtenerPorId(id)

    // Decrementar ubicación anterior
    await db
      .update(ubicaciones)
      .set({ ocupacionActual: sql`${ubicaciones.ocupacionActual} - 1` })
      .where(eq(ubicaciones.id, caja.ubicacionId))

    // Incrementar nueva ubicación
    await db
      .update(ubicaciones)
      .set({ ocupacionActual: sql`${ubicaciones.ocupacionActual} + 1` })
      .where(eq(ubicaciones.id, data.nuevaUbicacionId))

    const [movida] = await db
      .update(cajas)
      .set({ ubicacionId: data.nuevaUbicacionId, actualizadoEn: new Date() })
      .where(eq(cajas.id, id))
      .returning()

    return movida
  }

  async darDeBaja(id: string) {
    await this.obtenerPorId(id)
    const [result] = await db
      .update(cajas)
      .set({ estado: 'DADA_DE_BAJA', actualizadoEn: new Date() })
      .where(eq(cajas.id, id))
      .returning()
    return result ? { id: result.id } : undefined
  }
}

export const cajaService = new CajaService()
