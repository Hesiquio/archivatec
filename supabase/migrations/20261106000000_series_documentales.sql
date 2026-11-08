create table if not exists public.series_documentales (
  id uuid primary key default gen_random_uuid(),
  codigo varchar(30) not null,
  nombre varchar(200) not null,
  categoria varchar(20) not null,
  codigo_padre varchar(30),
  encargado_id uuid,
  fecha_creacion timestamp,
  fecha_vencimiento timestamp,
  creado_por_id uuid,
  creado_en timestamp not null default now(),
  actualizado_en timestamp not null default now()
);

alter table public.series_documentales
  add column if not exists encargado_id uuid,
  add column if not exists creado_por_id uuid,
  add column if not exists fecha_creacion timestamp,
  add column if not exists fecha_vencimiento timestamp,
  add column if not exists actualizado_en timestamp not null default now();

create unique index if not exists series_documentales_codigo_unique
  on public.series_documentales (codigo);

create index if not exists series_documentales_categoria_creado_en_idx
  on public.series_documentales (categoria, creado_en desc);

alter table public.series_documentales
  drop constraint if exists series_documentales_encargado_id_fkey,
  drop constraint if exists series_documentales_creado_por_id_fkey;

alter table public.series_documentales
  add constraint series_documentales_encargado_id_fkey
    foreign key (encargado_id) references public.usuarios(id) on delete set null,
  add constraint series_documentales_creado_por_id_fkey
    foreign key (creado_por_id) references public.usuarios(id) on delete set null;

alter table public.series_documentales enable row level security;
