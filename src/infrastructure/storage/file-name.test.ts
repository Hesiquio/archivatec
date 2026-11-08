import { expect, test } from 'bun:test'
import { sanitizeStorageFileName } from './file-name'

test('removes accents, whitespace, parentheses, and special characters', () => {
  expect(sanitizeStorageFileName('Revisión de Archivo (final)_v.2.PDF'))
    .toBe('RevisiondeArchivofinalv2.pdf')
})

test('uses a safe fallback when the name has no usable characters', () => {
  expect(sanitizeStorageFileName('()._')).toBe('archivo')
})
