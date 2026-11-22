import { Hono } from 'hono'
import { digitalizacionService } from './digitalizacion.service'
import {
  DigitalizacionSchema,
  ActualizarEstadoSchema,
  DigitalizacionQuerySchema,
  PrepararSubidaSchema,
  CompletarSubidaSchema,
  type DigitalizacionDTO,
  type ActualizarEstadoDTO,
  type DigitalizacionQueryDTO,
  type PrepararSubidaDTO,
  type CompletarSubidaDTO,
} from './digitalizacion.schema'
import { validateBody, validateQuery } from '../../middleware/validator.middleware'
import { authMiddleware } from '../../middleware/auth.middleware'
import { requirePermission, requireRole } from '../../middleware/rbac.middleware'
import { HTTPException } from 'hono/http-exception'

import { storageService } from '../../infrastructure/storage/supabase-storage'
import { sanitizeStorageFileName } from '../../infrastructure/storage/file-name'
import { env } from '../../config/env'
import { randomUUID } from 'node:crypto'

export const digitalizacionRoutes = new Hono()

digitalizacionRoutes.use('*', authMiddleware)

// Listar todas las digitalizaciones (con filtros opcionales)
digitalizacionRoutes.get('/', validateQuery(DigitalizacionQuerySchema), async (c) => {
  const query = c.req.valid('query') as DigitalizacionQueryDTO
  const result = await digitalizacionService.listar(query)
  return c.json({ success: true, ...result })
})

// Obtener digitalizaciones de un expediente específico
digitalizacionRoutes.get('/expediente/:expedienteId', async (c) => {
  const result = await digitalizacionService.obtenerPorExpediente(c.req.param('expedienteId'))
  return c.json({ success: true, data: result })
})

// Obtener una digitalización por ID
digitalizacionRoutes.get('/:id', async (c) => {
  const result = await digitalizacionService.obtenerPorId(c.req.param('id'))
  return c.json({ success: true, data: result })
})

// Emitir una URL temporal para subir directamente a Supabase Storage sin
// transportar el contenido del PDF por la función serverless de Vercel.
digitalizacionRoutes.post(
  '/upload-url/:expedienteId',
  requireRole('DIGITALIZADOR', 'ARCHIVISTA', 'ADMIN'),
  requirePermission('subirArchivos'),
  validateBody(PrepararSubidaSchema),
  async (c) => {
    const body = c.req.valid('json') as PrepararSubidaDTO
    const expedienteId = c.req.param('expedienteId')
    if (!/^[A-Za-z0-9.-]{1,100}$/.test(expedienteId)) {
      throw new HTTPException(422, { message: 'El identificador del expediente no es válido para Storage' })
    }

    const safeFileName = sanitizeStorageFileName(body.fileName)
    const uniquePrefix = `${Date.now()}-${randomUUID()}-`
    const fileStem = safeFileName.slice(0, -4).slice(0, 187)
    const path = `digitalizados/${expedienteId}/${uniquePrefix}${fileStem}.pdf`

    try {
      const token = await storageService.createSignedUploadUrl(env.STORAGE_BUCKET, path)
      return c.json({
        success: true,
        data: { bucket: env.STORAGE_BUCKET, path, token },
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Error desconocido'
      console.error('Error al crear URL firmada de Supabase Storage:', error)
      throw new HTTPException(502, {
        message: `No se pudo preparar la subida en el bucket "${env.STORAGE_BUCKET}": ${detail}`,
      })
    }
  },
)

// Registrar los metadatos cuando el cliente confirma que Storage recibió el PDF.
digitalizacionRoutes.post(
  '/upload/:expedienteId',
  requireRole('DIGITALIZADOR', 'ARCHIVISTA', 'ADMIN'),
  requirePermission('subirArchivos'),
  validateBody(CompletarSubidaSchema),
  async (c) => {
    const { path, checksumSha256 } = c.req.valid('json') as CompletarSubidaDTO
    const expedienteId = c.req.param('expedienteId')
    const user = c.get('user')

    if (!path.startsWith(`digitalizados/${expedienteId}/`)) {
      throw new HTTPException(422, { message: 'El archivo no corresponde a la carpeta seleccionada' })
    }

    let archivoExiste: boolean
    let publicUrl: string
    try {
      archivoExiste = await storageService.fileExists(env.STORAGE_BUCKET, path)
      publicUrl = storageService.getPublicUrl(env.STORAGE_BUCKET, path)
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Error desconocido'
      console.error('Error al verificar el PDF en Supabase Storage:', error)
      throw new HTTPException(502, {
        message: `No se pudo verificar el archivo en el bucket "${env.STORAGE_BUCKET}": ${detail}`,
      })
    }

    if (!archivoExiste) {
      throw new HTTPException(422, { message: 'El PDF todavía no existe en Supabase Storage; vuelve a intentar la subida' })
    }

    const result = await digitalizacionService.iniciar({
      expedienteId,
      urlArchivo: publicUrl,
      totalPaginas: 1,
      checksumSha256,
      resolucionDpi: 300,
      formatoArchivo: 'PDF',
    }, user.sub)

    return c.json({ success: true, data: result }, 201)
  },
)

// Iniciar una nueva digitalización (Crea el registro y asocia al expediente)
digitalizacionRoutes.post(
  '/',
  requireRole('DIGITALIZADOR', 'ARCHIVISTA', 'ADMIN'),
  validateBody(DigitalizacionSchema),
  async (c) => {
    const body = c.req.valid('json') as DigitalizacionDTO
    const user = c.get('user')
    const result = await digitalizacionService.iniciar(body, user.sub)
    return c.json({ success: true, data: result }, 201)
  },
)

// Eliminar una digitalización y su archivo físico (si aplica)
digitalizacionRoutes.delete('/:id', requireRole('ADMIN', 'ARCHIVISTA'), async (c) => {
  const result = await digitalizacionService.eliminar(c.req.param('id'))
  return c.json({ success: true, data: result })
})

// Actualizar estado de digitalización
digitalizacionRoutes.patch(
  '/:id/estado',
  requireRole('DIGITALIZADOR', 'ARCHIVISTA', 'ADMIN'),
  validateBody(ActualizarEstadoSchema),
  async (c) => {
    const body = c.req.valid('json') as ActualizarEstadoDTO
    const result = await digitalizacionService.actualizarEstado(c.req.param('id'), body)
    return c.json({ success: true, data: result })
  },
)
