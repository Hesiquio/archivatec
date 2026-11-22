import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

const catalogSource = readFileSync(new URL('../../../public/catalog.js', import.meta.url), 'utf8')
const catalogContext = runInNewContext(
  `${catalogSource}\n;({ FUNCIONES_SUSTANTIVAS, FUNCIONES_COMUNES, SERIES_POR_SUBDIRECCION, CARRERAS_DOCENCIA, obtenerHijosNodo })`,
)
const { FUNCIONES_SUSTANTIVAS, FUNCIONES_COMUNES, SERIES_POR_SUBDIRECCION, CARRERAS_DOCENCIA } =
  JSON.parse(JSON.stringify(catalogContext)) as {
  FUNCIONES_SUSTANTIVAS: CatalogNode[]
  FUNCIONES_COMUNES: CatalogNode[]
  SERIES_POR_SUBDIRECCION: Record<string, string[]>
  CARRERAS_DOCENCIA: string[]
}
const obtenerHijosNodo = (node: CatalogNode) =>
  JSON.parse(JSON.stringify(catalogContext.obtenerHijosNodo(node))) as CatalogNode[]

type CatalogNode = {
  code: string
  name: string
  directUploadTitle?: string
  year?: number
  children?: CatalogNode[]
}

const docencia = FUNCIONES_SUSTANTIVAS.find((section) => section.code === '3S')
const seriesConCarreras = [
  '3S.01', '3S.02', '3S.03', '3S.04', '3S.05', '3S.06',
  '3S.07', '3S.08', '3S.09', '3S.12', '3S.14', '3S.15',
]

test('preserves both function catalogs and all configured subdirections', () => {
  expect(FUNCIONES_SUSTANTIVAS.map((item) => item.code)).toEqual(['1S', '2S', '3S', '4S', '5S'])
  expect(FUNCIONES_COMUNES.map((item) => item.code)).toEqual([
    '1C', '2C', '3C', '4C', '5C', '6C', '7C', '8C', '9C', '10C',
  ])
  expect(SERIES_POR_SUBDIRECCION).toEqual({
    'Subdirección Académica': ['3S'],
    'Subdirección de Servicios Administrativos': ['1C', '2C', '3C', '4C', '5C', '6C', '7C', '8C', '9C', '10C'],
    'Subdirección de Planeación y Vinculación': ['1S', '2S', '5S'],
    'Subdirección de Extensión y Vinculación': ['4S'],
  })
})

test('keeps each subdirection connected to its substantive or common function roots', () => {
  for (const prefijos of Object.values(SERIES_POR_SUBDIRECCION)) {
    const rootCodes = (roots: CatalogNode[]) => roots
      .filter((root) => prefijos.some((prefijo) =>
        root.code === prefijo || root.code.startsWith(`${prefijo}.`),
      ))
      .map((root) => root.code)

    expect(rootCodes(FUNCIONES_SUSTANTIVAS)).toEqual(prefijos.filter((code) => code.endsWith('S')))
    expect(rootCodes(FUNCIONES_COMUNES)).toEqual(prefijos.filter((code) => code.endsWith('C')))
    expect(rootCodes(FUNCIONES_SUSTANTIVAS).length + rootCodes(FUNCIONES_COMUNES).length)
      .toBeGreaterThan(0)
  }
})

test('adds the 11 career folders only to the requested Docencia series', () => {
  expect(docencia).toBeDefined()
  const series = docencia!.children || []

  expect(series.filter((item) => item.children?.map((child) => child.name).join('|') === CARRERAS_DOCENCIA.join('|'))
    .map((item) => item.code)).toEqual(seriesConCarreras.filter((code) => code !== '3S.14'))

  for (const code of seriesConCarreras.filter((item) => item !== '3S.14')) {
    const item = series.find((candidate) => candidate.code === code)
    expect(item?.children?.map((child) => child.name)).toEqual(CARRERAS_DOCENCIA)
  }
})

test('keeps direct course-management documents separate from projects and career folders', () => {
  const gestion = docencia?.children?.find((item) => item.code === '3S.14')
  expect(gestion?.directUploadTitle).toBe('Información general de gestión del curso')
  expect(gestion?.children?.[0]).toEqual({ code: '3S.14.01', name: 'Proyectos Individuales' })
  expect(gestion?.children?.slice(1).map((child) => child.name)).toEqual(CARRERAS_DOCENCIA)
  expect(gestion?.children?.slice(1).map((child) => child.code)).toEqual(
    CARRERAS_DOCENCIA.map((_, index) => `3S.14.${String(index + 2).padStart(2, '0')}`),
  )
})

test('resolves Docencia subfolders by code even when a node has no children', () => {
  const series = docencia?.children || []

  for (const year of Array.from({ length: 11 }, (_, index) => 2016 + index)) {
    for (const code of seriesConCarreras) {
      const node = series.find((item) => item.code === code)
      expect(node).toBeDefined()

      const children = obtenerHijosNodo({ ...node!, children: undefined, year })
      if (code === '3S.14') {
        expect(children[0]).toEqual({ code: '3S.14.01', name: 'Proyectos Individuales' })
        expect(children.slice(1).map((child) => child.name)).toEqual(CARRERAS_DOCENCIA)
        continue
      }

      expect(children.map((child) => child.name)).toEqual(CARRERAS_DOCENCIA)
    }
  }
})

test('preserves all series and subseries in substantive and common function catalogs', () => {
  const getCodes = (nodes?: CatalogNode[]) => (nodes || []).map((n) => n.code)

  const s1 = FUNCIONES_SUSTANTIVAS.find((n) => n.code === '1S')
  expect(getCodes(s1?.children)).toEqual(['1S.01', '1S.02', '1S.03', '1S.04', '1S.05', '1S.06', '1S.07'])
  const s107 = s1?.children?.find((n) => n.code === '1S.07')
  expect(getCodes(s107?.children)).toHaveLength(12)

  const s2 = FUNCIONES_SUSTANTIVAS.find((n) => n.code === '2S')
  expect(getCodes(s2?.children)).toEqual(['2S.01', '2S.02'])
  const s201 = s2?.children?.find((n) => n.code === '2S.01')
  expect(getCodes(s201?.children)).toHaveLength(13)

  const s3 = FUNCIONES_SUSTANTIVAS.find((n) => n.code === '3S')
  expect(getCodes(s3?.children)).toHaveLength(20)

  const s4 = FUNCIONES_SUSTANTIVAS.find((n) => n.code === '4S')
  expect(getCodes(s4?.children)).toEqual(['4S.01', '4S.02', '4S.03', '4S.04', '4S.05'])
  const s403 = s4?.children?.find((n) => n.code === '4S.03')
  expect(getCodes(s403?.children)).toHaveLength(12)

  const s5 = FUNCIONES_SUSTANTIVAS.find((n) => n.code === '5S')
  expect(getCodes(s5?.children)).toEqual(['5S.01', '5S.02'])

  expect(FUNCIONES_COMUNES.map((n) => n.code)).toEqual([
    '1C', '2C', '3C', '4C', '5C', '6C', '7C', '8C', '9C', '10C',
  ])
  const c1 = FUNCIONES_COMUNES.find((n) => n.code === '1C')
  expect(getCodes(c1?.children)).toEqual(['1C.01'])

  const c2 = FUNCIONES_COMUNES.find((n) => n.code === '2C')
  expect(getCodes(c2?.children)).toEqual(['2C.01', '2C.02', '2C.03', '2C.04', '2C.05', '2C.06', '2C.07'])

  const c3 = FUNCIONES_COMUNES.find((n) => n.code === '3C')
  expect(getCodes(c3?.children)).toEqual(['3C.01', '3C.02', '3C.03', '3C.04', '3C.05', '3C.06', '3C.07'])

  const c4 = FUNCIONES_COMUNES.find((n) => n.code === '4C')
  expect(getCodes(c4?.children)).toEqual(['4C.01'])

  const c5 = FUNCIONES_COMUNES.find((n) => n.code === '5C')
  expect(getCodes(c5?.children)).toEqual(['5C.01'])

  const c6 = FUNCIONES_COMUNES.find((n) => n.code === '6C')
  expect(getCodes(c6?.children)).toEqual(['6C.01', '6C.02', '6C.03'])

  const c7 = FUNCIONES_COMUNES.find((n) => n.code === '7C')
  expect(getCodes(c7?.children)).toEqual(['7C.01', '7C.02', '7C.03', '7C.04', '7C.05'])

  const c8 = FUNCIONES_COMUNES.find((n) => n.code === '8C')
  expect(getCodes(c8?.children)).toEqual(['8C.01', '8C.02', '8C.03', '8C.04'])

  const c9 = FUNCIONES_COMUNES.find((n) => n.code === '9C')
  expect(getCodes(c9?.children)).toEqual(['9C.01'])

  const c10 = FUNCIONES_COMUNES.find((n) => n.code === '10C')
  expect(getCodes(c10?.children)).toEqual(['10C.01'])
})

