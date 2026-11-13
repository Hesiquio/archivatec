export const SUBDIRECCIONES_SERIES = [
  'Subdirección Académica',
  'Subdirección de Servicios Administrativos',
  'Subdirección de Planeación y Vinculación',
  'Subdirección de Extensión y Vinculación',
] as const

export const SUBDIRECCIONES_SERIES_ALIAS = [
  'Subdirección de Investigación e Innovación',
  'Subdirección de Academia',
  'Subdirección de Administración',
  'Subdirección de Planeación y Vinculación / Desarrollo',
  'Subdirección de Planeación y Desarrollo',
  'Subdirección de Planeación',
  'Subdirección de Extensión',
] as const

const SERIES_POR_SUBDIRECCION: Record<string, readonly string[]> = {
  'Subdirección Académica': ['3S'],
  'Subdirección de Investigación e Innovación': ['3S'],
  'Subdirección de Academia': ['3S'],
  'Subdirección de Servicios Administrativos': ['1C', '2C', '3C', '4C', '5C', '6C', '7C', '8C', '9C', '10C'],
  'Subdirección de Administración': ['1C', '2C', '3C', '4C', '5C', '6C', '7C', '8C', '9C', '10C'],
  'Subdirección de Planeación y Vinculación': ['1S', '2S', '5S'],
  'Subdirección de Planeación y Vinculación / Desarrollo': ['1S', '2S', '5S'],
  'Subdirección de Planeación y Desarrollo': ['1S', '2S', '5S'],
  'Subdirección de Planeación': ['1S', '2S', '5S'],
  'Subdirección de Extensión y Vinculación': ['4S'],
  'Subdirección de Extensión': ['4S'],
}

export type SubdireccionSerie = typeof SUBDIRECCIONES_SERIES[number]

export function getPrefijosPermitidos(subdireccion: string): readonly string[] | undefined {
  return Object.prototype.hasOwnProperty.call(SERIES_POR_SUBDIRECCION, subdireccion)
    ? SERIES_POR_SUBDIRECCION[subdireccion]
    : undefined
}

export function obtenerPrefijoRaiz(codigo: string): string | undefined {
  return codigo.match(/^(\d+[SC])(?:\.|$)/)?.[1]
}

export function obtenerSubdireccionPorCodigo(codigo: string): SubdireccionSerie | undefined {
  const prefijo = obtenerPrefijoRaiz(codigo)
  return SUBDIRECCIONES_SERIES.find((subdireccion) =>
    SERIES_POR_SUBDIRECCION[subdireccion].includes(prefijo || ''),
  )
}

export function categoriaDePrefijo(prefijo: string): 'sustantivas' | 'comunes' | undefined {
  if (!/^\d+[SC]$/.test(prefijo)) return undefined
  return prefijo.endsWith('S') ? 'sustantivas' : 'comunes'
}

export function esPrefijoCatalogado(prefijo: string): boolean {
  return SUBDIRECCIONES_SERIES.some((subdireccion) =>
    SERIES_POR_SUBDIRECCION[subdireccion].includes(prefijo),
  )
}
