-- Seed básico para desarrollo
insert into auth.users (id, email, encrypted_password, email_confirmed_at)
values
  ('00000000-0000-0000-0000-000000000001', 'admin@archivatec.local', crypt('Admin@1234!', gen_salt('bf')), now())
ON CONFLICT (id) DO NOTHING;

insert into public.profiles (id, username, display_name, division, role, crear_usuarios, subir_archivos, modificar_archivos, eliminar_archivos, ver_otras_divisiones)
values
  ('00000000-0000-0000-0000-000000000001', 'admin', 'Administrador del Sistema', 'Sistemas', 'Administrador', true, true, true, true, true)
ON CONFLICT (id) DO NOTHING;
