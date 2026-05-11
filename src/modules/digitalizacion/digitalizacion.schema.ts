import { z } from 'zod'

export const DigitalizacionSchema = z.object({
  expedienteId: z.string().uuid(),
  equipoEscaner: z.string().max(100).optional(),
  resolucionDpi: z.number().int().positive().default(300),
  formatoArchivo: z.enum(['PDF', 'PDF_A', 'TIFF', 'PNG']).default('PDF_A'),
  totalPaginas: z.number().int().positive(),
  urlArchivo: z.string().url(),
  checksumSha256: z.string().length(64, 'El checksum SHA-256 debe tener exactamente 64 caracteres'),
  observaciones: z.string().optional(),
})

export const ActualizarEstadoSchema = z.object({
  estado: z.enum(['EN_PROCESO', 'COMPLETADO', 'FALLIDO', 'VERIFICADO']),
  observaciones: z.string().optional(),
})

export const DigitalizacionQuerySchema = z.object({
  estado: z.enum(['EN_PROCESO', 'COMPLETADO', 'FALLIDO', 'VERIFICADO']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type DigitalizacionDTO = z.infer<typeof DigitalizacionSchema>
export type ActualizarEstadoDTO = z.infer<typeof ActualizarEstadoSchema>
export type DigitalizacionQueryDTO = z.infer<typeof DigitalizacionQuerySchema>
