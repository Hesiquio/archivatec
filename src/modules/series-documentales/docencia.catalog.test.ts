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
