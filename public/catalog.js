// ─── CATÁLOGO ARCHIVATEC ─────────────────────────────────────────
// CONTENIDO LITERAL - NO EDITAR NOMBRES

const SUBDIRECCIONES = [
  'Subdirección de Academia',
  'Subdirección de Planeación',
  'Subdirección de Administración',
  'Subdirección de Extensión',
]

const FUNCIONES_SUSTANTIVAS = [
  {
    code: '1S',
    name: 'GOBIERNO',
    children: [
      { code: '1S.01', name: 'Gestión presupuestal' },
      { code: '1S.02', name: 'Junta Directiva' },
      { code: '1S.03', name: 'Informe de Rendición de Cuentas' },
      { code: '1S.04', name: 'Estadísticas' },
      { code: '1S.05', name: 'Evaluaciones externas' },
      { code: '1S.06', name: 'Autorización de Programas Educativos' },
      {
        code: '1S.07',
        name: 'Formación integral / Actividad extraescolar',
        children: [
          { code: '1S.07.01', name: 'Licenciatura en Administración' },
          { code: '1S.07.02', name: 'Ingeniería en Sistemas Computacionales' },
          { code: '1S.07.03', name: 'Ingeniería en Industrias Alimentarias' },
          { code: '1S.07.04', name: 'Gastronomía' },
          { code: '1S.07.05', name: 'Ingeniería en Energías Renovables' },
          { code: '1S.07.06', name: 'Licenciatura en Turismo' },
          { code: '1S.07.07', name: 'Eventos Culturales y Deportivos' },
          { code: '1S.07.08', name: 'Ingeniería en Animación Digital y Efectos Visuales' },
          { code: '1S.07.09', name: 'Contador Público' },
          { code: '1S.07.10', name: 'Licenciatura en Administración Modalidad Mixta' },
          { code: '1S.07.11', name: 'Ingeniería Ferroviaria' },
          { code: '1S.07.12', name: 'Ingeniería en Inteligencia Artificial' },
        ],
      },
    ],
  },
  {
    code: '2S',
    name: 'ADMINISTRACIÓN ESCOLAR',
    children: [
      {
        code: '2S.01',
        name: 'Procesos estudiantiles',
        children: [
          { code: '2S.01.01', name: 'Licenciatura en Administración' },
          { code: '2S.01.02', name: 'Ingeniería en Sistemas Computacionales' },
          { code: '2S.01.03', name: 'Ingeniería en Industrias Alimentarias' },
          { code: '2S.01.04', name: 'Gastronomía' },
          { code: '2S.01.05', name: 'Ingeniería en Energías Renovables' },
          { code: '2S.01.06', name: 'Licenciatura en Turismo' },
          { code: '2S.01.07', name: 'Ingeniería en Animación Digital y Efectos Visuales' },
          { code: '2S.01.08', name: 'Contador Público' },
          { code: '2S.01.09', name: 'Licenciatura en Administración (Modalidad Mixta)' },
          { code: '2S.01.10', name: 'Ingeniería Ferroviaria' },
          { code: '2S.01.11', name: 'Ingeniería en Inteligencia Artificial' },
          { code: '2S.01.12', name: 'Ingeniería en Sistemas Computacionales no Escolarizada' },
          { code: '2S.01.13', name: 'Maestría en Economía Social y Solidaria' },
        ],
      },
      { code: '2S.02', name: 'Gestión estudiantil' },
    ],
  },
  {
    code: '3S',
    name: 'DOCENCIA',
    children: [
      { code: '3S.01', name: 'Crédito Complementario' },
      { code: '3S.02', name: 'Curso de verano' },
      { code: '3S.03', name: 'Salida lateral' },
      { code: '3S.04', name: 'Estancia' },
      { code: '3S.05', name: 'Residencia' },
      { code: '3S.06', name: 'Titulación' },
      { code: '3S.07', name: 'Academia' },
      { code: '3S.08', name: 'Comité Académico' },
      { code: '3S.09', name: 'Especialidad' },
      { code: '3S.10', name: 'Posgrados' },
      { code: '3S.11', name: 'Investigación' },
      { code: '3S.12', name: 'Acreditación' },
      { code: '3S.13', name: 'Estructura educativa' },
      {
        code: '3S.14',
        name: 'Gestión del curso',
        children: [
          { code: '3S.14.01', name: 'Proyectos individuales' },
        ],
      },
      { code: '3S.15', name: 'Eventos académicos' },
      {
        code: '3S.16',
        name: 'Evaluación al desempeño del docente',
        children: [
          { code: '3S.16.01', name: 'Evaluación departamental' },
          { code: '3S.16.02', name: 'Evaluación docente' },
        ],
      },
      {
        code: '3S.17',
        name: 'Evaluación alumnado',
        children: [
          { code: '3S.17.01', name: 'Evaluación de ingreso' },
          { code: '3S.17.02', name: 'Evaluación de egreso' },
        ],
      },
      { code: '3S.18', name: 'Programas de apoyo a estudiantes' },
      { code: '3S.19', name: 'Atención Psicológica' },
      { code: '3S.20', name: 'Programas de apoyo al docente' },
    ],
  },
  {
    code: '4S',
    name: 'VINCULACIÓN ACADÉMICA',
    children: [
      { code: '4S.01', name: 'Visitas a empresas' },
      { code: '4S.02', name: 'Convenios' },
      {
        code: '4S.03',
        name: 'Servicio social',
        children: [
          { code: '4S.03.01', name: 'Licenciatura en Administración' },
          { code: '4S.03.02', name: 'Ingeniería en Sistemas Computacionales' },
          { code: '4S.03.03', name: 'Ingeniería en Industrias Alimentarias' },
          { code: '4S.03.04', name: 'Gastronomía' },
          { code: '4S.03.05', name: 'Ingeniería en Energías Renovables' },
          { code: '4S.03.06', name: 'Licenciatura en Turismo' },
          { code: '4S.03.07', name: 'Ingeniería en Animación Digital y Efectos Visuales' },
          { code: '4S.03.08', name: 'Contador Público' },
          { code: '4S.03.09', name: 'Licenciatura en Administración (Modalidad Mixta)' },
          { code: '4S.03.10', name: 'Ingeniería Ferroviaria' },
          { code: '4S.03.11', name: 'Ingeniería en Inteligencia Artificial' },
          { code: '4S.03.12', name: 'Ingeniería en Sistemas Computacionales no Escolarizada' },
        ],
      },
      { code: '4S.04', name: 'Emprendimiento' },
      { code: '4S.05', name: 'Vinculación egresado/sector' },
    ],
  },
  {
    code: '5S',
    name: 'PLANEACIÓN Y PRESUPUESTO',
    children: [
      { code: '5S.01', name: 'Programa de Trabajo Anual, POA, REPOA' },
      { code: '5S.02', name: 'Mejora Regulatoria' },
    ],
  },
]

const FUNCIONES_COMUNES = [
  {
    code: '1C',
    name: 'ASUNTOS JURÍDICOS',
    children: [
      { code: '1C.01', name: 'Juicios' },
    ],
  },
  {
    code: '2C',
    name: 'RECURSOS HUMANOS',
    children: [
      { code: '2C.01', name: 'Nómina de pago de personal' },
      { code: '2C.02', name: 'Descuentos' },
      {
        code: '2C.03',
        name: 'Expediente de personal',
        children: [
          { code: '2C.03.01', name: 'Administrativo' },
          { code: '2C.03.02', name: 'Docente' },
        ],
      },
      {
        code: '2C.04',
        name: 'Capacitación',
        children: [
          { code: '2C.04.01', name: 'Administrativo' },
          { code: '2C.04.02', name: 'Docente' },
        ],
      },
      { code: '2C.05', name: 'Ambiente laboral' },
      { code: '2C.06', name: 'Seguridad Social del personal docente y administrativo' },
      { code: '2C.07', name: 'Reclutamiento, selección, contratación y promoción de personal' },
    ],
  },
  {
    code: '3C',
    name: 'RECURSOS FINANCIEROS',
    children: [
      { code: '3C.01', name: 'Recursos Estatales' },
      { code: '3C.02', name: 'Recursos Federales' },
      { code: '3C.03', name: 'Ingresos Propios' },
      { code: '3C.04', name: 'Pólizas de Diario' },
      { code: '3C.05', name: 'Conciliaciones' },
      { code: '3C.06', name: 'Estados Financieros' },
      { code: '3C.07', name: 'Cuenta Pública' },
    ],
  },
  {
    code: '4C',
    name: 'RECURSOS MATERIALES',
    children: [
      { code: '4C.01', name: 'Mantenimiento preventivo y/o correctivo' },
    ],
  },
  {
    code: '5C',
    name: 'DIFUSIÓN',
    children: [
      { code: '5C.01', name: 'Difusión institucional' },
    ],
  },
  {
    code: '6C',
    name: 'CALIDAD',
    children: [
      { code: '6C.01', name: 'Sistema de Gestión Integral' },
      { code: '6C.02', name: 'Sistema de Gestión de Igualdad de Género y No Discriminación' },
      { code: '6C.03', name: 'Comité de Control Interno y Desempeño Institucional' },
    ],
  },
  {
    code: '7C',
    name: 'SISTEMA INSTITUCIONAL DE ARCHIVO',
    children: [
      { code: '7C.01', name: 'Instrumentos' },
      { code: '7C.02', name: 'Dictámenes' },
      { code: '7C.03', name: 'Trámite' },
      { code: '7C.04', name: 'Grupo Interdisciplinario' },
      { code: '7C.05', name: 'Electrónico' },
    ],
  },
  {
    code: '8C',
    name: 'TRANSPARENCIA Y ACCESO A LA INFORMACIÓN',
    children: [
      {
        code: '8C.01',
        name: 'Solicitudes de Acceso a la Información',
        children: [
          { code: '8C.01.01', name: 'Solicitante' },
          { code: '8C.01.02', name: 'Comité de transparencia' },
          { code: '8C.02.03', name: 'Resoluciones' },
        ],
      },
      { code: '8C.02', name: 'Sistema de datos personales' },
      {
        code: '8C.03',
        name: 'Clasificación de información',
        children: [
          { code: '8C.03.01', name: 'Reservada' },
          { code: '8C.03.02', name: 'Confidencial' },
        ],
      },
      { code: '8C.04', name: 'Plataforma Nacional de Transparencia' },
    ],
  },
  {
    code: '9C',
    name: 'LEGISLACIÓN',
    children: [
      { code: '9C.01', name: 'Normatividad' },
    ],
  },
  {
    code: '10C',
    name: 'VINCULACIÓN INSTITUCIONAL',
    children: [
      {
        code: '10C.01',
        name: 'Vinculación',
        children: [
          { code: '10C.01.01', name: 'Interna' },
          { code: '10C.01.02', name: 'Externa' },
        ],
      },
    ],
  },
]
