import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

const catalogSource = readFileSync(new URL('../../../public/catalog.js', import.meta.url), 'utf8')
const { FUNCIONES_SUSTANTIVAS, CARRERAS_DOCENCIA } = JSON.parse(JSON.stringify(runInNewContext(
  `${catalogSource}\n;({ FUNCIONES_SUSTANTIVAS, CARRERAS_DOCENCIA })`,
))) as {
  FUNCIONES_SUSTANTIVAS: CatalogNode[]
  CARRERAS_DOCENCIA: string[]
}

type CatalogNode = {
  code: string
  name: string
  directUploadTitle?: string
  children?: CatalogNode[]
}

const docencia = FUNCIONES_SUSTANTIVAS.find((section) => section.code === '3S')
const seriesConCarreras = [
  '3S.01', '3S.02', '3S.03', '3S.04', '3S.05', '3S.06',
  '3S.07', '3S.08', '3S.09', '3S.12', '3S.14', '3S.15',
]

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
