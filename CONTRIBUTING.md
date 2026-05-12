# Guía de Contribución 🤝

¡Bienvenido al equipo de **Archivatec**! Esta guía te ayudará a entender cómo trabajar en el proyecto de manera eficiente.

## 🛠️ Entorno de Desarrollo

1. **Bun**: Usamos Bun como runtime. Asegúrate de usar la versión más reciente (`bun upgrade`).
2. **Editor**: Recomendamos **VS Code** con las extensiones de *TypeScript*, *ESLint* y *Drizzle*.
3. **Base de Datos**: Por defecto, el proyecto usa **PGlite**. No necesitas instalar PostgreSQL en tu máquina para empezar. Los datos se guardan en `./data/archivistica.db`.

## 🏗️ Arquitectura

El proyecto sigue una estructura modular:
- **`src/modules`**: Contiene la lógica dividida por dominios (auth, expedientes, etc.). Cada módulo tiene sus propias rutas (`.routes.ts`) y lógica.
- **`src/infrastructure`**: Manejo de base de datos, esquemas de Drizzle y clientes externos.
- **`src/middleware`**: Middlewares globales (auth, logger, error handler).

## 📜 Flujo de Trabajo

1. **Rutas**: Define tus rutas en `src/modules/[modulo]/[modulo].routes.ts`.
2. **Validación**: Usa `Zod` para validar la entrada de las peticiones.
3. **Esquema**: Si necesitas cambiar la base de datos, edita `src/infrastructure/database/schema.ts` y corre `bun run db:generate`.
4. **Migraciones**: El archivo `src/infrastructure/database/migrate.ts` contiene una inicialización manual para PGlite. Si añades tablas, asegúrate de añadirlas ahí también para que se creen automáticamente en desarrollo.

## 🧪 Pruebas

Puedes ejecutar los tests con:
```bash
bun test
```

## 📝 Reglas de Estilo

- Usa **TypeScript** estricto.
- Prefiere `async/await` sobre Promesas.
- Nombra los archivos en `camelCase`.
- Documenta los endpoints importantes ( Swagger se genera automáticamente si sigues el patrón de Hono).

## 🚀 Despliegue

Para preparar el proyecto para producción:
1. Cambia `NODE_ENV` a `production` en el `.env`.
2. Asegúrate de configurar una `DATABASE_URL` real (PostgreSQL).
3. Ejecuta `bun run start`.

---
¡Gracias por ayudar a mejorar Archivatec!
