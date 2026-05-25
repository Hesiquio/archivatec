CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre_encargado TEXT NOT NULL,
  usuario TEXT NOT NULL UNIQUE,
  contrasena TEXT NOT NULL,
  division TEXT NOT NULL,
  rol TEXT NOT NULL,
  crear_usuarios BOOLEAN NOT NULL DEFAULT false,
  subir_archivos BOOLEAN NOT NULL DEFAULT false,
  modificar_archivos BOOLEAN NOT NULL DEFAULT false,
  eliminar_archivos BOOLEAN NOT NULL DEFAULT false,
  ver_otras_divisiones BOOLEAN NOT NULL DEFAULT false
);
