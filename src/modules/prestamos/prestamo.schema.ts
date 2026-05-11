import { z } from 'zod'

export const PrestamoSchema = z
  .object({
    expedienteId: z.string().uuid().optional(),
    cajaId: z.string().uuid().optional(),
    solicitanteNombre: z.string().min(2).max(200),
    solicitanteMatricula: z.string().max(50).optional(),
    solicitanteDepartamento: z.string().min(2).max(200),
    motivoPrestamo: z.string().min(10).max(500),
    fechaDevolucionEsperada: z.coerce.date(),
    observaciones: z.string().optional(),
  })
  .refine((d) => d.expedienteId || d.cajaId, {
    message: 'Debe especificar un expediente o una caja',
  })

export const DevolverPrestamoSchema = z.object({
  observaciones: z.string().optional(),
})

export const ExtenderPrestamoSchema = z.object({
  nuevaFechaDevolucion: z.coerce.date(),
  motivo: z.string().min(5).max(200),
})

export const PrestamoQuerySchema = z.object({
  estado: z.enum(['PENDIENTE', 'ACTIVO', 'DEVUELTO', 'VENCIDO']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type PrestamoDTO = z.infer<typeof PrestamoSchema>
export type DevolverPrestamoDTO = z.infer<typeof DevolverPrestamoSchema>
export type ExtenderPrestamoDTO = z.infer<typeof ExtenderPrestamoSchema>
export type PrestamoQueryDTO = z.infer<typeof PrestamoQuerySchema>
