import { expect, test } from 'bun:test'
import { deriveFileName, sanitizeStorageFileName } from './file-name'

test('removes accents, whitespace, parentheses, and special characters', () => {
  expect(sanitizeStorageFileName('Revisión de Archivo (final)_v.2.PDF'))
    .toBe('RevisiondeArchivofinalv2.pdf')
})

test('uses a safe fallback when the name has no usable characters', () => {
  expect(sanitizeStorageFileName('()._')).toBe('archivo')
})

test('removes unique storage prefixes from current and legacy file names', () => {
  expect(deriveFileName('https://storage.example.test/digitalizados/1700000000000-550e8400-e29b-41d4-a716-446655440000-acta.pdf'))
    .toBe('acta.pdf')
  expect(deriveFileName('https://storage.example.test/digitalizados/1700000000000-acta.pdf'))
    .toBe('acta.pdf')
})
