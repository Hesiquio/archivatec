CREATE TYPE "public"."estado_caja" AS ENUM('ACTIVA', 'INACTIVA', 'EN_PRESTAMO', 'EN_DIGITALIZACION', 'DADA_DE_BAJA');--> statement-breakpoint
CREATE TYPE "public"."estado_digitalizacion" AS ENUM('EN_PROCESO', 'COMPLETADO', 'FALLIDO', 'VERIFICADO');--> statement-breakpoint
CREATE TYPE "public"."estado_expediente" AS ENUM('ACTIVO', 'CERRADO', 'PRESTADO', 'DIGITALIZADO', 'TRANSFERIDO');--> statement-breakpoint
CREATE TYPE "public"."estado_prestamo" AS ENUM('PENDIENTE', 'ACTIVO', 'DEVUELTO', 'VENCIDO');--> statement-breakpoint
CREATE TYPE "public"."formato_archivo" AS ENUM('PDF', 'PDF_A', 'TIFF', 'PNG');--> statement-breakpoint
CREATE TYPE "public"."rol" AS ENUM('ADMIN', 'ARCHIVISTA', 'CONSULTA', 'DIGITALIZADOR');--> statement-breakpoint
CREATE TYPE "public"."tipo_documento" AS ENUM('ACADEMICO', 'ADMINISTRATIVO', 'FINANCIERO', 'PERSONAL');--> statement-breakpoint
CREATE TYPE "public"."tipo_expediente" AS ENUM('ALUMNO', 'DOCENTE', 'ADMINISTRATIVO', 'PROYECTO', 'CONVENIO');--> statement-breakpoint
CREATE TABLE "cajas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero_caja" varchar(50) NOT NULL,
	"descripcion" text,
	"tipo_documento" "tipo_documento" NOT NULL,
	"fecha_inicio" timestamp NOT NULL,
	"fecha_fin" timestamp,
	"ubicacion_id" uuid NOT NULL,
	"estado" "estado_caja" DEFAULT 'ACTIVA' NOT NULL,
	"total_expedientes" integer DEFAULT 0 NOT NULL,
	"observaciones" text,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "digitalizaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expediente_id" uuid NOT NULL,
	"operador_id" uuid NOT NULL,
	"equipo_escaner" varchar(100),
	"resolucion_dpi" integer DEFAULT 300 NOT NULL,
	"formato_archivo" "formato_archivo" DEFAULT 'PDF_A' NOT NULL,
	"total_paginas" integer NOT NULL,
	"url_archivo" varchar(1000) NOT NULL,
	"checksum_sha256" varchar(64) NOT NULL,
	"estado" "estado_digitalizacion" DEFAULT 'EN_PROCESO' NOT NULL,
	"observaciones" text,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expedientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero_expediente" varchar(100) NOT NULL,
	"nombre_titular" varchar(200) NOT NULL,
	"tipo_expediente" "tipo_expediente" NOT NULL,
	"matricula_o_empleado" varchar(50),
	"carrera" varchar(150),
	"fecha_ingreso" timestamp NOT NULL,
	"fecha_cierre" timestamp,
	"caja_id" uuid NOT NULL,
	"estado" "estado_expediente" DEFAULT 'ACTIVO' NOT NULL,
	"clasificacion_aidlc" varchar(100),
	"digitalizado_url" varchar(1000),
	"observaciones" text,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prestamos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expediente_id" uuid,
	"caja_id" uuid,
	"solicitante_nombre" varchar(200) NOT NULL,
	"solicitante_matricula" varchar(50),
	"solicitante_departamento" varchar(200) NOT NULL,
	"motivo_prestamo" text NOT NULL,
	"fecha_salida" timestamp DEFAULT now() NOT NULL,
	"fecha_devolucion_esperada" timestamp NOT NULL,
	"fecha_devolucion_real" timestamp,
	"autorizado_por_id" uuid NOT NULL,
	"estado" "estado_prestamo" DEFAULT 'ACTIVO' NOT NULL,
	"observaciones" text,
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ubicaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"descripcion" varchar(200),
	"salon" varchar(100) NOT NULL,
	"estante" integer NOT NULL,
	"fila" integer NOT NULL,
	"columna" integer NOT NULL,
	"capacidad_maxima" integer DEFAULT 50 NOT NULL,
	"ocupacion_actual" integer DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(200) NOT NULL,
	"email" varchar(200) NOT NULL,
	"password_hash" varchar(500) NOT NULL,
	"rol" "rol" DEFAULT 'CONSULTA' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cajas" ADD CONSTRAINT "cajas_ubicacion_id_ubicaciones_id_fk" FOREIGN KEY ("ubicacion_id") REFERENCES "public"."ubicaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digitalizaciones" ADD CONSTRAINT "digitalizaciones_expediente_id_expedientes_id_fk" FOREIGN KEY ("expediente_id") REFERENCES "public"."expedientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digitalizaciones" ADD CONSTRAINT "digitalizaciones_operador_id_usuarios_id_fk" FOREIGN KEY ("operador_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedientes" ADD CONSTRAINT "expedientes_caja_id_cajas_id_fk" FOREIGN KEY ("caja_id") REFERENCES "public"."cajas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_expediente_id_expedientes_id_fk" FOREIGN KEY ("expediente_id") REFERENCES "public"."expedientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_caja_id_cajas_id_fk" FOREIGN KEY ("caja_id") REFERENCES "public"."cajas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_autorizado_por_id_usuarios_id_fk" FOREIGN KEY ("autorizado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cajas_numero_unique" ON "cajas" USING btree ("numero_caja");--> statement-breakpoint
CREATE UNIQUE INDEX "expedientes_numero_unique" ON "expedientes" USING btree ("numero_expediente");--> statement-breakpoint
CREATE UNIQUE INDEX "ubicaciones_codigo_unique" ON "ubicaciones" USING btree ("codigo");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_email_unique" ON "usuarios" USING btree ("email");