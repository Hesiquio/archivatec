update public.usuarios
set division = case trim(division)
  when 'Subdirección de Academia' then 'Subdirección Académica'
  when 'Subdirección de Investigación e Innovación' then 'Subdirección Académica'
  when 'Subdirección de Administración' then 'Subdirección de Servicios Administrativos'
  when 'Subdirección de Planeación' then 'Subdirección de Planeación y Vinculación'
  when 'Subdirección de Planeación y Vinculación / Desarrollo' then 'Subdirección de Planeación y Vinculación'
  when 'Subdirección de Planeación y Desarrollo' then 'Subdirección de Planeación y Vinculación'
  when 'Subdirección de Extensión' then 'Subdirección de Extensión y Vinculación'
  else division
end
where trim(division) in (
  'Subdirección de Academia',
  'Subdirección de Investigación e Innovación',
  'Subdirección de Administración',
  'Subdirección de Planeación',
  'Subdirección de Planeación y Vinculación / Desarrollo',
  'Subdirección de Planeación y Desarrollo',
  'Subdirección de Extensión'
);

update public.profiles
set division = case trim(division)
  when 'Subdirección de Academia' then 'Subdirección Académica'
  when 'Subdirección de Investigación e Innovación' then 'Subdirección Académica'
  when 'Subdirección de Administración' then 'Subdirección de Servicios Administrativos'
  when 'Subdirección de Planeación' then 'Subdirección de Planeación y Vinculación'
  when 'Subdirección de Planeación y Vinculación / Desarrollo' then 'Subdirección de Planeación y Vinculación'
  when 'Subdirección de Planeación y Desarrollo' then 'Subdirección de Planeación y Vinculación'
  when 'Subdirección de Extensión' then 'Subdirección de Extensión y Vinculación'
  else division
end
where trim(division) in (
  'Subdirección de Academia',
  'Subdirección de Investigación e Innovación',
  'Subdirección de Administración',
  'Subdirección de Planeación',
  'Subdirección de Planeación y Vinculación / Desarrollo',
  'Subdirección de Planeación y Desarrollo',
  'Subdirección de Extensión'
);

update public.ubicaciones
set descripcion = 'Subdirección Académica'
where trim(descripcion) = 'Subdirección de Academia';

update public.prestamos
set solicitante_departamento = 'Subdirección de Extensión y Vinculación'
where trim(solicitante_departamento) = 'Subdirección de Extensión';
