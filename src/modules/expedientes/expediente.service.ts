import { db } from '../../infrastructure/database/client'
import { expedientes, cajas } from '../../infrastructure/database/schema'
import { eq, and, ilike, gte, lte, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import type { ExpedienteDTO, ExpedienteUpdateDTO, BusquedaAvanzadaDTO, ExpedienteQueryDTO } from './expediente.schema'

export class ExpedienteService {
  async listar(query: ExpedienteQueryDTO) {
    const { page, limit, estado } = query
    const offset = (page - 1) * limit
    const conditions = estado ? [eq(expedientes.estado, estado)] : []
    const where = conditions.length ? and(...conditions) : undefined

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(expedientes).where(where).limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)` }).from(expedientes).where(where),
    ])

    return {
      data: rows,
      meta: { total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) },
    }
  }

  async obtenerPorId(id: string) {
    const [expediente] = await db
      .select()
      .from(expedientes)
      .where(eq(expedientes.id, id))
      .limit(1)

    if (!expediente) {
      throw new HTTPException(404, { message: `Expediente ${id} no encontrado` })
    }
    return expediente
  }

  async busquedaAvanzada(params: BusquedaAvanzadaDTO) {
    const { texto, tipoExpediente, estado, fechaDesde, fechaHasta, cajaId, page, limit } = params
    const offset = (page - 1) * limit
    const conditions = []

    if (texto) conditions.push(ilike(expedientes.nombreTitular, `%${texto}%`))
    if (tipoExpediente) conditions.push(eq(expedientes.tipoExpediente, tipoExpediente))
    if (estado) conditions.push(eq(expedientes.estado, estado))
    if (fechaDesde) conditions.push(gte(expedientes.fechaIngreso, fechaDesde))
    if (fechaHasta) conditions.push(lte(expedientes.fechaIngreso, fechaHasta))
    if (cajaId) conditions.push(eq(expedientes.cajaId, cajaId))

    const where = conditions.length ? and(...conditions) : undefined

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(expedientes).where(where).limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)` }).from(expedientes).where(where),
    ])

    return {
      data: rows,
      meta: { total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) },
    }
  }

  async crear(data: ExpedienteDTO) {
    const [existing] = await db
      .select({ id: expedientes.id })
      .from(expedientes)
      .where(eq(expedientes.numeroExpediente, data.numeroExpediente))
      .limit(1)

    if (existing) {
      throw new HTTPException(409, { message: `Ya existe el expediente ${data.numeroExpediente}` })
    }

    const [nuevo] = await db.insert(expedientes).values(data).returning()

    // Incrementar contador de expedientes en la caja
    await db
      .update(cajas)
      .set({ totalExpedientes: sql`${cajas.totalExpedientes} + 1` })
      .where(eq(cajas.id, data.cajaId))

    return nuevo
  }

  async actualizar(id: string, data: ExpedienteUpdateDTO) {
    await this.obtenerPorId(id)

    const [actualizado] = await db
      .update(expedientes)
      .set({ ...data, actualizadoEn: new Date() })
      .where(eq(expedientes.id, id))
      .returning()

    return actualizado
  }
}

export const expedienteService = new ExpedienteService()
