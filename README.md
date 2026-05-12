# 🏛️ Archivatec: Sistema de Archivística AI-DLC

**Archivatec** es un sistema avanzado de gestión documental y archivística académica diseñado para modernizar el control de inventarios, préstamos y digitalización de expedientes. Utiliza inteligencia artificial para la clasificación (AI-DLC) y una arquitectura moderna basada en **Bun** y **Hono**.

---

## 🚀 Características Principales

- 📁 **Gestión de Expedientes**: Control total sobre expedientes de alumnos, docentes y personal.
- 📦 **Control de Inventario**: Gestión de cajas y ubicaciones físicas (estantes, filas, columnas).
- 🤝 **Sistema de Préstamos**: Seguimiento riguroso de la salida y devolución de documentos.
- 📸 **Digitalización**: Módulo para registrar procesos de escaneo con verificación de integridad (SHA-256).
- 🔐 **Seguridad Robusta**: Autenticación JWT y control de acceso basado en roles (RBAC).
- 📑 **Documentación Automática**: Swagger UI integrado para pruebas rápidas de la API.
- 💾 **Base de Datos Flexible**: Soporte nativo para PostgreSQL y PGlite (PostgreSQL embebido para desarrollo rápido).

---

## 🛠️ Stack Tecnológico

- **Runtime**: [Bun](https://bun.sh/) (Fast all-in-one JavaScript runtime)
- **Backend**: [Hono](https://hono.dev/) (Ultrafast web framework)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Base de Datos**: 
  - **PGlite** (Para desarrollo local sin dependencias externas)
  - **PostgreSQL** (Para producción)
- **Validación**: [Zod](https://zod.dev/)
- **Documentación**: Swagger / OpenAPI

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

### 4. Inicializar la Base de Datos
El sistema está diseñado para inicializarse automáticamente al arrancar, pero puedes generar las migraciones de Drizzle si realizas cambios en el esquema:
```bash
bun run db:generate
```

### 5. Iniciar el Servidor
```bash
bun run dev
```

---

## 📂 Estructura del Proyecto

```text
archivatec/
├── src/
│   ├── api/            # Controladores y Rutas (Hono)
│   ├── application/    # Lógica de negocio (Servicios)
│   ├── domain/         # Entidades y tipos
│   ├── infrastructure/ # Base de datos, Repositorios, Config
│   └── config/         # Variables de entorno
├── data/               # Base de datos local (PGlite)
├── storage/            # Almacenamiento de archivos digitalizados
└── index.ts            # Punto de entrada de la aplicación
```

---

## 🔑 Credenciales por Defecto

Al iniciar el servidor por primera vez, se crea un usuario administrador:

- **Email**: `admin@archivistica.edu.mx`
- **Password**: `Admin@1234!`

---

## 📖 Documentación de la API

Una vez que el servidor esté corriendo, puedes acceder a la documentación interactiva en:
👉 `http://localhost:3000/api/v1/docs` (Swagger UI)

---

## 🛠️ Solución de Problemas (¿Por qué no funciona?)

Si el proyecto no arranca, verifica lo siguiente:

1. **Error en Variables de Entorno**: El servidor fallará inmediatamente si falta alguna variable en el `.env`. Revisa la consola para ver qué campo de `Zod` está fallando.
2. **JWT Secret corto**: Asegúrate de que `JWT_SECRET` sea una cadena larga y segura.
3. **Permisos de Carpeta**: Verifica que el proceso tenga permisos para escribir en `./data` y `./storage`.
4. **Puerto ocupado**: Si el puerto 3000 está en uso, cámbialo en el `.env`.

---

## 🤝 Colaboración

Si eres un colaborador:
1. Crea una rama para tu feature: `git checkout -b feature/nueva-funcionalidad`.
2. Realiza tus cambios y asegúrate de que el código pase el linter.
3. Haz un Pull Request detallando los cambios realizados.

---
Desarrollado con ❤️ para la gestión documental de vanguardia.
