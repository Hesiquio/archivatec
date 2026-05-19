import { PGlite } from '@electric-sql/pglite'
import { drizzle as drizzlePGlite } from 'drizzle-orm/pglite'
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { mkdirSync } from 'fs'
import { env } from '../../config/env'
import * as schema from './schema'

function createDb() {
  // Modo desarrollo sin BD real → PGlite (PostgreSQL embebido en proceso)
  if (env.NODE_ENV === 'development' && env.DATABASE_URL.includes('localhost')) {
    console.log('🗄️  Usando PGlite (PostgreSQL embebido) en modo desarrollo')
    // Crear el directorio padre si no existe (requerido por PGlite/NodeFS)
    mkdirSync('./data', { recursive: true })
    const client = new PGlite('./data/archivistica.db')
    // pgcrypto habilita gen_random_uuid() en PGlite (no viene activo por defecto)
    client.exec('CREATE EXTENSION IF NOT EXISTS pgcrypto;').catch(() => {})
    return drizzlePGlite(client, { schema })
  }

  // Producción o BD real → postgres-js con pool de conexiones
  const queryClient = postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  })
  return drizzlePostgres(queryClient, { schema })
}

export const db = createDb()
export type DB = typeof db
