import { z } from 'zod'

export const UbicacionSchema = z.object({
  codigo: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[A-Z0-9\-]+$/, 'Solo mayúsculas, números y guiones'),
  descripcion: z.string().min(5).max(200).optional(),
  salon: z.string().min(1).max(100),
  estante: z.number().int().positive(),
  fila: z.number().int().positive(),
  columna: z.number().int().positive(),
  capacidadMaxima: z.number().int().positive().default(50),
  activo: z.boolean().default(true),
})

export const UbicacionUpdateSchema = UbicacionSchema.partial()

export const UbicacionQuerySchema = z.object({
  salon: z.string().optional(),
  activo: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type UbicacionDTO = z.infer<typeof UbicacionSchema>
export type UbicacionUpdateDTO = z.infer<typeof UbicacionUpdateSchema>
export type UbicacionQueryDTO = z.infer<typeof UbicacionQuerySchema>
