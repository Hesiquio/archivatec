// ─── CONFIG ──────────────────────────────────────────────────────
const API = '/api/v1'
let token = localStorage.getItem('token') || ''
let currentUser = null

// ─── PERMISOS GLOBALES (RBAC) ─────────────────────────────────────
// Valores por defecto seguros (todo cerrado hasta que se cargue el perfil)
let currentPermisos = {
  crearUsuarios:      false,
  subirArchivos:      false,
  modificarArchivos:  false,
  eliminarArchivos:   false,
  verOtrasDivisiones: false,
}
let currentDivision = ''

// ─── NAVIGATION STATE ─────────────────────────────────────────────
// navState mantiene el camino actual del usuario
let navState = {
  year: null,           // e.g. 2026
  subdir: null,         // e.g. 'Subdirección de Academia'
  category: null,       // 'sustantivas' | 'comunes'
  path: [],             // array de nodos { code, name } desde raíz al actual
}

const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]

// ─── SAMPLE DATA ───────────────────────────────────────────────
const SAMPLE_ACTIVIDADES = [
  {
    archivo: 'Acta_Consejo_2024.pdf',
    serie: 'Actas institucionales',
    subdivision: 'Dirección Académica',
    encargado: 'María López',
    division: 'Subdirección de Academia',
    fecha: '18/01/2024',
    hora: '09:45 AM',
  },
  {
    archivo: 'Inventario_Laboratorio.xlsx',
    serie: 'Control de inventarios',
    subdivision: 'Laboratorios',
    encargado: 'Carlos Méndez',
    division: 'Subdirección de Administración',
    fecha: '02/03/2024',
    hora: '11:20 AM',
  },
  {
    archivo: 'Solicitud_Beca_Alumno.docx',
    serie: 'Apoyos estudiantiles',
    subdivision: 'Servicios Escolares',
    encargado: 'Ana Pérez',
    division: 'Subdirección de Extensión',
    fecha: '11/02/2024',
    hora: '08:05 AM',
  },
  {
    archivo: 'Reporte_Mantenimiento.jpg',
    serie: 'Mantenimiento preventivo',
    subdivision: 'Recursos Materiales',
    encargado: 'José Hernández',
    division: 'Subdirección de Administración',
    fecha: '09/04/2024',
    hora: '03:30 PM',
  },
  {
    archivo: 'Calendario_Actividades.pdf',
    serie: 'Planeación operativa',
    subdivision: 'Subdirección Administrativa',
    encargado: 'Lucía Gómez',
    division: 'Subdirección de Planeación',
    fecha: '27/01/2024',
    hora: '02:15 PM',
  },
]

// ─── API Helper ───────────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (token) opts.headers['Authorization'] = `Bearer ${token}`
  if (body)  opts.body = JSON.stringify(body)
  const r = await fetch(API + path, opts)
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw { status: r.status, message: data.error || 'Error' }
  return data
}

// ─── Toast ───────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' }
  const el = document.createElement('div')
  el.className = `toast ${type}`
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`
  document.getElementById('toast-container').appendChild(el)
  setTimeout(() => el.remove(), 3500)
}

// ─── Modal ───────────────────────────────────────────────────
function openModal(title, bodyHTML, footerHTML) {
  document.getElementById('modal-title').textContent = title
  document.getElementById('modal-body').innerHTML = bodyHTML
  document.getElementById('modal-footer').innerHTML = footerHTML || ''
  document.getElementById('modal-overlay').classList.remove('hidden')
}
function closeModal() { document.getElementById('modal-overlay').classList.add('hidden') }
document.getElementById('modal-close').onclick = closeModal
document.getElementById('modal-overlay').onclick = e => {
  if (e.target.id === 'modal-overlay') closeModal()
}

// ─── LOGIN ───────────────────────────────────────────────────
document.getElementById('login-form').onsubmit = async e => {
  e.preventDefault()
  const btn = document.getElementById('login-btn')
  const err = document.getElementById('login-error')
  btn.querySelector('.btn-text').classList.add('hidden')
  btn.querySelector('.btn-loader').classList.remove('hidden')
  btn.disabled = true
  err.classList.add('hidden')

  const username = document.getElementById('username').value.trim()
  const password = document.getElementById('password').value

  try {
    const res = await api('POST', '/auth/login', {
      email: username.includes('@') ? username : username + '@itse.edu.mx',
      password,
    })
    token = res.data.token
    localStorage.setItem('token', token)
    currentUser = res.data.usuario
    if (document.getElementById('remember-me').checked) {
      localStorage.setItem('remember_user', username)
    }
    enterApp()
  } catch (ex) {
    if (username && password) {
      currentUser = { nombre: capitalize(username), rol: 'Administrador', username, division: '' }
      // Modo demo → permisos completos de administrador
      currentPermisos = {
        crearUsuarios: true, subirArchivos: true,
        modificarArchivos: true, eliminarArchivos: true, verOtrasDivisiones: true,
      }
      currentDivision = ''
      token = 'demo-token'
      if (document.getElementById('remember-me').checked) {
        localStorage.setItem('remember_user', username)
      }
      enterApp()
    } else {
      err.textContent = ex.message || 'Credenciales incorrectas'
      err.classList.remove('hidden')
    }
  } finally {
    btn.querySelector('.btn-text').classList.remove('hidden')
    btn.querySelector('.btn-loader').classList.add('hidden')
    btn.disabled = false
  }
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

const rememberedUser = localStorage.getItem('remember_user')
if (rememberedUser) {
  document.getElementById('username').value = rememberedUser
  document.getElementById('remember-me').checked = true
}

// ─── LOGOUT ───────────────────────────────────────────────
document.getElementById('logout-btn').onclick = () => {
  token = ''
  currentUser = null
  // ⚠️ CRITICO: Resetear permisos al salir para que no se hereden entre sesiones
  currentPermisos = {
    crearUsuarios: false, subirArchivos: false,
    modificarArchivos: false, eliminarArchivos: false, verOtrasDivisiones: false,
  }
  currentDivision = ''
  localStorage.removeItem('token')
  // Limpiar badge si quedó del usuario anterior
  document.getElementById('rbac-badge')?.remove()
  document.getElementById('app').classList.add('hidden')
  document.getElementById('login-screen').classList.remove('hidden')
}

// ─── ENTER APP ───────────────────────────────────────────────
async function enterApp() {
  document.getElementById('login-screen').classList.add('hidden')
  document.getElementById('app').classList.remove('hidden')

  // Si no tenemos currentUser (recarga de página con token guardado), cargarlo desde /me
  if (!currentUser && token && token !== 'demo-token') {
    try {
      const r = await api('GET', '/auth/me')
      currentUser = r.data
    } catch {
      // Token inválido o expirado → forzar logout
      localStorage.removeItem('token')
      token = ''
      document.getElementById('app').classList.add('hidden')
      document.getElementById('login-screen').classList.remove('hidden')
      return
    }
  }

  // ── CARGAR PERMISOS — ORDEN DE PRIORIDAD ───────────────────────────────
  // 1º) La fuente más confiable: el objeto permisos que viene del servidor
  if (currentUser?.permisos && typeof currentUser.permisos === 'object') {
    currentPermisos = {
      crearUsuarios:      !!currentUser.permisos.crearUsuarios,
      subirArchivos:      !!currentUser.permisos.subirArchivos,
      modificarArchivos:  !!currentUser.permisos.modificarArchivos,
      eliminarArchivos:   !!currentUser.permisos.eliminarArchivos,
      verOtrasDivisiones: !!currentUser.permisos.verOtrasDivisiones,
    }
    currentDivision = currentUser.division || ''
  }
  // 2º) Usuario con rol ADMIN explícito sin objeto permisos: todos los permisos
  else if (currentUser?.rol === 'ADMIN' || currentUser?.rol === 'Administrador') {
    currentPermisos = {
      crearUsuarios: true, subirArchivos: true,
      modificarArchivos: true, eliminarArchivos: true, verOtrasDivisiones: true,
    }
    currentDivision = currentUser.division || ''
  }
  // 3º) Fallback de seguridad: usuario sin datos de permisos → acceso mínimo
  else {
    currentPermisos = {
      crearUsuarios: false, subirArchivos: true,
      modificarArchivos: true, eliminarArchivos: false, verOtrasDivisiones: false,
    }
    currentDivision = currentUser?.division || ''
  }

  const name = currentUser?.nombre || 'Usuario'
  const firstName = name.split(' ')[0]
  document.getElementById('topbar-welcome').textContent = `Bienvenido, ${firstName}`
  const initial = firstName.charAt(0).toUpperCase()
  document.getElementById('user-avatar-top').textContent = initial

  // Aplicar RBAC a la interfaz antes de mostrar cualquier vista
  applyRBAC()

  navigateTo('inicio')
}

/**
 * Aplica los permisos al DOM de forma defensiva:
 * - Elimina completamente el nav de Configuración si no tiene permiso
 * - Muestra badge visual de acceso limitado
 * Se puede llamar en cualquier momento para re-evaluar.
 */
function applyRBAC() {
  const p = currentPermisos

  // ── Menú lateral: Configuración ──────────────────────────────
  const navConfig = document.getElementById('nav-configuracion')
  if (navConfig) {
    // Doble protección: display none + aria-hidden (impide acceso por teclado)
    if (p.crearUsuarios) {
      navConfig.style.display = ''
      navConfig.removeAttribute('aria-hidden')
      navConfig.removeAttribute('tabindex')
    } else {
      navConfig.style.display = 'none'
      navConfig.setAttribute('aria-hidden', 'true')
      navConfig.setAttribute('tabindex', '-1')
    }
  }

  // ── Badge de usuario limitado en topbar ──────────────────────
  let badge = document.getElementById('rbac-badge')
  const isLimited = !p.crearUsuarios || !p.eliminarArchivos || !p.verOtrasDivisiones
  if (isLimited) {
    if (!badge) {
      badge = document.createElement('span')
      badge.id = 'rbac-badge'
      badge.className = 'rbac-badge'
      badge.title = 'Perfil con acceso restringido'
      badge.textContent = '🔒 Acceso limitado'
      document.querySelector('.topbar-left')?.appendChild(badge)
    }
  } else {
    badge?.remove()
  }
}

if (token && token !== 'demo-token') enterApp()

// ─── SIDEBAR NAVIGATION ───────────────────────────────────────
function navigateTo(view) {
  // ── GUARD DE RUTA: Configuración requiere permiso crear_usuarios ──
  if (view === 'configuracion' && !currentPermisos.crearUsuarios) {
    toast('No tienes permiso para acceder a Configuración', 'error')
    view = 'inicio'
  }

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === view)
  })
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'))
  const target = document.getElementById(`view-${view}`)
  if (target) target.classList.remove('hidden')

  if (view === 'inicio')        loadInicio()
  if (view === 'registros')     { resetNavState(); loadRegistros() }
  if (view === 'actividades')   loadActividades()
  if (view === 'configuracion') loadConfiguracion()
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.onclick = e => {
    e.preventDefault()
    navigateTo(item.dataset.view)
    document.getElementById('sidebar').classList.remove('open')
  }
})

document.getElementById('sidebar-toggle-mobile').onclick = () => {
  document.getElementById('sidebar').classList.toggle('open')
}

// ─── INICIO (DASHBOARD) ──────────────────────────────────────
function loadInicio() {
  document.getElementById('metric-registros').textContent = YEARS.length
  document.getElementById('metric-anio').textContent = new Date().getFullYear()
}

// ═══════════════════════════════════════════════════════════════
// ─── REGISTROS: NAVEGACIÓN JERÁRQUICA 3 NIVELES ───────────────
// ═══════════════════════════════════════════════════════════════

function resetNavState() {
  navState = { year: null, subdir: null, category: null, path: [] }
}

// ── Botón de Regreso Global ───────────────────────────────────
function updateBackButton() {
  const btn = document.getElementById('btn-regresar')
  if (!btn) return
  // Ocultar en raíz (pantalla de Años)
  const isRoot = !navState.year
  btn.classList.toggle('hidden', isRoot)
}

function goBack() {
  // Si hay nodos en el path, retrocede un nodo
  if (navState.path.length > 0) {
    navState.path = navState.path.slice(0, -1)
    renderView()
    return
  }
  // Si hay categoría seleccionada, regresa a subdirección
  if (navState.category !== null) {
    navState.category = null
    navState.path = []
    renderView()
    return
  }
  // Si hay subdirección, regresa al año
  if (navState.subdir !== null) {
    navState.subdir = null
    navState.category = null
    navState.path = []
    renderView()
    return
  }
  // Si hay año, regresa a la raíz (Años)
  if (navState.year !== null) {
    navState.year = null
    navState.subdir = null
    navState.category = null
    navState.path = []
    renderView()
    return
  }
}

// ── Renderiza breadcrumb ──────────────────────────────────────
function renderBreadcrumb() {
  const bc = document.getElementById('breadcrumb')
  if (!bc) return

  const crumbs = []

  // Nivel años (raíz)
  crumbs.push({ label: 'Años', onclick: () => { resetNavState(); loadRegistros() } })

  if (navState.year) {
    crumbs.push({ label: String(navState.year), onclick: () => {
      navState.subdir = null; navState.category = null; navState.path = []
      renderView()
    }})
  }
  if (navState.subdir) {
    crumbs.push({ label: navState.subdir, onclick: () => {
      navState.category = null; navState.path = []
      renderView()
    }})
  }
  if (navState.category) {
    const catLabel = navState.category === 'sustantivas' ? 'FUNCIONES SUSTANTIVAS' : 'FUNCIONES COMUNES'
    crumbs.push({ label: catLabel, onclick: () => {
      navState.path = []
      renderView()
    }})
  }
  // Nodos de path
  navState.path.forEach((node, idx) => {
    const captured = idx
    crumbs.push({ label: `${node.code} ${node.name}`, onclick: () => {
      navState.path = navState.path.slice(0, captured + 1)
      renderView()
    }})
  })

  bc.innerHTML = crumbs.map((c, i) => {
    const isLast = i === crumbs.length - 1
    return isLast
      ? `<span class="bc-current">${c.label}</span>`
      : `<button class="bc-btn" onclick="(${c.onclick.toString()})()">${c.label}</button><span class="bc-sep">›</span>`
  }).join('')

  // Sincronizar boton de regreso con breadcrumb
  updateBackButton()
}

// ── Router principal ──────────────────────────────────────────
function renderView() {
  renderBreadcrumb()
  const content = document.getElementById('registros-content')

  if (!navState.year) {
    renderYears(content)
  } else if (!navState.subdir) {
    renderSubdirecciones(content)
  } else if (!navState.category) {
    renderCategories(content)
  } else if (navState.path.length === 0) {
    renderRootFolders(content)
  } else {
    const currentNode = navState.path[navState.path.length - 1]
    renderFolderChildren(content, currentNode)
  }
}

// ── Nivel 1: Años ────────────────────────────────────────────
function loadRegistros() {
  resetNavState()
  renderView()
}

function renderYears(container) {
  const canAdd    = currentPermisos.subirArchivos
  const canDelete = currentPermisos.eliminarArchivos

  container.innerHTML = `
    <div class="section-header">
      <h3 class="section-title">Selecciona un Año</h3>
      <p class="section-sub">Años disponibles en el sistema documental</p>
    </div>
    <div class="years-grid" id="years-grid">
      ${YEARS.map(y => `
        <button class="year-btn" data-year="${y}" id="yr-${y}" onclick="selectYear(${y})">${y}</button>
      `).join('')}
    </div>
    <div class="registros-actions">
      ${canAdd    ? `<button class="btn btn-purple" id="btn-add-registro">+ Añadir Registro</button>` : ''}
      ${canDelete ? `<button class="btn btn-orange" id="btn-borrar-registro">🗑 Borrar</button>` : ''}
      ${!canAdd && !canDelete ? `<p class="rbac-notice">Modo solo lectura</p>` : ''}
    </div>`

  if (canAdd)    document.getElementById('btn-add-registro')?.addEventListener('click', openAddRegistroModal)
  if (canDelete) document.getElementById('btn-borrar-registro')?.addEventListener('click', borrarRegistro)
}

function selectYear(year) {
  navState.year = year
  renderView()
}

// ── Nivel 2: Subdirecciones ───────────────────────────────────
function renderSubdirecciones(container) {
  const icons = ['📚', '📋', '🏛️', '🌐']
  container.innerHTML = `
    <div class="section-header">
      <h3 class="section-title">Año: ${navState.year}</h3>
      <p class="section-sub">Selecciona una subdirección</p>
    </div>
    <div class="folder-grid subdir-grid">
      ${SUBDIRECCIONES.map((s, i) => `
        <button class="folder-card" onclick="selectSubdir('${s.replace(/'/g, "\\'")}')">
          <span class="folder-icon">${icons[i]}</span>
          <span class="folder-name">${s}</span>
        </button>
      `).join('')}
    </div>`
}

function selectSubdir(subdir) {
  navState.subdir = subdir
  renderView()
}

// ── Nivel 3: Categorías (Sustantivas / Comunes) ───────────────
function renderCategories(container) {
  container.innerHTML = `
    <div class="section-header">
      <h3 class="section-title">${navState.subdir}</h3>
      <p class="section-sub">Selecciona el tipo de funciones</p>
    </div>
    <div class="folder-grid cat-grid">
      <button class="folder-card cat-sustantiva" onclick="selectCategory('sustantivas')">
        <span class="folder-icon">📁</span>
        <span class="folder-name">FUNCIONES SUSTANTIVAS</span>
        <span class="folder-badge">${FUNCIONES_SUSTANTIVAS.length} secciones</span>
      </button>
      <button class="folder-card cat-comun" onclick="selectCategory('comunes')">
        <span class="folder-icon">📂</span>
        <span class="folder-name">FUNCIONES COMUNES</span>
        <span class="folder-badge">${FUNCIONES_COMUNES.length} secciones</span>
      </button>
    </div>`
}

function selectCategory(cat) {
  navState.category = cat
  navState.path = []
  renderView()
}

// ── Nivel 4+: Carpetas raíz de la categoría ──────────────────
function renderRootFolders(container) {
  const list = navState.category === 'sustantivas' ? FUNCIONES_SUSTANTIVAS : FUNCIONES_COMUNES
  const catLabel = navState.category === 'sustantivas' ? 'FUNCIONES SUSTANTIVAS' : 'FUNCIONES COMUNES'

  container.innerHTML = `
    <div class="section-header">
      <h3 class="section-title">${catLabel}</h3>
    </div>
    <div class="folder-list">
      ${list.map(node => folderItemHTML(node)).join('')}
    </div>`
}

// ── Renderiza hijos de un nodo ────────────────────────────────
function renderFolderChildren(container, node) {
  if (!node.children || node.children.length === 0) {
    container.innerHTML = `
      <div class="section-header">
        <h3 class="section-title">${node.code} ${node.name}</h3>
      </div>
      <div class="terminal-folder">
        <div class="terminal-folder-icon">📄</div>
        <p class="terminal-folder-title">Carpeta de archivo terminal</p>
        <p class="terminal-folder-sub">Aquí se almacenan los documentos de esta serie documental.</p>
        <div class="terminal-folder-meta">
          <span class="terminal-chip">📂 Serie: <strong>${node.code}</strong></span>
          <span class="terminal-chip">🗂 ${node.name}</span>
        </div>
      </div>`
    return
  }

  container.innerHTML = `
    <div class="section-header">
      <h3 class="section-title">${node.code} ${node.name}</h3>
    </div>
    <div class="folder-list">
      ${node.children.map(child => folderItemHTML(child)).join('')}
    </div>`
}

// ── HTML de un ítem de carpeta ────────────────────────────────
function folderItemHTML(node) {
  const hasChildren = node.children && node.children.length > 0
  const icon = hasChildren ? '📁' : '📄'
  const arrow = hasChildren ? '<span class="folder-arrow">›</span>' : ''
  return `
    <button class="folder-row${hasChildren ? ' has-children' : ''}"
            onclick="openFolder('${node.code.replace(/'/g, "\\'")}', '${node.name.replace(/'/g, "\\'")}', ${hasChildren})">
      <span class="folder-row-icon">${icon}</span>
      <span class="folder-row-code">${node.code}</span>
      <span class="folder-row-name">${node.name}</span>
      ${arrow}
    </button>`
}

// ── Navegar a un nodo ─────────────────────────────────────────
function openFolder(code, name, hasChildren) {
  // Buscar el nodo real en el árbol
  const list = navState.category === 'sustantivas' ? FUNCIONES_SUSTANTIVAS : FUNCIONES_COMUNES

  let node = null
  if (navState.path.length === 0) {
    node = list.find(n => n.code === code)
  } else {
    const parent = navState.path[navState.path.length - 1]
    node = (parent.children || []).find(n => n.code === code)
  }

  if (!node) return

  navState.path.push(node)
  renderView()
}

// ═══════════════════════════════════════════════════════════════
// ─── MODALES REGISTROS ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
function openAddRegistroModal() {
  openModal('Añadir Registro', `
    <div class="field-group">
      <label>Año</label>
      <input id="m-anio" type="number" min="2000" max="2099" value="${new Date().getFullYear()}" placeholder="2026" />
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-purple" id="btn-save-registro">Guardar</button>`)
  document.getElementById('btn-save-registro').onclick = () => {
    const anio = parseInt(document.getElementById('m-anio').value)
    if (anio && !YEARS.includes(anio)) {
      YEARS.push(anio)
      YEARS.sort((a, b) => a - b)
    }
    closeModal()
    toast('Registro añadido', 'success')
    resetNavState()
    renderView()
  }
}

function borrarRegistro() {
  if (!navState.year) {
    toast('Primero entra a un año para seleccionarlo', 'info')
    return
  }
  if (!confirm(`¿Eliminar registros del año ${navState.year}?`)) return
  const idx = YEARS.indexOf(navState.year)
  if (idx !== -1) YEARS.splice(idx, 1)
  const borrado = navState.year
  resetNavState()
  toast(`Año ${borrado} eliminado`, 'success')
  renderView()
}

// ─── REGISTRO DE ACTIVIDADES ──────────────────────────────────
async function loadActividades() {
  const tbody = document.getElementById('tbody-actividades')
  tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Cargando...</td></tr>'

  let rows = []
  try {
    // Si el usuario NO puede ver otras divisiones, filtrar por la suya en el backend
    const divFilter = !currentPermisos.verOtrasDivisiones && currentDivision
      ? `&division=${encodeURIComponent(currentDivision)}`
      : ''
    const res = await api('GET', `/actividades?limit=50${divFilter}`)
    rows = res.data || []
  } catch {
    rows = SAMPLE_ACTIVIDADES
    // Filtro de división en modo demo/local
    if (!currentPermisos.verOtrasDivisiones && currentDivision) {
      rows = rows.filter(r =>
        (r.division || '').toLowerCase() === currentDivision.toLowerCase() ||
        (r.subdivision || '').toLowerCase().includes(currentDivision.toLowerCase())
      )
    }
  }

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Sin registros de actividad</td></tr>'
    return
  }

  // Almacenar filas en scope para acceso desde el modal
  window._actividadesRows = rows

  const canModify = currentPermisos.modificarArchivos

  // Banner de solo lectura
  const sectionCard = tbody.closest('.section-card')
  let readBanner = sectionCard?.querySelector('.rbac-readonly-banner')
  if (!canModify) {
    if (!readBanner) {
      readBanner = document.createElement('div')
      readBanner.className = 'rbac-readonly-banner'
      readBanner.innerHTML = '🔒 <strong>Modo solo lectura</strong> — No tienes permiso para modificar archivos.'
      sectionCard?.insertBefore(readBanner, sectionCard.firstChild)
    }
  } else if (readBanner) {
    readBanner.remove()
  }

  tbody.innerHTML = rows.map((r, idx) => {
    const archivo    = r.archivo    || r.nombreArchivo  || '—'
    const serie      = r.serie      || r.serieDocumental || '—'
    const subdivision= r.subdivision|| r.subdirección   || '—'
    const encargado  = r.encargado  || '—'
    const fecha      = r.fecha      || r.fechaSubida    || '—'
    const hora       = r.hora       || ''
    const fechaHora  = hora ? `${fecha} — ${hora}` : fecha

    // El enlace de serie es siempre cliqueable (solo lectura del detalle)
    return `
    <tr class="actividad-row${!canModify ? ' row-readonly' : ''}" data-idx="${idx}">
      <td>${archivo}</td>
      <td>
        <button class="serie-link" onclick="openActividadDetail(${idx})">${serie}</button>
      </td>
      <td>${subdivision}</td>
      <td>${encargado}</td>
      <td class="fecha-col">${fechaHora}</td>
    </tr>`
  }).join('')
}

// ─── DETALLE DE ACTIVIDAD (MODAL) ─────────────────────────────
function openActividadDetail(idx) {
  const rows = window._actividadesRows || SAMPLE_ACTIVIDADES
  const r = rows[idx]
  if (!r) return

  const archivo    = r.archivo    || r.nombreArchivo  || '—'
  const serie      = r.serie      || r.serieDocumental || '—'
  const subdivision= r.subdivision|| r.subdirección   || '—'
  const encargado  = r.encargado  || '—'
  const division   = r.division   || '—'
  const fecha      = r.fecha      || r.fechaSubida    || '—'
  const hora       = r.hora       || '—'

  // Inicial del encargado para el avatar
  const inicial = encargado.charAt(0).toUpperCase()

  const bodyHTML = `
    <div class="detail-section">
      <div class="detail-section-title">📄 Información del Archivo</div>
      <div class="detail-row">
        <span class="detail-label">Nombre del archivo</span>
        <span class="detail-value">${archivo}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Serie documental</span>
        <span class="detail-value detail-serie">${serie}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Subdivisión</span>
        <span class="detail-value">${subdivision}</span>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">👤 Perfil del Encargado</div>
      <div class="detail-encargado-card">
        <div class="detail-avatar">${inicial}</div>
        <div class="detail-encargado-info">
          <div class="detail-encargado-name">${encargado}</div>
          <div class="detail-encargado-div">${division}</div>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">🕐 Registro de Tiempo</div>
      <div class="detail-time-row">
        <div class="detail-time-block">
          <span class="detail-time-label">Fecha</span>
          <span class="detail-time-value">${fecha}</span>
        </div>
        <div class="detail-time-divider"></div>
        <div class="detail-time-block">
          <span class="detail-time-label">Hora de subida</span>
          <span class="detail-time-value">${hora}</span>
        </div>
      </div>
    </div>`

  const footerHTML = `
    <button class="btn btn-regresar" onclick="closeModal()">
      <span class="back-arrow">←</span> Regresar
    </button>`

  openModal('Ficha de Registro', bodyHTML, footerHTML)
}

// ─── CONFIGURACIÓN ────────────────────────────────────────────
function loadConfiguracion() {}

// ─── MAPEO DE PERMISOS POR ROL ────────────────────────────────
// Define los permisos predeterminados que activa cada rol del selector.
// Estos valores se aplican automáticamente al cambiar el <select>;
// el administrador puede editarlos manualmente DESPUÉS del autocompletado.
const ROLES_PERMISOS = {
  Administrador: {
    crearUsuarios:      true,
    subirArchivos:      true,
    modificarArchivos:  true,
    eliminarArchivos:   true,
    verOtrasDivisiones: true,
  },
  'Gestor de Archivos': {
    crearUsuarios:      false,
    subirArchivos:      true,
    modificarArchivos:  true,
    eliminarArchivos:   false,
    verOtrasDivisiones: true,
  },
  'Usuario de Consulta': {
    crearUsuarios:      false,
    subirArchivos:      false,
    modificarArchivos:  false,
    eliminarArchivos:   false,
    verOtrasDivisiones: true,
  },
}

/**
 * Aplica el mapa de permisos de un rol a los checkboxes del modal.
 * Se ejecuta cada vez que el <select> de Rol cambia.
 * No bloquea la edición manual posterior del usuario.
 * @param {string} rol - Nombre del rol seleccionado (clave de ROLES_PERMISOS)
 */
function aplicarPermisosDeRol(rol) {
  const mapa = ROLES_PERMISOS[rol]
  if (!mapa) return

  document.getElementById('perm-crear-usuarios').checked      = mapa.crearUsuarios
  document.getElementById('perm-subir-archivos').checked      = mapa.subirArchivos
  document.getElementById('perm-modificar-archivos').checked  = mapa.modificarArchivos
  document.getElementById('perm-eliminar-archivos').checked   = mapa.eliminarArchivos
  document.getElementById('perm-ver-otras-divisiones').checked = mapa.verOtrasDivisiones
}

document.getElementById('btn-config-usuarios').onclick = () => {
  openModal('Creación de Usuarios', `
    <div class="field-group">
      <label>División / Departamento</label>
      <input id="m-division" placeholder="Ej. Subdirección de Academia" />
    </div>
    <div class="field-group">
      <label>Nombre completo del encargado</label>
      <input id="m-encargado" placeholder="Ej. María García López" />
    </div>
    <div class="field-group">
      <label>Nombre de usuario</label>
      <input id="m-username" placeholder="Ej. mgarcia (se añade @itse.edu.mx)" />
    </div>
    <div class="field-group">
      <label>Contraseña</label>
      <input type="password" id="m-pass" placeholder="Mínimo 6 caracteres" />
    </div>
    <div class="field-group">
      <label>Rol</label>
      <select id="m-rol">
        <option value="">— Selecciona un rol —</option>
        <option value="Administrador">Administrador</option>
        <option value="Gestor de Archivos">Gestor de Archivos</option>
        <option value="Usuario de Consulta">Usuario de Consulta</option>
      </select>
    </div>
    <div class="perm-group">
      <label>Permisos (RBAC) <small style="font-weight:400;opacity:.7">— ajustables manualmente</small></label>
      <label class="perm-check"><input type="checkbox" id="perm-crear-usuarios" /> Creación de usuarios</label>
      <label class="perm-check"><input type="checkbox" id="perm-subir-archivos" /> Subir archivos</label>
      <label class="perm-check"><input type="checkbox" id="perm-modificar-archivos" /> Modificar archivos</label>
      <label class="perm-check"><input type="checkbox" id="perm-eliminar-archivos" /> Eliminar archivos</label>
      <label class="perm-check"><input type="checkbox" id="perm-ver-otras-divisiones" /> Ver archivos de otras subdivisiones</label>
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-purple" id="btn-save-user">Crear Usuario</button>`)

  // ── Evento onChange del selector de Rol ──────────────────────
  // Al cambiar el rol se autocompleatan los checkboxes según ROLES_PERMISOS.
  // El usuario puede ajustar cualquier checkbox manualmente después.
  document.getElementById('m-rol').addEventListener('change', function () {
    aplicarPermisosDeRol(this.value)
  })

  // ── Guardar usuario ──────────────────────────────────────────
  // Se leen los estados INDIVIDUALES de cada checkbox (no solo el nombre del rol),
  // garantizando que las modificaciones manuales posteriores al autocompletado
  // se envíen fielmente al backend y a la validación del menú lateral.
  document.getElementById('btn-save-user').onclick = async () => {
    const username  = document.getElementById('m-username').value.trim()
    const pass      = document.getElementById('m-pass').value
    const nombre    = document.getElementById('m-encargado').value.trim()
    const division  = document.getElementById('m-division').value.trim()
    const rol       = document.getElementById('m-rol').value

    if (!username || !pass || !nombre) {
      toast('Completa los campos obligatorios (nombre, usuario y contraseña)', 'error')
      return
    }

    // Leer los 5 checkboxes individualmente — no se usa el rol como fuente de verdad,
    // así se respetan los ajustes manuales hechos por el administrador.
    const permisos = {
      crearUsuarios:      document.getElementById('perm-crear-usuarios').checked,
      subirArchivos:      document.getElementById('perm-subir-archivos').checked,
      modificarArchivos:  document.getElementById('perm-modificar-archivos').checked,
      eliminarArchivos:   document.getElementById('perm-eliminar-archivos').checked,
      verOtrasDivisiones: document.getElementById('perm-ver-otras-divisiones').checked,
    }

    try {
      // Se envía el rol como referencia semántica + los 5 booleanos de permisos
      // para que el backend pueda validar ambos niveles (rol y permiso granular).
      await api('POST', '/usuarios', { username, password: pass, nombre, division, rol, ...permisos })
      closeModal()
      toast(`Usuario "${nombre}" creado correctamente`, 'success')
    } catch (err) {
      if (err?.status === 409) {
        toast('Ese nombre de usuario ya existe', 'error')
      } else if (err?.status === 403) {
        toast('No tienes permiso para crear usuarios', 'error')
        closeModal()
      } else {
        closeModal()
        toast('Usuario guardado (modo demo)', 'success')
      }
    }
  }
}

document.getElementById('btn-config-series').onclick = () => {
  openModal('Creación de Series Documentales', `
    <div class="field-group">
      <label>Código de la serie</label>
      <input id="m-codigo" placeholder="Ej. SD-2026-001" />
    </div>
    <div class="field-group">
      <label>Encargado de la subdivisión</label>
      <input id="m-enc-serie" placeholder="Nombre del encargado" />
    </div>
    <div class="field-group">
      <label>Fecha de creación</label>
      <input type="date" id="m-fcreacion" />
    </div>
    <div class="field-group">
      <label>Fecha de vencimiento</label>
      <input type="date" id="m-fvencimiento" />
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-purple" id="btn-save-serie">Crear Serie</button>`)
  document.getElementById('btn-save-serie').onclick = async () => {
    const codigo = document.getElementById('m-codigo').value
    if (!codigo) { toast('Ingresa el código de la serie', 'error'); return }
    try {
      await api('POST', '/series-documentales', {
        codigo,
        encargado: document.getElementById('m-enc-serie').value,
        fechaCreacion: document.getElementById('m-fcreacion').value,
        fechaVencimiento: document.getElementById('m-fvencimiento').value,
      })
      closeModal(); toast('Serie documental creada', 'success')
    } catch {
      closeModal(); toast('Serie guardada (modo demo)', 'success')
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// ─── MÓDULO: ADMINISTRACIÓN DE USUARIOS ───────────────────────
// ═══════════════════════════════════════════════════════════════

/**
 * Cambia la pestaña activa dentro de la vista de Configuración.
 * Al activar la pestaña de usuarios verifica el permiso crearUsuarios
 * antes de cargar la tabla (doble protección: la primera es la ruta).
 * @param {'general'|'usuarios'} tab
 */
function switchCfgTab(tab) {
  // Actualizar pestañas
  document.querySelectorAll('.cfg-tab').forEach(t => t.classList.remove('active'))
  document.querySelectorAll('.cfg-panel').forEach(p => p.classList.add('hidden'))

  document.getElementById(`cfg-tab-${tab}`)?.classList.add('active')
  document.getElementById(`cfg-panel-${tab}`)?.classList.remove('hidden')

  // Cargar datos al activar la pestaña de usuarios
  if (tab === 'usuarios') {
    // Guardia de seguridad: solo administradores con crearUsuarios=true
    if (!currentPermisos.crearUsuarios) {
      toast('No tienes permiso para administrar usuarios', 'error')
      switchCfgTab('general')
      return
    }
    loadUsuariosAdmin()
  }
}

// ── Datos demo para modo offline ──────────────────────────────
const DEMO_USUARIOS = [
  {
    id: 'demo-1',
    username: 'jgarcia',
    nombre: 'Jesús García López',
    division: 'Dirección General',
    rol: 'Administrador',
    permisos: { crearUsuarios: true, subirArchivos: true, modificarArchivos: true, eliminarArchivos: true, verOtrasDivisiones: true },
  },
  {
    id: 'demo-2',
    username: 'rmendez',
    nombre: 'Rosa Méndez Juárez',
    division: 'Subdirección de Academia',
    rol: 'Gestor de Archivos',
    permisos: { crearUsuarios: false, subirArchivos: true, modificarArchivos: true, eliminarArchivos: false, verOtrasDivisiones: true },
  },
  {
    id: 'demo-3',
    username: 'aperez',
    nombre: 'Ana Pérez Castillo',
    division: 'Subdirección de Extensión',
    rol: 'Usuario de Consulta',
    permisos: { crearUsuarios: false, subirArchivos: false, modificarArchivos: false, eliminarArchivos: false, verOtrasDivisiones: true },
  },
  {
    id: 'demo-4',
    username: 'chernandez',
    nombre: 'Carlos Hernández Ruiz',
    division: 'Subdirección de Administración',
    rol: 'Gestor de Archivos',
    permisos: { crearUsuarios: false, subirArchivos: true, modificarArchivos: true, eliminarArchivos: false, verOtrasDivisiones: true },
  },
]

// Caché local de usuarios para operaciones de edición/eliminación sin reload
let _usuariosCache = []

/**
 * Carga la lista de usuarios desde la API.
 * Si el servidor no responde (modo demo), usa DEMO_USUARIOS.
 * Siempre verifica el permiso crearUsuarios antes de proceder.
 */
async function loadUsuariosAdmin() {
  if (!currentPermisos.crearUsuarios) return

  const tbody = document.getElementById('tbody-usuarios-admin')
  if (!tbody) return
  tbody.innerHTML = '<tr><td colspan="5" class="table-empty">⏳ Cargando usuarios...</td></tr>'

  try {
    const res = await api('GET', '/usuarios')
    _usuariosCache = res.data || []
  } catch {
    // Modo demo: usar datos de muestra
    _usuariosCache = DEMO_USUARIOS.map(u => ({ ...u }))
  }

  renderUsuariosAdmin(_usuariosCache)
}

/**
 * Convierte el nombre de un rol en el class CSS correspondiente para el chip.
 * @param {string} rol
 * @returns {'admin'|'gestor'|'consulta'|'default'}
 */
function rolToChipClass(rol) {
  const r = (rol || '').toLowerCase()
  if (r.includes('admin'))    return 'admin'
  if (r.includes('gestor'))   return 'gestor'
  if (r.includes('consulta')) return 'consulta'
  return 'default'
}

/**
 * Devuelve el emoji indicador del rol.
 * @param {string} chipClass
 */
function rolEmoji(chipClass) {
  return { admin: '🛡️', gestor: '📋', consulta: '👁️', default: '👤' }[chipClass] || '👤'
}

/**
 * Renderiza la tabla de usuarios con los datos del array proporcionado.
 * @param {Array} usuarios
 */
function renderUsuariosAdmin(usuarios) {
  const tbody = document.getElementById('tbody-usuarios-admin')
  if (!tbody) return

  if (!usuarios.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Sin usuarios registrados en el sistema</td></tr>'
    return
  }

  tbody.innerHTML = usuarios.map((u, idx) => {
    const username  = u.username || u.email?.split('@')[0] || '—'
    const nombre    = u.nombre   || '—'
    const division  = u.division || '—'
    const rol       = u.rol      || '—'
    const chipClass = rolToChipClass(rol)
    const emoji     = rolEmoji(chipClass)

    return `
    <tr data-idx="${idx}">
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="
            width:28px;height:28px;border-radius:50%;
            background:var(--guinda);color:#fff;
            display:flex;align-items:center;justify-content:center;
            font-size:11px;font-weight:700;flex-shrink:0;">
            ${username.charAt(0).toUpperCase()}
          </div>
          <span style="font-size:12.5px;font-weight:600;color:#333;">${username}</span>
        </div>
      </td>
      <td style="font-size:12.5px;color:#444;">${nombre}</td>
      <td style="font-size:12px;color:var(--gray-600);">${division}</td>
      <td>
        <span class="rol-chip ${chipClass}">${emoji} ${rol}</span>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-action-edit"
                  title="Editar permisos de ${nombre}"
                  onclick="openEditUsuarioModal(${idx})">✏️</button>
          <button class="btn-action-delete"
                  title="Eliminar usuario ${username}"
                  onclick="confirmDeleteUsuario(${idx})">🗑️</button>
        </div>
      </td>
    </tr>`
  }).join('')
}

/**
 * Abre el modal de edición de permisos para un usuario existente.
 * Pre-carga todos los campos y checkboxes con los datos actuales.
 * @param {number} idx - Índice en _usuariosCache
 */
function openEditUsuarioModal(idx) {
  const u = _usuariosCache[idx]
  if (!u) return

  const p = u.permisos || {}

  openModal(`✏️ Editar Usuario — ${u.username || ''}`, `
    <div class="field-group">
      <label>División / Departamento</label>
      <input id="eu-division" value="${u.division || ''}" placeholder="Ej. Subdirección de Academia" />
    </div>
    <div class="field-group">
      <label>Nombre completo del encargado</label>
      <input id="eu-nombre" value="${u.nombre || ''}" placeholder="Ej. María García López" />
    </div>
    <div class="field-group">
      <label>Nombre de usuario <small style="font-weight:400;opacity:.65">(no editable)</small></label>
      <input id="eu-username" value="${u.username || ''}" disabled
             style="background:#f8fafc;color:var(--gray-600);cursor:not-allowed;" />
    </div>
    <div class="field-group">
      <label>Rol</label>
      <select id="eu-rol">
        <option value="">— Sin rol definido —</option>
        <option value="Administrador"     ${u.rol === 'Administrador'       ? 'selected' : ''}>Administrador</option>
        <option value="Gestor de Archivos"${u.rol === 'Gestor de Archivos'  ? 'selected' : ''}>Gestor de Archivos</option>
        <option value="Usuario de Consulta"${u.rol === 'Usuario de Consulta'? 'selected' : ''}>Usuario de Consulta</option>
      </select>
    </div>
    <div class="perm-group">
      <label>Permisos (RBAC) <small style="font-weight:400;opacity:.7">— ajustables manualmente</small></label>
      <label class="perm-check">
        <input type="checkbox" id="eu-perm-crear-usuarios"      ${p.crearUsuarios      ? 'checked' : ''} />
        Creación de usuarios
      </label>
      <label class="perm-check">
        <input type="checkbox" id="eu-perm-subir-archivos"      ${p.subirArchivos      ? 'checked' : ''} />
        Subir archivos
      </label>
      <label class="perm-check">
        <input type="checkbox" id="eu-perm-modificar-archivos"  ${p.modificarArchivos  ? 'checked' : ''} />
        Modificar archivos
      </label>
      <label class="perm-check">
        <input type="checkbox" id="eu-perm-eliminar-archivos"   ${p.eliminarArchivos   ? 'checked' : ''} />
        Eliminar archivos
      </label>
      <label class="perm-check">
        <input type="checkbox" id="eu-perm-ver-otras-divisiones"${p.verOtrasDivisiones ? 'checked' : ''} />
        Ver archivos de otras subdivisiones
      </label>
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-purple" id="btn-save-edit-user">Guardar Cambios</button>`)

  // onChange del selector de rol en modo edición (reutiliza el mapa ROLES_PERMISOS)
  // El prefijo de los IDs cambia de 'perm-' a 'eu-perm-' para no colisionar con el modal de creación
  document.getElementById('eu-rol').addEventListener('change', function () {
    const mapa = ROLES_PERMISOS[this.value]
    if (!mapa) return
    document.getElementById('eu-perm-crear-usuarios').checked       = mapa.crearUsuarios
    document.getElementById('eu-perm-subir-archivos').checked       = mapa.subirArchivos
    document.getElementById('eu-perm-modificar-archivos').checked   = mapa.modificarArchivos
    document.getElementById('eu-perm-eliminar-archivos').checked    = mapa.eliminarArchivos
    document.getElementById('eu-perm-ver-otras-divisiones').checked = mapa.verOtrasDivisiones
  })

  // Guardar cambios del usuario editado
  document.getElementById('btn-save-edit-user').onclick = async () => {
    const nombre   = document.getElementById('eu-nombre').value.trim()
    const division = document.getElementById('eu-division').value.trim()
    const rol      = document.getElementById('eu-rol').value

    if (!nombre) {
      toast('El nombre del encargado es obligatorio', 'error')
      return
    }

    // Leer permisos individuales de los checkboxes (fuente de verdad)
    const permisos = {
      crearUsuarios:      document.getElementById('eu-perm-crear-usuarios').checked,
      subirArchivos:      document.getElementById('eu-perm-subir-archivos').checked,
      modificarArchivos:  document.getElementById('eu-perm-modificar-archivos').checked,
      eliminarArchivos:   document.getElementById('eu-perm-eliminar-archivos').checked,
      verOtrasDivisiones: document.getElementById('eu-perm-ver-otras-divisiones').checked,
    }

    try {
      const uid = u.id || u._id || u.username
      await api('PATCH', `/usuarios/${uid}`, { nombre, division, rol, ...permisos })
      // Actualizar caché local
      _usuariosCache[idx] = { ...u, nombre, division, rol, permisos }
      renderUsuariosAdmin(_usuariosCache)
      closeModal()
      toast(`Permisos de "${u.username}" actualizados correctamente`, 'success')
    } catch (err) {
      if (err?.status === 403) {
        toast('No tienes permiso para editar usuarios', 'error')
        closeModal()
      } else {
        // Modo demo: actualizar solo el caché local
        _usuariosCache[idx] = { ...u, nombre, division, rol, permisos }
        renderUsuariosAdmin(_usuariosCache)
        closeModal()
        toast(`Cambios guardados (modo demo)`, 'success')
      }
    }
  }
}

/**
 * Muestra el modal institucional de confirmación antes de eliminar un usuario.
 * Usa el modal genérico del sistema en lugar de window.confirm() nativo.
 * @param {number} idx - Índice en _usuariosCache
 */
function confirmDeleteUsuario(idx) {
  const u = _usuariosCache[idx]
  if (!u) return

  const username = u.username || '—'
  const nombre   = u.nombre   || '—'

  openModal('Confirmar Eliminación', `
    <div class="confirm-modal-body">
      <div class="confirm-modal-icon">⚠️</div>
      <div class="confirm-modal-title">Eliminar usuario del sistema</div>
      <p class="confirm-modal-text">
        Esta acción es <strong>irreversible</strong>. El usuario perderá
        completamente el acceso al sistema ArchivaTEC.
      </p>
      <div class="confirm-modal-user-badge">
        👤 ${username} — ${nombre}
      </div>
      <p class="confirm-modal-text" style="font-size:12px;color:#b91c1c;">
        ¿Estás seguro de que deseas continuar?
      </p>
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-orange" id="btn-confirm-delete">🗑️ Eliminar definitivamente</button>`)

  document.getElementById('btn-confirm-delete').onclick = async () => {
    try {
      const uid = u.id || u._id || u.username
      await api('DELETE', `/usuarios/${uid}`)
      _usuariosCache.splice(idx, 1)
      renderUsuariosAdmin(_usuariosCache)
      closeModal()
      toast(`Usuario "${username}" eliminado del sistema`, 'success')
    } catch (err) {
      if (err?.status === 403) {
        toast('No tienes permiso para eliminar usuarios', 'error')
        closeModal()
      } else {
        // Modo demo: eliminar del caché local
        _usuariosCache.splice(idx, 1)
        renderUsuariosAdmin(_usuariosCache)
        closeModal()
        toast(`Usuario "${username}" eliminado (modo demo)`, 'success')
      }
    }
  }
}
