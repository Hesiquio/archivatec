import { expect, test } from 'bun:test'
import {
  SerieDocumentalQuerySchema,
  SerieDocumentalSchema,
  SerieDocumentalUpdateSchema,
} from './series-documental.schema'

test('validates and normalizes required creation fields', () => {
  const result = SerieDocumentalSchema.safeParse({
    codigo: ' 1S.90 ',
    nombre: ' Serie de prueba ',
    categoria: 'sustantivas',
    codigoPadre: ' 1S ',
    encargadoId: '00000000-0000-0000-0000-000000000001',
  })

  expect(result.success).toBe(true)
  if (result.success) {
    expect(result.data).toMatchObject({
      codigo: '1S.90',
      nombre: 'Serie de prueba',
      codigoPadre: '1S',
    })
  }
})

test('rejects invalid codes, categories, and encargado IDs', () => {
  const result = SerieDocumentalSchema.safeParse({
    codigo: '1S.90<script>',
    nombre: 'Serie de prueba',
    categoria: 'otra',
    encargadoId: 'not-a-uuid',
  })

  expect(result.success).toBe(false)
})

test('supports server-side search and pagination defaults', () => {
  expect(SerieDocumentalQuerySchema.parse({ buscar: ' Archivo ' })).toEqual({
    buscar: 'Archivo',
    page: 1,
    limit: 100,
  })
})

test('allows clearing the encargado while editing', () => {
  expect(SerieDocumentalUpdateSchema.parse({ encargadoId: null })).toEqual({ encargadoId: null })
})
