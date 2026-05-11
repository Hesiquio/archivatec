import { z } from 'zod'

export const CajaSchema = z.object({
  numeroCaja: z.string().min(1).max(50),
  descripcion: z.string().optional(),
  tipoDocumento: z.enum(['ACADEMICO', 'ADMINISTRATIVO', 'FINANCIERO', 'PERSONAL']),
  fechaInicio: z.coerce.date(),
  fechaFin: z.coerce.date().optional(),
  ubicacionId: z.string().uuid('ID de ubicación inválido'),
  observaciones: z.string().optional(),
})

export const CajaUpdateSchema = CajaSchema.partial()

export const MoverCajaSchema = z.object({
  nuevaUbicacionId: z.string().uuid(),
  motivo: z.string().min(5).max(500).optional(),
})

export const CajaQuerySchema = z.object({
  tipoDocumento: z.enum(['ACADEMICO', 'ADMINISTRATIVO', 'FINANCIERO', 'PERSONAL']).optional(),
  estado: z.enum(['ACTIVA', 'INACTIVA', 'EN_PRESTAMO', 'EN_DIGITALIZACION', 'DADA_DE_BAJA']).optional(),
  ubicacionId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type CajaDTO = z.infer<typeof CajaSchema>
export type CajaUpdateDTO = z.infer<typeof CajaUpdateSchema>
export type MoverCajaDTO = z.infer<typeof MoverCajaSchema>
export type CajaQueryDTO = z.infer<typeof CajaQuerySchema>
