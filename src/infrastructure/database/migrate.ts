import { db } from './client'
import { sql } from 'drizzle-orm'
import { usuarios, ubicaciones, cajas, expedientes } from './schema'
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

  // ─── Seed: Ubicaciones de ejemplo ─────────────────────────────────────────
  const [existingUbic1] = await db.select({ id: ubicaciones.id }).from(ubicaciones).where(eq(ubicaciones.codigo, 'A-01')).limit(1)
  let ubic1Id = existingUbic1?.id
  if (!ubic1Id) {
    const [inserted] = await db.insert(ubicaciones).values({
      codigo: 'A-01',
      descripcion: 'Estantería Principal - Sección Académica',
      salon: 'Edificio A - Planta Alta',
      estante: 1,
      fila: 1,
      columna: 1,
      capacidadMaxima: 50,
      ocupacionActual: 0,
    }).returning({ id: ubicaciones.id })
    ubic1Id = inserted.id
    console.log('📍 Ubicación semilla creada: A-01')
  }

  const [existingUbic2] = await db.select({ id: ubicaciones.id }).from(ubicaciones).where(eq(ubicaciones.codigo, 'B-02')).limit(1)
  let ubic2Id = existingUbic2?.id
  if (!ubic2Id) {
    const [inserted] = await db.insert(ubicaciones).values({
      codigo: 'B-02',
      descripcion: 'Archivo Pasillo B - Recursos Humanos',
      salon: 'Edificio B - Archivo General',
      estante: 2,
      fila: 3,
      columna: 1,
      capacidadMaxima: 50,
      ocupacionActual: 0,
    }).returning({ id: ubicaciones.id })
    ubic2Id = inserted.id
    console.log('📍 Ubicación semilla creada: B-02')
  }

  const [existingUbic3] = await db.select({ id: ubicaciones.id }).from(ubicaciones).where(eq(ubicaciones.codigo, 'C-05')).limit(1)
  let ubic3Id = existingUbic3?.id
  if (!ubic3Id) {
    const [inserted] = await db.insert(ubicaciones).values({
      codigo: 'C-05',
      descripcion: 'Bóveda de Finanzas y Control Presupuestal',
      salon: 'Edificio C - Planta Baja',
      estante: 5,
      fila: 2,
      columna: 3,
      capacidadMaxima: 30,
      ocupacionActual: 0,
    }).returning({ id: ubicaciones.id })
    ubic3Id = inserted.id
    console.log('📍 Ubicación semilla creada: C-05')
  }

  // ─── Seed: Cajas de ejemplo ───────────────────────────────────────────────
  const [existingCaja1] = await db.select({ id: cajas.id }).from(cajas).where(eq(cajas.numeroCaja, '2026-ISC')).limit(1)
  let caja1Id = existingCaja1?.id
  if (!caja1Id) {
    const [inserted] = await db.insert(cajas).values({
      numeroCaja: '2026-ISC',
      descripcion: 'Expedientes de Alumnos - Ing. Sistemas Computacionales',
      tipoDocumento: 'ACADEMICO',
      fechaInicio: new Date('2026-01-10T00:00:00.000Z'),
      ubicacionId: ubic1Id,
      estado: 'ACTIVA',
      totalExpedientes: 0,
    }).returning({ id: cajas.id })
    caja1Id = inserted.id
    console.log('📦 Caja semilla creada: 2026-ISC')
    
    // Incrementar ocupacion de ubicacion A-01
    await db.execute(sql.raw(`UPDATE ubicaciones SET ocupacion_actual = ocupacion_actual + 1 WHERE id = '${ubic1Id}'`))
  }

  const [existingCaja2] = await db.select({ id: cajas.id }).from(cajas).where(eq(cajas.numeroCaja, '2026-ADM')).limit(1)
  let caja2Id = existingCaja2?.id
  if (!caja2Id) {
    const [inserted] = await db.insert(cajas).values({
      numeroCaja: '2026-ADM',
      descripcion: 'Documentos de Control y Expedientes de Personal',
      tipoDocumento: 'PERSONAL',
      fechaInicio: new Date('2026-01-15T00:00:00.000Z'),
      ubicacionId: ubic2Id,
      estado: 'ACTIVA',
      totalExpedientes: 0,
    }).returning({ id: cajas.id })
    caja2Id = inserted.id
    console.log('📦 Caja semilla creada: 2026-ADM')

    // Incrementar ocupacion de ubicacion B-02
    await db.execute(sql.raw(`UPDATE ubicaciones SET ocupacion_actual = ocupacion_actual + 1 WHERE id = '${ubic2Id}'`))
  }

  const [existingCaja3] = await db.select({ id: cajas.id }).from(cajas).where(eq(cajas.numeroCaja, '2026-FIN')).limit(1)
  let caja3Id = existingCaja3?.id
  if (!caja3Id) {
    const [inserted] = await db.insert(cajas).values({
      numeroCaja: '2026-FIN',
      descripcion: 'Pólizas Contables, Comprobantes y Conciliaciones 2025',
      tipoDocumento: 'FINANCIERO',
      fechaInicio: new Date('2025-01-01T00:00:00.000Z'),
      fechaFin: new Date('2025-12-31T00:00:00.000Z'),
      ubicacionId: ubic3Id,
      estado: 'ACTIVA',
      totalExpedientes: 0,
    }).returning({ id: cajas.id })
    caja3Id = inserted.id
    console.log('📦 Caja semilla creada: 2026-FIN')

    // Incrementar ocupacion de ubicacion C-05
    await db.execute(sql.raw(`UPDATE ubicaciones SET ocupacion_actual = ocupacion_actual + 1 WHERE id = '${ubic3Id}'`))
  }

  // ─── Seed: Expedientes de ejemplo ─────────────────────────────────────────
  const [existingExp1] = await db.select({ id: expedientes.id }).from(expedientes).where(eq(expedientes.numeroExpediente, '20260045')).limit(1)
  if (!existingExp1) {
    await db.insert(expedientes).values({
      numeroExpediente: '20260045',
      nombreTitular: 'Carlos Daniel Gómez Pech',
      tipoExpediente: 'ALUMNO',
      matriculaOEmpleado: '20260045',
      carrera: 'Ingeniería en Sistemas Computacionales',
      fechaIngreso: new Date('2026-02-01T00:00:00.000Z'),
      cajaId: caja1Id,
      estado: 'ACTIVO',
      clasificacionAIDLC: '2S.01.02', // Administración escolar - Inscripción ISC
      observaciones: 'Expediente escolar digitalizado en proceso.',
    })
    console.log('📂 Expediente semilla creado: Carlos Daniel Gómez Pech')

    // Incrementar total_expedientes de caja 2026-ISC
    await db.execute(sql.raw(`UPDATE cajas SET total_expedientes = total_expedientes + 1 WHERE id = '${caja1Id}'`))
  }

  const [existingExp2] = await db.select({ id: expedientes.id }).from(expedientes).where(eq(expedientes.numeroExpediente, '20260089')).limit(1)
  if (!existingExp2) {
    await db.insert(expedientes).values({
      numeroExpediente: '20260089',
      nombreTitular: 'Sofía Alejandra Chan May',
      tipoExpediente: 'ALUMNO',
      matriculaOEmpleado: '20260089',
      carrera: 'Ingeniería en Sistemas Computacionales',
      fechaIngreso: new Date('2026-02-05T00:00:00.000Z'),
      cajaId: caja1Id,
      estado: 'ACTIVO',
      clasificacionAIDLC: '2S.01.02',
      observaciones: 'Expediente completo.',
    })
    console.log('📂 Expediente semilla creado: Sofía Alejandra Chan May')

    // Incrementar total_expedientes de caja 2026-ISC
    await db.execute(sql.raw(`UPDATE cajas SET total_expedientes = total_expedientes + 1 WHERE id = '${caja1Id}'`))
  }

  const [existingExp3] = await db.select({ id: expedientes.id }).from(expedientes).where(eq(expedientes.numeroExpediente, 'EMP-2024-03')).limit(1)
  if (!existingExp3) {
    await db.insert(expedientes).values({
      numeroExpediente: 'EMP-2024-03',
      nombreTitular: 'Dra. Patricia Aranda Rosas',
      tipoExpediente: 'DOCENTE',
      matriculaOEmpleado: 'EMP-2024-03',
      carrera: 'Docente Investigador de la División de Sistemas',
      fechaIngreso: new Date('2024-08-16T00:00:00.000Z'),
      cajaId: caja2Id,
      estado: 'ACTIVO',
      clasificacionAIDLC: '2C.03.02', // Recursos Humanos - Expediente docente
      observaciones: 'Cuenta con certificaciones en Inteligencia Artificial.',
    })
    console.log('📂 Expediente semilla creado: Dra. Patricia Aranda Rosas')

    // Incrementar total_expedientes de caja 2026-ADM
    await db.execute(sql.raw(`UPDATE cajas SET total_expedientes = total_expedientes + 1 WHERE id = '${caja2Id}'`))
  }

  const [existingExp4] = await db.select({ id: expedientes.id }).from(expedientes).where(eq(expedientes.numeroExpediente, 'FIN-2025-Q1')).limit(1)
  if (!existingExp4) {
    await db.insert(expedientes).values({
      numeroExpediente: 'FIN-2025-Q1',
      nombreTitular: 'Pólizas de Recursos Estatales Q1-2025',
      tipoExpediente: 'PROYECTO',
      fechaIngreso: new Date('2025-04-01T00:00:00.000Z'),
      fechaCierre: new Date('2025-04-15T00:00:00.000Z'),
      cajaId: caja3Id,
      estado: 'CERRADO',
      clasificacionAIDLC: '3C.01', // Finanzas - Recursos Estatales
      observaciones: 'Cerrado y archivado físicamente. Todos los documentos digitalizados y conciliados.',
    })
    console.log('📂 Expediente semilla creado: Pólizas Q1-2025')

    // Incrementar total_expedientes de caja 2026-FIN
    await db.execute(sql.raw(`UPDATE cajas SET total_expedientes = total_expedientes + 1 WHERE id = '${caja3Id}'`))
  }
}
