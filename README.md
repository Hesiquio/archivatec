# 🏛️ Archivatec: Sistema de Archivística AI-DLC

**Archivatec** es un sistema avanzado de gestión documental y archivística académica diseñado para modernizar el control de inventarios, préstamos y digitalización de expedientes. Utiliza inteligencia artificial para la clasificación (AI-DLC) y una arquitectura moderna basada en **Bun** y **Hono**.

---

## 🚀 Características Principales

- 📁 **Gestión de Expedientes**: Control total sobre expedientes de alumnos, docentes y personal.
- 📦 **Control de Inventario**: Gestión de cajas y ubicaciones físicas (estantes, filas, columnas).
- 🤝 **Sistema de Préstamos**: Seguimiento riguroso de la salida y devolución de documentos.
- 📸 **Digitalización**: Módulo para registrar procesos de escaneo con verificación de integridad (SHA-256).
- 🔐 **Seguridad y RBAC Granular**:
  - Control de acceso basado en roles con 5 permisos individuales (`crearUsuarios`, `subirArchivos`, `modificarArchivos`, `eliminarArchivos`, `verOtrasDivisiones`).
  - Autenticación JWT robusta.
  - **Widget de Estado RBAC en Topbar**: Un chip interactivo que muestra el Rol en el encabezado junto al nombre de bienvenida y despliega un panel flotante (*tooltip glassmorphism*) detallando el estado de activación de cada uno de tus permisos específicos.
- 👥 **Módulo de Administración de Usuarios**:
  - Pestaña de administración técnica unificada y segura en Configuración.
  - Creación dinámica con autocompletado inteligente de permisos según el Rol seleccionado (ajustables manualmente).
  - Edición completa de datos y **actualización de contraseñas de usuarios por administradores**.
  - Eliminación segura con modales de confirmación institucionales.
- 📑 **Documentación Automática**: Swagger UI integrado para pruebas rápidas de la API.
- 💾 **Base de Datos Embebida Zero-Config**: Configuración robusta e idempotente basada en **PGlite** para entornos de desarrollo sin dependencias de sistemas externos.

---

## 🛠️ Stack Tecnológico

- **Runtime**: [Bun](https://bun.sh/) (Fast all-in-one JavaScript runtime)
- **Backend**: [Hono](https://hono.dev/) (Ultrafast web framework)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Base de Datos**: 
  - **PGlite** (Para desarrollo local rápido y embebido)
  - **PostgreSQL** (Para producción)
- **Validación**: [Zod](https://zod.dev/)
- **Documentación**: Swagger / OpenAPI
- **Frontend**: Vanilla JS, HTML5, CSS3 Custom Properties (Diseño técnico responsivo con paleta institucional Guinda)

---

## ⚙️ Instalación y Configuración

Sigue estos pasos para poner en marcha el proyecto en tu entorno local:

### 1. Requisitos Previos
Debes tener instalado **Bun**. Si no lo tienes, instálalo con:
```bash
powershell -c "irm bun.sh/install.ps1 | iex"
```

### 2. Clonar e Instalar Dependencias
```bash
bun install
```

### 3. Configurar el Entorno
Copia el archivo de ejemplo y crea tu propia configuración:
```bash
cp .env.example .env
```

> [!IMPORTANT]
> **Edita el archivo `.env`** y asegúrate de que:
> 1. `JWT_SECRET` tenga al menos **32 caracteres**.
> 2. `DATABASE_URL` contenga la palabra `localhost` si deseas usar la base de datos embebida (PGlite).

### 4. Iniciar el Servidor (Desarrollo)
```bash
bun run dev
```
Al arrancar, el sistema inicializa automáticamente la base de datos de forma idempotente, creando el directorio `./data`, activando la extensión `pgcrypto` en la BD PGlite y creando las tablas en caso de que no existan.

---

## 📂 Estructura del Proyecto

```text
archivatec/
├── src/
│   ├── api/            # Controladores y Rutas (Hono)
│   ├── application/    # Lógica de negocio (Servicios)
│   ├── domain/         # Entidades y tipos
│   ├── infrastructure/ # Base de datos, Repositorios, Config
│   │   └── database/   # Esquemas Drizzle (schema.ts), PGlite Client, Migraciones
│   └── config/         # Variables de entorno
├── public/             # Archivos frontend (HTML, CSS premium, JS reactivo)
├── data/               # Directorio persistido de la base de datos (PGlite)
├── storage/            # Almacenamiento de archivos digitalizados
└── index.ts            # Punto de entrada de la aplicación (arranque e inicialización)
```

---

## 🔑 Credenciales por Defecto

Al iniciar el servidor por primera vez, se crea un usuario administrador por defecto si no existe ninguno:

- **Email**: `admin@archivistica.edu.mx` (Usuario: `admin`)
- **Password**: `Admin@1234!`

---

## 📖 Documentación de la API

Una vez que el servidor esté corriendo, puedes acceder a la documentación interactiva en:
👉 `http://localhost:3000/api/v1/docs` (Swagger UI)

---

## 🛠️ Solución de Problemas (Troubleshooting)

1. **Error en Inicialización de PGlite (RuntimeError: Aborted)**:
   - *Causa*: El esquema intenta usar tipos `ENUM` nativos de Postgres, los cuales no son soportados por el motor de PGlite.
   - *Solución*: En Archivatec se migró todo el esquema a tipos `VARCHAR` con tipado estricto literal en TypeScript (`.$type<LiteralUnion>`). No uses `pgEnum` al ampliar el esquema.
   - *Causa 2*: Falta la extensión `pgcrypto` para el generador `gen_random_uuid()`.
   - *Solución*: El cliente PGlite está configurado para ejecutar `CREATE EXTENSION IF NOT EXISTS pgcrypto` al arrancar.
2. **Error de Carpeta Inexistente (ENOENT en data/archivistica.db)**:
   - *Solución*: Asegúrate de que el backend cree el directorio `./data` recursivamente antes de instanciar PGlite. Esto ya está automatizado en `client.ts`. Si es necesario, créalo manualmente con `mkdir data`.
3. **JWT Secret Corto**:
   - Asegúrate de que tu `JWT_SECRET` en el `.env` tenga suficiente entropía (mínimo 32 caracteres).

---

## 🤝 Colaboración

Si eres un colaborador:
1. Crea una rama para tu feature: `git checkout -b feature/nueva-funcionalidad`.
2. Realiza tus cambios y asegúrate de que el código pase el linter.
3. Haz un Pull Request detallando los cambios realizados.

---
Desarrollado con ❤️ para la gestión documental de vanguardia.
