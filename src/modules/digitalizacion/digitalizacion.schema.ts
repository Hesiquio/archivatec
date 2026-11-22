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

export const PrepararSubidaSchema = z.object({
  fileName: z.string().trim().min(1).max(255).regex(/^.+\.pdf$/i, 'El archivo debe ser un PDF'),
  contentType: z.literal('application/pdf'),
})

export const CompletarSubidaSchema = z.object({
  path: z.string().regex(
    /^digitalizados\/[A-Za-z0-9.-]{1,100}\/\d{13}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[a-z0-9-]+\.pdf$/i,
    'Ruta de archivo inválida',
  ),
  checksumSha256: z.string().regex(/^[0-9a-f]{64}$/i, 'El checksum SHA-256 debe tener exactamente 64 caracteres hexadecimales'),
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
export type PrepararSubidaDTO = z.infer<typeof PrepararSubidaSchema>
export type CompletarSubidaDTO = z.infer<typeof CompletarSubidaSchema>
export type ActualizarEstadoDTO = z.infer<typeof ActualizarEstadoSchema>
export type DigitalizacionQueryDTO = z.infer<typeof DigitalizacionQuerySchema>
