import { zValidator } from '@hono/zod-validator'
import type { ZodSchema } from 'zod'

// Extrae los errores de campo de forma compatible con Zod v3 y v4
function extractFieldErrors(error: any): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {}
  const issues: Array<{ path: (string | number)[]; message: string }> =
    error?.issues ?? error?.errors ?? []
  for (const issue of issues) {
    const key = issue.path.join('.') || '_root'
    if (!fieldErrors[key]) fieldErrors[key] = []
    fieldErrors[key].push(issue.message)
  }
  return fieldErrors
}

/**
 * Validador del body JSON de la petición.
 * Devuelve 422 con detalles de los campos inválidos.
 */
export const validateBody = (schema: ZodSchema) =>
  zValidator('json', schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          error: 'Error de validación en el cuerpo de la petición',
          details: extractFieldErrors(result.error),
        },
        422,
      )
    }
  })

/**
 * Validador de parámetros de query string.
 */
export const validateQuery = (schema: ZodSchema) =>
  zValidator('query', schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          error: 'Parámetros de consulta inválidos',
          details: extractFieldErrors(result.error),
        },
        422,
      )
    }
  })

/**
 * Validador de parámetros de ruta (ej: :id)
 */
export const validateParam = (schema: ZodSchema) =>
  zValidator('param', schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          error: 'Parámetros de ruta inválidos',
          details: extractFieldErrors(result.error),
        },
        400,
      )
    }
  })
