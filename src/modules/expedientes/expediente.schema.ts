import { z } from 'zod'

export const ExpedienteSchema = z.object({
  numeroExpediente: z.string().min(1).max(100),
  nombreTitular: z.string().min(2).max(200),
  tipoExpediente: z.enum(['ALUMNO', 'DOCENTE', 'ADMINISTRATIVO', 'PROYECTO', 'CONVENIO']),
  matriculaOEmpleado: z.string().max(50).optional(),
  carrera: z.string().max(150).optional(),
  fechaIngreso: z.coerce.date(),
  fechaCierre: z.coerce.date().optional(),
  cajaId: z.string().uuid('ID de caja inválido'),
  clasificacionAIDLC: z.string().max(100).optional(),
  observaciones: z.string().optional(),
})

export const ExpedienteUpdateSchema = ExpedienteSchema.partial()

export const BusquedaAvanzadaSchema = z.object({
  texto: z.string().min(2).optional(),
  tipoExpediente: z.enum(['ALUMNO', 'DOCENTE', 'ADMINISTRATIVO', 'PROYECTO', 'CONVENIO']).optional(),
  estado: z.enum(['ACTIVO', 'CERRADO', 'PRESTADO', 'DIGITALIZADO', 'TRANSFERIDO']).optional(),
  fechaDesde: z.coerce.date().optional(),
  fechaHasta: z.coerce.date().optional(),
  cajaId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const ExpedienteQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  estado: z.enum(['ACTIVO', 'CERRADO', 'PRESTADO', 'DIGITALIZADO', 'TRANSFERIDO']).optional(),
})

export type ExpedienteDTO = z.infer<typeof ExpedienteSchema>
export type ExpedienteUpdateDTO = z.infer<typeof ExpedienteUpdateSchema>
export type BusquedaAvanzadaDTO = z.infer<typeof BusquedaAvanzadaSchema>
export type ExpedienteQueryDTO = z.infer<typeof ExpedienteQuerySchema>
