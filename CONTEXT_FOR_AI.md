# 🏛️ Archivatec — Guía de Contexto Técnico para IAs Asistentes

Este archivo sirve como fuente de verdad técnica y de contexto global para cualquier Inteligencia Artificial Asistente que colabore en el desarrollo de **Archivatec**. Consúltalo antes de realizar cualquier refactorización, creación de módulos o cambios en el esquema.

---

## 🧭 Visión General del Proyecto
**Archivatec** es una plataforma web para la digitalización, control de inventario de cajas, expedientes y préstamos documentales del **Instituto Tecnológico Superior de Escárcega (ITSE)**. 

### Identidad Visual y UI
- **Paleta de Colores Institucional**: El color primario es el **Guinda/Vino (#800020)**. Utiliza acentos suaves, grises profesionales y toques de naranja institucionales.
- **Tipografía**: Fuente técnica pequeña, compacta y profesional usando `Inter`.
- **Aesthetics**: Diseño premium, moderno (micro-animaciones, efectos hover no invasivos, glassmorphic tooltips en áreas clave).
- **Consistencia**: Todos los modales de interacción destructiva o confirmación crítica deben usar el diseño institucional de modales implementado en `app.js` (`openModal`), evitando los `alert()` o `confirm()` nativos del navegador.

---

## 🗄️ Arquitectura del Backend e Infraestructura

El backend está desarrollado sobre **Bun** y **Hono** en una arquitectura de capas bien definida:
1. **Rutas e Inyección (`src/api`)**: Define los endpoints Http y middlewares.
2. **Servicios (`src/application`)**: Contiene la lógica de negocio pura.
3. **Persistencia e Infraestructura (`src/infrastructure`)**:
   - ORM: **Drizzle ORM**
   - Driver BD: **PGlite** (embebido en memoria/disco local en modo desarrollo) y **Postgres-js** (en producción).

### ⚠️ Limitación Crítica de PGlite (¡IMPORTANTE!)
**PGlite** es un motor de base de datos PostgreSQL ligero compilado a WebAssembly. Tiene dos limitaciones fundamentales que debes respetar estrictamente:
1. **No soporta tipos ENUM de Postgres (`CREATE TYPE ... AS ENUM`)**: Intentar crearlos o usarlos con la función `pgEnum` de Drizzle hará que el motor colapse lanzando un `RuntimeError: Aborted()`.
   - **Regla**: Todos los campos que requieran ser enumeraciones deben definirse como `varchar` estándar de longitud apropiada con casting de tipo en TypeScript: `.varchar('nombre_campo', { length: 50 }).$type<UnionDeLiterales>()`.
2. **Requiere inicialización de pgcrypto y directorio de manera explícita**:
   - `gen_random_uuid()` no funciona a menos que se ejecute primero `CREATE EXTENSION IF NOT EXISTS pgcrypto`.
   - El driver NodeFS fallará si no existe previamente la carpeta padre `./data` para alojar la BD. Esto se resuelve en `client.ts` con un `mkdirSync('./data', { recursive: true })` antes de la inicialización.
3. **Uso de DDL seguro**: Evita los `try/catch` de colapso en PGlite usando sentencias SQL explícitas de la forma `CREATE TABLE IF NOT EXISTS` y `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

---

## 🔐 Modelo de Seguridad y RBAC (Role-Based Access Control)

El sistema implementa seguridad granular tanto en el Frontend como en el Backend a través de 5 permisos booleanos e independientes:
1. `crearUsuarios`: Capacidad de administrar cuentas de usuarios, asignar roles y resetear contraseñas.
2. `subirArchivos`: Permiso para indexar y subir nuevos expedientes o digitalizaciones.
3. `modificarArchivos`: Permiso para actualizar metadatos o estados de los registros.
4. `eliminarArchivos`: Permiso para borrar expedientes o cajas del inventario.
5. `verOtrasDivisiones`: Filtro de visibilidad. Si es `false`, el usuario solo puede ver expedientes de su propio departamento/división. Si es `true`, tiene visibilidad global.

### Mapeo Predeterminado de Roles (`ROLES_PERMISOS`)
- **Administrador**: Todos los 5 permisos en `true`.
- **Gestor de Archivos**: `subirArchivos: true`, `modificarArchivos: true`, `verOtrasDivisiones: true`. Resto en `false`.
- **Usuario de Consulta**: `verOtrasDivisiones: true`. Resto en `false`.

### Integración en la Interfaz (Widget de Permisos Granulares)
- En la barra superior (`topbar-left`) junto al saludo de bienvenida, se renderiza un chip interactivo que muestra el Rol en uso.
- Al pasar el mouse por encima del chip, se activa un tooltip flotante premium que muestra el listado detallado de los 5 permisos específicos y su estado de activación actual en verde (Sí) o rojo (No).
- La pestaña **Administración de Usuarios** está protegida por un guardia en JS. Si un usuario sin `crearUsuarios` intenta entrar a través del inspector de elementos o por consola, la UI lo redirecciona automáticamente al Inicio de forma segura.

---

## 📡 Catálogo de Endpoints Principales (Módulo Auth & Usuarios)

### Autenticación
- `POST /api/v1/auth/login`: Inicia sesión, retorna el token JWT y el perfil de usuario.
- `GET /api/v1/auth/me`: Retorna los datos y permisos del usuario logueado usando el token.

### Administración de Usuarios (Exclusivos para usuarios con permiso `crearUsuarios` / ADMIN)
- `GET /api/v1/usuarios`: Lista todos los usuarios con su rol y permisos desglosados (normalizados para la tabla).
- `POST /api/v1/usuarios`: Registra un nuevo usuario con permisos personalizables.
- `PATCH /api/v1/usuarios/:id`: Actualiza el nombre, división, rol, permisos y **opcionalmente cambia la contraseña** del usuario si se suministra el campo `nuevaPassword` (hasheada de forma segura).
- `DELETE /api/v1/usuarios/:id`: Elimina la cuenta de usuario de la base de datos de manera definitiva.

---

## ⚡ Reglas para el Desarrollo de Frontend (`public/app.js` & `public/style.css`)

1. **Evita la duplicidad de flujos**:
   - No recrees tarjetas de creación de usuarios en el menú general. Todo el ciclo de vida de administración de usuarios (creación, edición y eliminación) debe residir dentro de la pestaña "Administración de Usuarios".
2. **Actualización Optimista del Caché Local**:
   - Para garantizar que la UI se sienta instantánea y premium, las llamadas de creación, edición y eliminación de usuarios deben actualizar primero la variable de caché local `_usuariosCache` y ejecutar la función de renderizado `renderUsuariosAdmin(_usuariosCache)` antes de requerir un recarga completa de la página. Esto también sirve como un excelente fallback funcional en caso de operar en modo offline/demo.
3. **Mapeo e Interacción Reactiva**:
   - En el modal de creación y edición, la selección del selector de Rol debe desencadenar automáticamente el autocompletado en los checkboxes de permisos mediante el mapa `ROLES_PERMISOS`, pero debe permitir siempre la edición granular por parte del administrador (los checkboxes individuales son la fuente de verdad al guardar).

---
¡Gracias por tu colaboración! Mantengamos el código limpio, ordenado y técnicamente impecable.
