import { expect, test } from 'bun:test'
import {
  categoriaDePrefijo,
  esPrefijoCatalogado,
  FONDOS_POR_SUBDIRECCION,
  getPrefijosPermitidos,
  obtenerCarreraDocenciaPorCodigo,
  obtenerPrefijoRaiz,
  obtenerSubdireccionPorCodigo,
} from './series-documental.catalog'

test('maps each subdirection to only its authorized catalog roots', () => {
  expect(getPrefijosPermitidos('Subdirección Académica')).toEqual(['3S'])
  expect(getPrefijosPermitidos('Subdirección de Servicios Administrativos')).toEqual([
    '1C', '2C', '3C', '4C', '5C', '6C', '7C', '8C', '9C', '10C',
  ])
  expect(getPrefijosPermitidos('Subdirección de Planeación y Vinculación')).toEqual(['1S', '2S', '5S'])
  expect(getPrefijosPermitidos('Subdirección de Extensión y Vinculación')).toEqual([
    '1S.07', '4S', '5C', '10C',
  ])
  expect(getPrefijosPermitidos('Subdirección de Planeación y Vinculación / Desarrollo')).toEqual(['1S', '2S', '5S'])
})

test('assigns codes by their complete root prefix and derives the category', () => {
  expect(obtenerSubdireccionPorCodigo('3S.14.01')).toBe('Subdirección Académica')
  expect(obtenerSubdireccionPorCodigo('1S.07.01')).toBe('Subdirección de Extensión y Vinculación')
  expect(obtenerSubdireccionPorCodigo('10C.01.01')).toBe('Subdirección de Servicios Administrativos')
  expect(obtenerSubdireccionPorCodigo('5S.02')).toBe('Subdirección de Planeación y Vinculación')
  expect(categoriaDePrefijo('4S')).toBe('sustantivas')
  expect(categoriaDePrefijo('10C')).toBe('comunes')
  expect(esPrefijoCatalogado('6C')).toBe(true)
  expect(esPrefijoCatalogado('6S')).toBe(false)
})

test('allows extension to list both substantive and common prefixes', () => {
  const prefixes = getPrefijosPermitidos('Subdirección de Extensión y Vinculación')
  expect(prefixes?.map((prefix) => categoriaDePrefijo(obtenerPrefijoRaiz(prefix) || prefix))).toEqual([
    'sustantivas', 'sustantivas', 'comunes', 'comunes',
  ])
  expect(FONDOS_POR_SUBDIRECCION['Subdirección de Extensión y Vinculación']).toEqual({
    clave: '2808',
    nombre: 'Instituto Tecnológico Superior de Escárcega',
  })
})

test('maps only configured Docencia career subseries to their career', () => {
  expect(obtenerCarreraDocenciaPorCodigo('3S.01.01')).toBe('Licenciatura en Administración')
  expect(obtenerCarreraDocenciaPorCodigo('3S.14.02')).toBe('Licenciatura en Administración')
  expect(obtenerCarreraDocenciaPorCodigo('3S.14.12')).toBe('Ingeniería en Inteligencia Artificial')
  expect(obtenerCarreraDocenciaPorCodigo('3S.14.01')).toBeUndefined()
  expect(obtenerCarreraDocenciaPorCodigo('3S.10.01')).toBeUndefined()
  expect(obtenerCarreraDocenciaPorCodigo('3S.15.12')).toBeUndefined()
})
