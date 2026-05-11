import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'

export const errorHandler: ErrorHandler = (err, c) => {
  const method = c.req.method
  const url = c.req.url
  const timestamp = new Date().toISOString()

  // ─── Error HTTP conocido (lanzado explícitamente) ──────────────
  if (err instanceof HTTPException) {
    console.warn(`[${timestamp}] HTTP ${err.status} ${method} ${url} — ${err.message}`)
    return c.json(
      { success: false, error: err.message, statusCode: err.status },
      err.status,
    )
  }

  // ─── Error de validación Zod ───────────────────────────────────
  if (err instanceof ZodError) {
    console.warn(`[${timestamp}] VALIDATION ${method} ${url}`)
    return c.json(
      {
        success: false,
        error: 'Error de validación',
        details: err.flatten().fieldErrors,
        statusCode: 422,
      },
      422,
    )
  }

  // ─── Error no controlado ───────────────────────────────────────
  console.error(`[${timestamp}] UNHANDLED ERROR ${method} ${url}`, err)
  return c.json(
    {
      success: false,
      error: 'Error interno del servidor',
      statusCode: 500,
    },
    500,
  )
}
