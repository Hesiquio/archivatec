import { db } from '../../infrastructure/database/client'
import { prestamos, expedientes, cajas } from '../../infrastructure/database/schema'
import { eq, and, lt, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import type { PrestamoDTO, DevolverPrestamoDTO, ExtenderPrestamoDTO, PrestamoQueryDTO } from './prestamo.schema'

export class PrestamoService {
  async listar(query: PrestamoQueryDTO) {
    const { page, limit, estado } = query
    const offset = (page - 1) * limit
    const conditions = estado ? [eq(prestamos.estado, estado)] : []
    const where = conditions.length ? and(...conditions) : undefined

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(prestamos).where(where).limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)` }).from(prestamos).where(where),
    ])

    return {
      data: rows,
      meta: { total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) },
    }
  }

  async vencidos() {
    const ahora = new Date()
    return db
      .select()
      .from(prestamos)
      .where(
        and(
          eq(prestamos.estado, 'ACTIVO'),
          lt(prestamos.fechaDevolucionEsperada, ahora),
        ),
      )
  }

  async obtenerPorId(id: string) {
    const [prestamo] = await db
      .select()
      .from(prestamos)
      .where(eq(prestamos.id, id))
      .limit(1)

    if (!prestamo) {
      throw new HTTPException(404, { message: `Préstamo ${id} no encontrado` })
    }
    return prestamo
  }

  async crear(data: PrestamoDTO, autorizadoPorId: string) {
    // Verificar que el expediente/caja exista y esté disponible
    if (data.expedienteId) {
      const [exp] = await db
        .select({ estado: expedientes.estado })
        .from(expedientes)
        .where(eq(expedientes.id, data.expedienteId))
        .limit(1)

      if (!exp) throw new HTTPException(404, { message: 'Expediente no encontrado' })
      if (exp.estado !== 'ACTIVO') {
        throw new HTTPException(409, { message: `El expediente no está disponible (estado: ${exp.estado})` })
      }

      // Marcar expediente como PRESTADO
      await db.update(expedientes).set({ estado: 'PRESTADO' }).where(eq(expedientes.id, data.expedienteId))
    }

    if (data.cajaId) {
      const [caja] = await db
        .select({ estado: cajas.estado })
        .from(cajas)
        .where(eq(cajas.id, data.cajaId))
        .limit(1)

      if (!caja) throw new HTTPException(404, { message: 'Caja no encontrada' })
      if (caja.estado !== 'ACTIVA') {
        throw new HTTPException(409, { message: `La caja no está disponible (estado: ${caja.estado})` })
      }

      // Marcar caja como EN_PRESTAMO
      await db.update(cajas).set({ estado: 'EN_PRESTAMO' }).where(eq(cajas.id, data.cajaId))
    }

    const [nuevoPrestamo] = await db
      .insert(prestamos)
      .values({ ...data, autorizadoPorId })
      .returning()

    return nuevoPrestamo
  }

  async devolver(id: string, data: DevolverPrestamoDTO) {
    const prestamo = await this.obtenerPorId(id)

    if (prestamo.estado === 'DEVUELTO') {
      throw new HTTPException(409, { message: 'Este préstamo ya fue devuelto' })
    }

    // Restaurar estado del expediente o caja
    if (prestamo.expedienteId) {
      await db
        .update(expedientes)
        .set({ estado: 'ACTIVO' })
        .where(eq(expedientes.id, prestamo.expedienteId))
    }

    if (prestamo.cajaId) {
      await db
        .update(cajas)
        .set({ estado: 'ACTIVA' })
        .where(eq(cajas.id, prestamo.cajaId))
    }

    const [devuelto] = await db
      .update(prestamos)
      .set({
        estado: 'DEVUELTO',
        fechaDevolucionReal: new Date(),
        observaciones: data.observaciones,
      })
      .where(eq(prestamos.id, id))
      .returning()

    return devuelto
  }

  async extender(id: string, data: ExtenderPrestamoDTO) {
    await this.obtenerPorId(id)

    const [extendido] = await db
      .update(prestamos)
      .set({ fechaDevolucionEsperada: data.nuevaFechaDevolucion })
      .where(eq(prestamos.id, id))
      .returning()

    return extendido
  }
}

export const prestamoService = new PrestamoService()
