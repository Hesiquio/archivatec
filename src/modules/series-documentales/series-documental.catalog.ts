export const SUBDIRECCIONES_SERIES = [
  'Subdirección Administrativa',
  'Subdirección de Planeación y Desarrollo',
  'Subdirección de Extensión y Vinculación',
  'Subdirección Académica de Investigación e Innovación',
] as const

export const SUBDIRECCIONES_SERIES_ALIAS = [
  'Subdirección Académica',
  'Subdirección de Investigación e Innovación',
  'Subdirección de Academia',
  'Subdirección de Servicios Administrativos',
  'Subdirección de Administración',
  'Subdirección de Planeación y Vinculación',
  'Subdirección de Planeación y Vinculación / Desarrollo',
  'Subdirección de Planeación',
  'Subdirección de Extensión',
] as const

const SERIES_POR_SUBDIRECCION: Record<string, readonly string[]> = {
  'Subdirección Académica de Investigación e Innovación': ['3S', '10C'],
  'Subdirección de Planeación y Desarrollo': [
    '1S.01', '1S.02', '1S.03', '1S.04', '1S.05', '1S.06',
    '2S.01', '2S.02', '5S.01', '5S.02', '6C', '7C', '8C', '9C', '10C',
  ],
  'Subdirección Administrativa': ['1C', '2C', '3C', '4C', '10C'],
  'Subdirección de Extensión y Vinculación': ['1S.07', '4S', '5C', '10C'],
  'Subdirección Académica': ['3S'],
  'Subdirección de Investigación e Innovación': ['3S'],
  'Subdirección de Academia': ['3S'],
  'Subdirección de Servicios Administrativos': ['1C', '2C', '3C', '4C', '10C'],
  'Subdirección de Administración': ['1C', '2C', '3C', '4C', '10C'],
  'Subdirección de Planeación y Vinculación': [
    '1S.01', '1S.02', '1S.03', '1S.04', '1S.05', '1S.06',
    '2S.01', '2S.02', '5S.01', '5S.02', '6C', '7C', '8C', '9C', '10C',
  ],
  'Subdirección de Planeación y Vinculación / Desarrollo': ['1S', '2S', '5S'],
  'Subdirección de Planeación': ['1S', '2S', '5S'],
  'Subdirección de Extensión': ['4S'],
}

export const FONDOS_POR_SUBDIRECCION: Readonly<Record<string, { clave: string; nombre: string }>> = {
  'Subdirección de Extensión y Vinculación': {
    clave: '2808',
    nombre: 'Instituto Tecnológico Superior de Escárcega',
  },
}

const SERIES_DOCENCIA_CON_CARRERAS = new Set([
  '3S.01', '3S.02', '3S.03', '3S.04', '3S.05', '3S.06',
  '3S.07', '3S.08', '3S.09', '3S.12', '3S.14', '3S.15',
])

const CARRERAS_DOCENCIA = [
  'Licenciatura en Administración',
  'Ingeniería en Sistemas Computacionales',
  'Ingeniería en Industrias Alimentarias',
  'Gastronomía',
  'Ingeniería en Energías Renovables',
  'Licenciatura en Turismo',
  'Ingeniería en Animación Digital y Efectos Visuales',
  'Contador Público',
  'Licenciatura en Administración Modalidad Mixta',
  'Ingeniería Ferroviaria',
  'Ingeniería en Inteligencia Artificial',
] as const

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
  return SUBDIRECCIONES_SERIES
    .flatMap((subdireccion) => SERIES_POR_SUBDIRECCION[subdireccion]
      .filter((prefijo) => codigo === prefijo || codigo.startsWith(`${prefijo}.`))
      .map((prefijo) => ({ subdireccion, prefijo })))
    .sort((a, b) => b.prefijo.length - a.prefijo.length)[0]?.subdireccion
}

export function obtenerCarreraDocenciaPorCodigo(codigo: string): string | undefined {
  const match = codigo.match(/^(3S\.\d{2})\.(\d{2})$/)
  if (!match || !SERIES_DOCENCIA_CON_CARRERAS.has(match[1])) return undefined

  const offset = match[1] === '3S.14' ? 2 : 1
  const index = Number(match[2]) - offset
  return CARRERAS_DOCENCIA[index]
}

export function categoriaDePrefijo(prefijo: string): 'sustantivas' | 'comunes' | undefined {
  if (!/^\d+[SC]$/.test(prefijo)) return undefined
  return prefijo.endsWith('S') ? 'sustantivas' : 'comunes'
}

export function esPrefijoCatalogado(prefijo: string): boolean {
  return SUBDIRECCIONES_SERIES.some((subdireccion) =>
    SERIES_POR_SUBDIRECCION[subdireccion].some((codigo) =>
      codigo === prefijo || obtenerPrefijoRaiz(codigo) === prefijo,
    ),
  )
}
