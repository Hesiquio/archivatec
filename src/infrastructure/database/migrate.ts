import { db } from './client'
import { sql } from 'drizzle-orm'
import { usuarios } from './schema'
import { eq } from 'drizzle-orm'

/**
 * Ejecuta una sentencia SQL ignorando errores de "ya existe".
 * PGlite usa el campo `code` en el objeto de error para los códigos PostgreSQL.
 */
async function tryExec(statement: string) {
  try {
    await db.execute(sql.raw(statement))
  } catch (e: any) {
    const code: string = e?.code ?? e?.cause?.code ?? ''
    const msg: string = e?.message ?? ''
    // 42710 = duplicate_object, 42P07 = duplicate_table, 42701 = duplicate_column
    const isDuplicate =
      code === '42710' || code === '42P07' || code === '42701' ||
      msg.includes('already exists') || msg.includes('duplicate')
    if (isDuplicate) return
    throw e
  }
}

/**
 * Inicializa el esquema de la base de datos y crea el usuario admin por defecto.
 * Idempotente: puede ejecutarse múltiples veces sin problemas.
 */
export async function initDatabase() {
  console.log('🔧 Inicializando base de datos...')

  // ─── Nota: PGlite no soporta CREATE TYPE AS ENUM ─────────────────────────
  // Se usan VARCHAR(50) directamente en las tablas. El tipado TypeScript
  // se conserva con .$type<> en el schema de Drizzle (schema.ts).

  // ─── Tablas ───────────────────────────────────────────────────────────────
  // IF NOT EXISTS evita que PGlite colapse con Aborted() al re-ejecutar
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre VARCHAR(200) NOT NULL,
      email VARCHAR(200) NOT NULL UNIQUE,
      password_hash VARCHAR(500) NOT NULL,
      rol VARCHAR(50) DEFAULT 'CONSULTA' NOT NULL,
      division VARCHAR(200) DEFAULT '' NOT NULL,
      crear_usuarios BOOLEAN DEFAULT false NOT NULL,
      subir_archivos BOOLEAN DEFAULT true NOT NULL,
      modificar_archivos BOOLEAN DEFAULT true NOT NULL,
      eliminar_archivos BOOLEAN DEFAULT false NOT NULL,
      ver_otras_divisiones BOOLEAN DEFAULT false NOT NULL,
      activo BOOLEAN DEFAULT true NOT NULL,
      creado_en TIMESTAMP DEFAULT NOW() NOT NULL,
      actualizado_en TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `))

  // ─ Migraciones idempotentes para columnas nuevas en BDs existentes ───
  await tryExec(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS division VARCHAR(200) DEFAULT '' NOT NULL`)
  await tryExec(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS crear_usuarios BOOLEAN DEFAULT false NOT NULL`)
  await tryExec(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS subir_archivos BOOLEAN DEFAULT true NOT NULL`)
  await tryExec(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS modificar_archivos BOOLEAN DEFAULT true NOT NULL`)
  await tryExec(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS eliminar_archivos BOOLEAN DEFAULT false NOT NULL`)
  await tryExec(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ver_otras_divisiones BOOLEAN DEFAULT false NOT NULL`)

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS ubicaciones (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      codigo VARCHAR(20) NOT NULL UNIQUE,
      descripcion VARCHAR(200),
      salon VARCHAR(100) NOT NULL,
      estante INTEGER NOT NULL,
      fila INTEGER NOT NULL,
      columna INTEGER NOT NULL,
      capacidad_maxima INTEGER DEFAULT 50 NOT NULL,
      ocupacion_actual INTEGER DEFAULT 0 NOT NULL,
      activo BOOLEAN DEFAULT true NOT NULL,
      creado_en TIMESTAMP DEFAULT NOW() NOT NULL,
      actualizado_en TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `))

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS cajas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      numero_caja VARCHAR(50) NOT NULL UNIQUE,
      descripcion TEXT,
      tipo_documento VARCHAR(50) NOT NULL,
      fecha_inicio TIMESTAMP NOT NULL,
      fecha_fin TIMESTAMP,
      ubicacion_id UUID REFERENCES ubicaciones(id) NOT NULL,
      estado VARCHAR(50) DEFAULT 'ACTIVA' NOT NULL,
      total_expedientes INTEGER DEFAULT 0 NOT NULL,
      observaciones TEXT,
      creado_en TIMESTAMP DEFAULT NOW() NOT NULL,
      actualizado_en TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `))

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS expedientes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      numero_expediente VARCHAR(100) NOT NULL UNIQUE,
      nombre_titular VARCHAR(200) NOT NULL,
      tipo_expediente VARCHAR(50) NOT NULL,
      matricula_o_empleado VARCHAR(50),
      carrera VARCHAR(150),
      fecha_ingreso TIMESTAMP NOT NULL,
      fecha_cierre TIMESTAMP,
      caja_id UUID REFERENCES cajas(id) NOT NULL,
      estado VARCHAR(50) DEFAULT 'ACTIVO' NOT NULL,
      clasificacion_aidlc VARCHAR(100),
      digitalizado_url VARCHAR(1000),
      observaciones TEXT,
      creado_en TIMESTAMP DEFAULT NOW() NOT NULL,
      actualizado_en TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `))

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS prestamos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      expediente_id UUID REFERENCES expedientes(id),
      caja_id UUID REFERENCES cajas(id),
      solicitante_nombre VARCHAR(200) NOT NULL,
      solicitante_matricula VARCHAR(50),
      solicitante_departamento VARCHAR(200) NOT NULL,
      motivo_prestamo TEXT NOT NULL,
      fecha_salida TIMESTAMP DEFAULT NOW() NOT NULL,
      fecha_devolucion_esperada TIMESTAMP NOT NULL,
      fecha_devolucion_real TIMESTAMP,
      autorizado_por_id UUID REFERENCES usuarios(id) NOT NULL,
      estado VARCHAR(50) DEFAULT 'ACTIVO' NOT NULL,
      observaciones TEXT,
      creado_en TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `))

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS digitalizaciones (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      expediente_id UUID REFERENCES expedientes(id) NOT NULL,
      operador_id UUID REFERENCES usuarios(id) NOT NULL,
      equipo_escaner VARCHAR(100),
      resolucion_dpi INTEGER DEFAULT 300 NOT NULL,
      formato_archivo VARCHAR(20) DEFAULT 'PDF_A' NOT NULL,
      total_paginas INTEGER NOT NULL,
      url_archivo VARCHAR(1000) NOT NULL,
      checksum_sha256 VARCHAR(64) NOT NULL,
      estado VARCHAR(50) DEFAULT 'EN_PROCESO' NOT NULL,
      observaciones TEXT,
      creado_en TIMESTAMP DEFAULT NOW() NOT NULL,
      actualizado_en TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `))

  console.log('✅ Esquema de base de datos listo')

  // ─── Seed: usuario admin por defecto ─────────────────────────────────────
  const [existingAdmin] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, 'admin@archivistica.edu.mx'))
    .limit(1)

  if (!existingAdmin) {
    const passwordHash = await Bun.password.hash('Admin@1234!')
    await db.insert(usuarios).values({
      nombre: 'Administrador del Sistema',
      email: 'admin@archivistica.edu.mx',
      passwordHash,
      rol: 'ADMIN',
      division: 'Dirección General',
      crearUsuarios: true,
      subirArchivos: true,
      modificarArchivos: true,
      eliminarArchivos: true,
      verOtrasDivisiones: true,
    })
    console.log('👤 Usuario admin creado: admin@archivistica.edu.mx')
  }

  // ─── Seed: Usuarios Demo para pruebas de RBAC ──────────────────────────────
  const defaultPass = await Bun.password.hash('Password@123')

  // 1. jgarcia (Administrador)
  const [existingJGarcia] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, 'jgarcia@itse.edu.mx')).limit(1)
  if (!existingJGarcia) {
    await db.insert(usuarios).values({
      nombre: 'Jesús García López',
      email: 'jgarcia@itse.edu.mx',
      passwordHash: defaultPass,
      rol: 'ADMIN',
      division: 'Dirección General',
      crearUsuarios: true,
      subirArchivos: true,
      modificarArchivos: true,
      eliminarArchivos: true,
      verOtrasDivisiones: true,
    })
    console.log('👤 Usuario semilla creado: jgarcia@itse.edu.mx (ADMIN)')
  }

  // 2. rmendez (Gestor de Archivos)
  const [existingRMendez] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, 'rmendez@itse.edu.mx')).limit(1)
  if (!existingRMendez) {
    await db.insert(usuarios).values({
      nombre: 'Rosa Méndez Juárez',
      email: 'rmendez@itse.edu.mx',
      passwordHash: defaultPass,
      rol: 'ARCHIVISTA',
      division: 'Subdirección de Academia',
      crearUsuarios: false,
      subirArchivos: true,
      modificarArchivos: true,
      eliminarArchivos: false,
      verOtrasDivisiones: true,
    })
    console.log('👤 Usuario semilla creado: rmendez@itse.edu.mx (Gestor)')
  }

  // 3. aperez (Usuario de Consulta)
  const [existingAPerez] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, 'aperez@itse.edu.mx')).limit(1)
  if (!existingAPerez) {
    await db.insert(usuarios).values({
      nombre: 'Ana Pérez Castillo',
      email: 'aperez@itse.edu.mx',
      passwordHash: defaultPass,
      rol: 'CONSULTA',
      division: 'Subdirección de Extensión',
      crearUsuarios: false,
      subirArchivos: false,
      modificarArchivos: false,
      eliminarArchivos: false,
      verOtrasDivisiones: true,
    })
    console.log('👤 Usuario semilla creado: aperez@itse.edu.mx (Consulta)')
  }

  // 4. chernandez (Gestor de Archivos)
  const [existingCHernandez] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, 'chernandez@itse.edu.mx')).limit(1)
  if (!existingCHernandez) {
    await db.insert(usuarios).values({
      nombre: 'Carlos Hernández Ruiz',
      email: 'chernandez@itse.edu.mx',
      passwordHash: defaultPass,
      rol: 'ARCHIVISTA',
      division: 'Subdirección de Administración',
      crearUsuarios: false,
      subirArchivos: true,
      modificarArchivos: true,
      eliminarArchivos: false,
      verOtrasDivisiones: true,
    })
    console.log('👤 Usuario semilla creado: chernandez@itse.edu.mx (Gestor)')
  }
}
