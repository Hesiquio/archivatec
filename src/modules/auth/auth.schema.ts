import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export const RegisterSchema = z.object({
  nombre: z.string().min(2).max(200),
  email: z.string().email(),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(100),
  rol: z.enum(['ADMIN', 'ARCHIVISTA', 'CONSULTA', 'DIGITALIZADOR']).default('CONSULTA'),
})

export type LoginDTO = z.infer<typeof LoginSchema>
export type RegisterDTO = z.infer<typeof RegisterSchema>
