import { expect, test } from 'bun:test'
import { CompletarSubidaSchema, PrepararSubidaSchema } from './digitalizacion.schema'

test('validates PDF upload requests and rejects non-PDF filenames', () => {
  expect(PrepararSubidaSchema.safeParse({
    fileName: 'Acta de academia.PDF',
    contentType: 'application/pdf',
  }).success).toBe(true)

  expect(PrepararSubidaSchema.safeParse({
    fileName: 'archivo.exe',
    contentType: 'application/pdf',
  }).success).toBe(false)
})

test('accepts only generated Storage paths and a hexadecimal SHA-256 checksum', () => {
  expect(CompletarSubidaSchema.safeParse({
    path: 'digitalizados/3S.14.01/1700000000000-550e8400-e29b-41d4-a716-446655440000-actadeacademia.pdf',
    checksumSha256: 'a'.repeat(64),
  }).success).toBe(true)

  expect(CompletarSubidaSchema.safeParse({
    path: 'digitalizados/3S.14.01/../../outside.pdf',
    checksumSha256: 'not-a-checksum',
  }).success).toBe(false)
})
