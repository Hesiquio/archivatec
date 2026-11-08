import { db } from '../../infrastructure/database/client'
import { seriesDocumentales, usuarios } from '../../infrastructure/database/schema'
import { eq, and, sql, desc, ilike, or } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import type { SerieDocumentalDTO, SerieDocumentalQueryDTO, SerieDocumentalUpdateDTO } from './series-documental.schema'

export class SerieDocumentalService {
  async listar(query: SerieDocumentalQueryDTO) {
    const { page, limit, categoria, buscar } = query
    const offset = (page - 1) * limit

    const conditions = []
    if (categoria) conditions.push(eq(seriesDocumentales.categoria, categoria))
    if (buscar) {
      const pattern = `%${buscar.replace(/[\\%_]/g, '\\$&')}%`
      conditions.push(or(
        ilike(seriesDocumentales.codigo, pattern),
        ilike(seriesDocumentales.nombre, pattern),
        ilike(usuarios.nombre, pattern),
      )!)
    }
    const where = conditions.length ? and(...conditions) : undefined

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: seriesDocumentales.id,
          codigo: seriesDocumentales.codigo,
          nombre: seriesDocumentales.nombre,
          categoria: seriesDocumentales.categoria,
          codigoPadre: seriesDocumentales.codigoPadre,
          encargadoId: seriesDocumentales.encargadoId,
          encargadoNombre: usuarios.nombre,
          encargadoRol: usuarios.rol,
          fechaCreacion: seriesDocumentales.fechaCreacion,
          fechaVencimiento: seriesDocumentales.fechaVencimiento,
          creadoPorId: seriesDocumentales.creadoPorId,
          creadoEn: seriesDocumentales.creadoEn,
          actualizadoEn: seriesDocumentales.actualizadoEn,
        })
        .from(seriesDocumentales)
        .leftJoin(usuarios, eq(seriesDocumentales.encargadoId, usuarios.id))
        .where(where)
        .orderBy(desc(seriesDocumentales.creadoEn))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)` })
        .from(seriesDocumentales)
        .leftJoin(usuarios, eq(seriesDocumentales.encargadoId, usuarios.id))
        .where(where),
    ])

    return {
      data: rows,
      meta: { total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) },
    }
  }

  async crear(data: SerieDocumentalDTO, creadoPorId?: string) {
    if (data.encargadoId) {
      const [encargado] = await db
        .select({ id: usuarios.id })
        .from(usuarios)
        .where(eq(usuarios.id, data.encargadoId))
        .limit(1)

      if (!encargado) {
        throw new HTTPException(422, { message: 'El encargado seleccionado no existe' })
      }
    }

    if (data.codigoPadre) {
      const [padre] = await db
        .select({
          codigo: seriesDocumentales.codigo,
          categoria: seriesDocumentales.categoria,
        })
        .from(seriesDocumentales)
        .where(eq(seriesDocumentales.codigo, data.codigoPadre))
        .limit(1)

      if (padre && padre.categoria !== data.categoria) {
        throw new HTTPException(422, { message: 'La carpeta padre debe pertenecer a la misma categoría' })
      }

      if (!padre) {
        const catalogRoot = data.codigoPadre.match(/^\d+([SC])(?:\.|$)/)?.[1]
        const parentCategory = catalogRoot === 'S' ? 'sustantivas' : catalogRoot === 'C' ? 'comunes' : null
        if (parentCategory && parentCategory !== data.categoria) {
          throw new HTTPException(422, { message: 'La carpeta padre debe pertenecer a la misma categoría' })
        }
      }
    }

    const [existing] = await db
      .select({ id: seriesDocumentales.id })
      .from(seriesDocumentales)
      .where(eq(seriesDocumentales.codigo, data.codigo))
      .limit(1)

    if (existing) {
      throw new HTTPException(409, { message: `Ya existe una serie documental con el código ${data.codigo}` })
    }

    try {
      const [nueva] = await db.insert(seriesDocumentales).values({
        ...data,
        codigoPadre: data.codigoPadre || null,
        encargadoId: data.encargadoId || null,
        creadoPorId: creadoPorId ?? null,
      }).returning()
      return nueva
    } catch (error) {
      const databaseError = error as { code?: string; cause?: { code?: string } }
      if (databaseError.code === '23505' || databaseError.cause?.code === '23505') {
        throw new HTTPException(409, { message: `Ya existe una serie documental con el código ${data.codigo}` })
      }
      throw error
    }
  }

  async eliminar(id: string) {
    const [serie] = await db
      .select()
      .from(seriesDocumentales)
      .where(eq(seriesDocumentales.id, id))
      .limit(1)

    if (!serie) {
      throw new HTTPException(404, { message: `Serie documental ${id} no encontrada` })
    }

    const [{ total: hijos }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(seriesDocumentales)
      .where(eq(seriesDocumentales.codigoPadre, serie.codigo))

    if (Number(hijos) > 0) {
      throw new HTTPException(409, {
        message: `No se puede eliminar "${serie.codigo}": tiene ${hijos} sub-serie(s) debajo. Elimínalas primero.`,
      })
    }

    await db.delete(seriesDocumentales).where(eq(seriesDocumentales.id, id))
    return { success: true }
  }

  // Solo metadata (nombre, encargado, fechas) — codigo/categoria/codigoPadre
  // no forman parte de SerieDocumentalUpdateDTO, así que no pueden llegar aquí.
  async actualizar(id: string, data: SerieDocumentalUpdateDTO) {
    const [existing] = await db
      .select({ id: seriesDocumentales.id })
      .from(seriesDocumentales)
      .where(eq(seriesDocumentales.id, id))
      .limit(1)

    if (!existing) {
      throw new HTTPException(404, { message: `Serie documental ${id} no encontrada` })
    }

    if (data.encargadoId) {
      const [encargado] = await db
        .select({ id: usuarios.id })
        .from(usuarios)
        .where(eq(usuarios.id, data.encargadoId))
        .limit(1)

      if (!encargado) {
        throw new HTTPException(422, { message: 'El encargado seleccionado no existe' })
      }
    }

    const [actualizada] = await db
      .update(seriesDocumentales)
      .set({ ...data, actualizadoEn: new Date() })
      .where(eq(seriesDocumentales.id, id))
      .returning()

    return actualizada
  }
}

export const serieDocumentalService = new SerieDocumentalService()
