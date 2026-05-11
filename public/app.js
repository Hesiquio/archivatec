const API = '/api/v1'
let token = localStorage.getItem('token') || ''
let currentUser = null

// ─── API Helper ───────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (token) opts.headers['Authorization'] = `Bearer ${token}`
  if (body) opts.body = JSON.stringify(body)
  const r = await fetch(API + path, opts)
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw { status: r.status, message: data.error || 'Error' }
  return data
}

// ─── Toast ────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' }
  const el = document.createElement('div')
  el.className = `toast ${type}`
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`
  document.getElementById('toast-container').appendChild(el)
  setTimeout(() => el.remove(), 3500)
}

// ─── Status chips ─────────────────────────────────────────────────
const STATUS_COLORS = {
  ACTIVA: 'green', ACTIVO: 'green', COMPLETADO: 'green', VERIFICADO: 'green', DEVUELTO: 'green',
  EN_PROCESO: 'blue', PRESTADO: 'blue', EN_PRESTAMO: 'blue', EN_DIGITALIZACION: 'blue',
  PENDIENTE: 'orange', INACTIVA: 'gray', CERRADO: 'gray', DADA_DE_BAJA: 'gray',
  VENCIDO: 'red', FALLIDO: 'red', TRANSFERIDO: 'purple', DIGITALIZADO: 'purple',
  ALUMNO: 'blue', DOCENTE: 'purple', ADMINISTRATIVO: 'orange', PROYECTO: 'green', CONVENIO: 'green',
}
function chip(val) {
  const c = STATUS_COLORS[val] || 'gray'
  return `<span class="chip chip-${c}">${val.replace(/_/g,' ')}</span>`
}
function fdate(d) { return d ? new Date(d).toLocaleDateString('es-MX') : '—' }
function trunc(s, n=30) { return s && s.length > n ? s.slice(0,n)+'…' : (s||'—') }

// ─── Modal ────────────────────────────────────────────────────────
function openModal(title, bodyHTML, footerHTML) {
  document.getElementById('modal-title').textContent = title
  document.getElementById('modal-body').innerHTML = bodyHTML
  document.getElementById('modal-footer').innerHTML = footerHTML || ''
  document.getElementById('modal-overlay').classList.remove('hidden')
}
function closeModal() { document.getElementById('modal-overlay').classList.add('hidden') }
document.getElementById('modal-close').onclick = closeModal
document.getElementById('modal-overlay').onclick = e => { if (e.target.id === 'modal-overlay') closeModal() }

// ─── AUTH ─────────────────────────────────────────────────────────
document.getElementById('toggle-pw').onclick = () => {
  const inp = document.getElementById('password')
  inp.type = inp.type === 'password' ? 'text' : 'password'
}

document.getElementById('login-form').onsubmit = async e => {
  e.preventDefault()
  const btn = document.getElementById('login-btn')
  const err = document.getElementById('login-error')
  btn.querySelector('.btn-text').classList.add('hidden')
  btn.querySelector('.btn-loader').classList.remove('hidden')
  btn.disabled = true
  err.classList.add('hidden')
  try {
    const res = await api('POST', '/auth/login', {
      email: document.getElementById('email').value,
      password: document.getElementById('password').value,
    })
    token = res.data.token
    localStorage.setItem('token', token)
    currentUser = res.data.usuario
    enterApp()
  } catch (ex) {
    err.textContent = ex.message || 'Credenciales incorrectas'
    err.classList.remove('hidden')
  } finally {
    btn.querySelector('.btn-text').classList.remove('hidden')
    btn.querySelector('.btn-loader').classList.add('hidden')
    btn.disabled = false
  }
}

document.getElementById('logout-btn').onclick = () => {
  token = ''; localStorage.removeItem('token'); currentUser = null
  document.getElementById('app').classList.add('hidden')
  document.getElementById('login-screen').classList.remove('hidden')
}

// ─── APP INIT ─────────────────────────────────────────────────────
async function enterApp() {
  document.getElementById('login-screen').classList.add('hidden')
  document.getElementById('app').classList.remove('hidden')
  if (!currentUser) {
    try { const r = await api('GET', '/auth/me'); currentUser = r.data } catch { return }
  }
  const initials = currentUser.nombre.split(' ').map(w => w[0]).join('').slice(0,2)
  document.getElementById('user-avatar').textContent = initials
  document.getElementById('user-avatar-top').textContent = initials
  document.getElementById('user-name-sidebar').textContent = currentUser.nombre
  document.getElementById('user-role-sidebar').textContent = currentUser.rol
  document.getElementById('user-name-top').textContent = currentUser.nombre.split(' ')[0]
  loadDashboard()
}

if (token) enterApp()

// ─── NAVIGATION ───────────────────────────────────────────────────
const TITLES = {
  dashboard: ['Dashboard', 'Resumen del sistema'],
  ubicaciones: ['Ubicaciones Físicas', 'Gestión de espacios del archivo'],
  cajas: ['Inventario de Cajas', 'Control de cajas registradas'],
  expedientes: ['Expedientes', 'Gestión de expedientes académicos y administrativos'],
  prestamos: ['Control de Préstamos', 'Registro de salidas y devoluciones'],
  digitalizacion: ['Digitalización', 'Proceso de escaneo y archivo digital'],
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.onclick = e => {
    e.preventDefault()
    const view = item.dataset.view
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
    item.classList.add('active')
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'))
    document.getElementById(`view-${view}`).classList.remove('hidden')
    const [title, sub] = TITLES[view] || [view, '']
    document.getElementById('topbar-title').textContent = title
    document.getElementById('topbar-sub').textContent = sub
    if (view === 'dashboard') loadDashboard()
    if (view === 'ubicaciones') loadUbicaciones()
    if (view === 'cajas') loadCajas()
    if (view === 'expedientes') loadExpedientes()
    if (view === 'prestamos') loadPrestamos()
    if (view === 'digitalizacion') loadDigitalizacion()
    document.getElementById('sidebar').classList.remove('mobile-open')
  }
})

document.getElementById('sidebar-toggle').onclick = () =>
  document.getElementById('sidebar').classList.toggle('collapsed')
document.getElementById('mobile-menu-btn').onclick = () =>
  document.getElementById('sidebar').classList.toggle('mobile-open')

// ─── DASHBOARD ────────────────────────────────────────────────────
async function loadDashboard() {
  const [ub, cj, ex, pr] = await Promise.allSettled([
    api('GET', '/ubicaciones?limit=1'), api('GET', '/cajas?limit=1'),
    api('GET', '/expedientes?limit=1'), api('GET', '/prestamos?limit=1&estado=ACTIVO'),
  ])
  const set = (id, res) => {
    document.getElementById(id).textContent = res.status === 'fulfilled' ? (res.value.meta?.total ?? '?') : '!'
  }
  set('stat-ubicaciones', ub); set('stat-cajas', cj)
  set('stat-expedientes', ex); set('stat-prestamos', pr)

  try {
    const v = await api('GET', '/prestamos/vencidos')
    const list = v.data || []
    document.getElementById('vencidos-count').textContent = list.length
    if (list.length === 0) {
      document.getElementById('vencidos-empty').classList.remove('hidden')
      document.getElementById('vencidos-list').classList.add('hidden')
    } else {
      document.getElementById('vencidos-empty').classList.add('hidden')
      const ul = document.getElementById('vencidos-list')
      ul.classList.remove('hidden')
      ul.innerHTML = list.slice(0,5).map(p =>
        `<div class="list-item"><span>${trunc(p.solicitanteNombre,28)}</span><span class="chip chip-red">VENCIDO</span></div>`
      ).join('')
    }
  } catch {}
}

// ─── UBICACIONES ─────────────────────────────────────────────────
let ubPage = 1
async function loadUbicaciones(page = 1) {
  ubPage = page
  const tbody = document.getElementById('tbody-ubicaciones')
  tbody.innerHTML = '<tr><td colspan="7" class="table-loading">Cargando...</td></tr>'
  try {
    const salon = document.getElementById('search-ubicaciones').value
    const q = `?page=${page}&limit=15${salon ? `&salon=${encodeURIComponent(salon)}` : ''}`
    const res = await api('GET', '/ubicaciones' + q)
    if (!res.data.length) { tbody.innerHTML = '<tr><td colspan="7" class="table-loading">Sin registros</td></tr>'; return }
    tbody.innerHTML = res.data.map(u => `
      <tr>
        <td><code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--blue)">${u.codigo}</code></td>
        <td>${u.salon}</td><td>${u.estante}</td><td>${u.fila}</td><td>${u.columna}</td>
        <td><div style="display:flex;align-items:center;gap:8px">
          <div style="background:var(--bg-elevated);border-radius:20px;height:6px;width:80px;overflow:hidden">
            <div style="height:100%;width:${Math.min(100,(u.ocupacionActual/u.capacidadMaxima)*100)}%;background:var(--blue);border-radius:20px"></div>
          </div>
          <span style="font-size:12px;color:var(--text-muted)">${u.ocupacionActual}/${u.capacidadMaxima}</span>
        </div></td>
        <td>${chip(u.activo ? 'ACTIVA' : 'INACTIVA')}</td>
      </tr>`).join('')
    renderPag('pag-ubicaciones', res.meta, p => loadUbicaciones(p))
  } catch (ex) { tbody.innerHTML = `<tr><td colspan="7" class="table-loading">${ex.message}</td></tr>` }
}

document.getElementById('search-ubicaciones').oninput = debounce(() => loadUbicaciones(1), 400)

document.getElementById('btn-nueva-ubicacion').onclick = () => {
  openModal('Nueva Ubicación', `
    <div class="field-group"><label>Código</label><input id="m-codigo" placeholder="A-01-01-01" /></div>
    <div class="field-group"><label>Salón</label><input id="m-salon" placeholder="Salon Principal" /></div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      <div class="field-group"><label>Estante</label><input id="m-estante" type="number" min="1" value="1" /></div>
      <div class="field-group"><label>Fila</label><input id="m-fila" type="number" min="1" value="1" /></div>
      <div class="field-group"><label>Columna</label><input id="m-columna" type="number" min="1" value="1" /></div>
    </div>
    <div class="field-group"><label>Capacidad máx.</label><input id="m-cap" type="number" min="1" value="50" /></div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-primary" id="btn-save-ub">Guardar</button>`)
  document.getElementById('btn-save-ub').onclick = async () => {
    try {
      await api('POST', '/ubicaciones', {
        codigo: document.getElementById('m-codigo').value.toUpperCase(),
        salon: document.getElementById('m-salon').value,
        estante: +document.getElementById('m-estante').value,
        fila: +document.getElementById('m-fila').value,
        columna: +document.getElementById('m-columna').value,
        capacidadMaxima: +document.getElementById('m-cap').value,
      })
      closeModal(); toast('Ubicación creada', 'success'); loadUbicaciones()
    } catch (ex) { toast(ex.message, 'error') }
  }
}

// ─── CAJAS ────────────────────────────────────────────────────────
let cjPage = 1
async function loadCajas(page = 1) {
  cjPage = page
  const tbody = document.getElementById('tbody-cajas')
  tbody.innerHTML = '<tr><td colspan="6" class="table-loading">Cargando...</td></tr>'
  try {
    const res = await api('GET', `/cajas?page=${page}&limit=15`)
    if (!res.data.length) { tbody.innerHTML = '<tr><td colspan="6" class="table-loading">Sin registros</td></tr>'; return }
    tbody.innerHTML = res.data.map(c => `
      <tr>
        <td><strong>${c.numeroCaja}</strong></td>
        <td>${chip(c.tipoDocumento)}</td>
        <td><span style="font-size:12px;color:var(--text-muted)">${c.ubicacion?.codigo || '—'}</span></td>
        <td><span class="chip chip-blue">${c.totalExpedientes}</span></td>
        <td>${chip(c.estado)}</td>
        <td style="font-size:13px;color:var(--text-muted)">${fdate(c.creadoEn)}</td>
      </tr>`).join('')
    renderPag('pag-cajas', res.meta, p => loadCajas(p))
  } catch (ex) { tbody.innerHTML = `<tr><td colspan="6" class="table-loading">${ex.message}</td></tr>` }
}

document.getElementById('btn-nueva-caja').onclick = async () => {
  let ubicaciones = []
  try { const r = await api('GET', '/ubicaciones?limit=100'); ubicaciones = r.data } catch {}
  const opts = ubicaciones.map(u => `<option value="${u.id}">${u.codigo} — ${u.salon}</option>`).join('')
  openModal('Nueva Caja', `
    <div class="field-group"><label>N° de Caja</label><input id="m-ncaja" placeholder="CAJA-001" /></div>
    <div class="field-group"><label>Tipo de Documento</label>
      <select id="m-tipo"><option value="ACADEMICO">Académico</option><option value="ADMINISTRATIVO">Administrativo</option><option value="FINANCIERO">Financiero</option><option value="PERSONAL">Personal</option></select></div>
    <div class="field-group"><label>Ubicación</label><select id="m-ubic">${opts || '<option>Sin ubicaciones</option>'}</select></div>
    <div class="field-group"><label>Fecha inicio</label><input id="m-finicio" type="date" /></div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-primary" id="btn-save-caja">Guardar</button>`)
  document.getElementById('btn-save-caja').onclick = async () => {
    try {
      await api('POST', '/cajas', {
        numeroCaja: document.getElementById('m-ncaja').value,
        tipoDocumento: document.getElementById('m-tipo').value,
        ubicacionId: document.getElementById('m-ubic').value,
        fechaInicio: document.getElementById('m-finicio').value || new Date().toISOString(),
      })
      closeModal(); toast('Caja creada', 'success'); loadCajas()
    } catch (ex) { toast(ex.message, 'error') }
  }
}

// ─── EXPEDIENTES ─────────────────────────────────────────────────
let exPage = 1
async function loadExpedientes(page = 1) {
  exPage = page
  const tbody = document.getElementById('tbody-expedientes')
  tbody.innerHTML = '<tr><td colspan="7" class="table-loading">Cargando...</td></tr>'
  try {
    const tipo = document.getElementById('filter-tipo-exp').value
    const estado = document.getElementById('filter-estado-exp').value
    let q = `?page=${page}&limit=15`
    if (estado) q += `&estado=${estado}`
    const res = await api('GET', '/expedientes' + q)
    if (!res.data.length) { tbody.innerHTML = '<tr><td colspan="7" class="table-loading">Sin registros</td></tr>'; return }
    tbody.innerHTML = res.data.map(e => `
      <tr>
        <td><code style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--blue)">${e.numeroExpediente}</code></td>
        <td>${trunc(e.nombreTitular, 28)}</td>
        <td>${chip(e.tipoExpediente)}</td>
        <td style="font-size:13px">${e.carrera || e.matriculaOEmpleado || '—'}</td>
        <td>${chip(e.estado)}</td>
        <td>${e.clasificacionAIDLC ? `<span class="chip chip-purple">${e.clasificacionAIDLC}</span>` : '—'}</td>
        <td style="font-size:13px;color:var(--text-muted)">${fdate(e.fechaIngreso)}</td>
      </tr>`).join('')
    renderPag('pag-expedientes', res.meta, p => loadExpedientes(p))
  } catch (ex) { tbody.innerHTML = `<tr><td colspan="7" class="table-loading">${ex.message}</td></tr>` }
}

document.getElementById('filter-tipo-exp').onchange = () => loadExpedientes(1)
document.getElementById('filter-estado-exp').onchange = () => loadExpedientes(1)
document.getElementById('search-expedientes').oninput = debounce(() => loadExpedientes(1), 400)

document.getElementById('btn-nuevo-expediente').onclick = async () => {
  let cajas = []
  try { const r = await api('GET', '/cajas?limit=100'); cajas = r.data } catch {}
  const opts = cajas.map(c => `<option value="${c.id}">${c.numeroCaja}</option>`).join('')
  openModal('Nuevo Expediente', `
    <div class="field-group"><label>N° Expediente</label><input id="m-nexp" placeholder="EXP-2026-001" /></div>
    <div class="field-group"><label>Nombre del titular</label><input id="m-titular" placeholder="Juan Pérez García" /></div>
    <div class="field-group"><label>Tipo</label>
      <select id="m-texp"><option value="ALUMNO">Alumno</option><option value="DOCENTE">Docente</option><option value="ADMINISTRATIVO">Administrativo</option><option value="PROYECTO">Proyecto</option><option value="CONVENIO">Convenio</option></select></div>
    <div class="field-group"><label>Matrícula / N° Empleado</label><input id="m-mat" placeholder="202300123" /></div>
    <div class="field-group"><label>Carrera / Área</label><input id="m-carrera" placeholder="Ingeniería en Sistemas" /></div>
    <div class="field-group"><label>Caja</label><select id="m-caja">${opts || '<option>Sin cajas</option>'}</select></div>
    <div class="field-group"><label>Fecha de ingreso</label><input id="m-fing" type="date" /></div>
    <div class="field-group"><label>Clasificación AI-DLC</label><input id="m-aidlc" placeholder="AI-DLC-001" /></div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-primary" id="btn-save-exp">Guardar</button>`)
  document.getElementById('btn-save-exp').onclick = async () => {
    try {
      await api('POST', '/expedientes', {
        numeroExpediente: document.getElementById('m-nexp').value,
        nombreTitular: document.getElementById('m-titular').value,
        tipoExpediente: document.getElementById('m-texp').value,
        matriculaOEmpleado: document.getElementById('m-mat').value || undefined,
        carrera: document.getElementById('m-carrera').value || undefined,
        cajaId: document.getElementById('m-caja').value,
        fechaIngreso: document.getElementById('m-fing').value || new Date().toISOString(),
        clasificacionAIDLC: document.getElementById('m-aidlc').value || undefined,
      })
      closeModal(); toast('Expediente creado', 'success'); loadExpedientes()
    } catch (ex) { toast(ex.message, 'error') }
  }
}

// ─── PRÉSTAMOS ────────────────────────────────────────────────────
let prPage = 1
async function loadPrestamos(page = 1) {
  prPage = page
  const tbody = document.getElementById('tbody-prestamos')
  tbody.innerHTML = '<tr><td colspan="7" class="table-loading">Cargando...</td></tr>'
  try {
    const estado = document.getElementById('filter-estado-prest').value
    let q = `?page=${page}&limit=15`
    if (estado) q += `&estado=${estado}`
    const res = await api('GET', '/prestamos' + q)
    if (!res.data.length) { tbody.innerHTML = '<tr><td colspan="7" class="table-loading">Sin registros</td></tr>'; return }
    tbody.innerHTML = res.data.map(p => {
      const isVencido = p.estado === 'ACTIVO' && new Date(p.fechaDevolucionEsperada) < new Date()
      return `<tr>
        <td>${trunc(p.solicitanteNombre, 24)}</td>
        <td style="font-size:13px">${trunc(p.solicitanteDepartamento, 20)}</td>
        <td style="font-size:12px;color:var(--text-muted)">${trunc(p.motivoPrestamo, 30)}</td>
        <td style="font-size:13px">${fdate(p.fechaSalida)}</td>
        <td style="font-size:13px;color:${isVencido?'var(--red)':'inherit'}">${fdate(p.fechaDevolucionEsperada)}</td>
        <td>${chip(isVencido ? 'VENCIDO' : p.estado)}</td>
        <td>${p.estado === 'ACTIVO' || p.estado === 'PENDIENTE'
          ? `<button class="btn btn-sm btn-ghost" onclick="devolver('${p.id}')">Devolver</button>`
          : '—'}</td>
      </tr>`
    }).join('')
    renderPag('pag-prestamos', res.meta, pp => loadPrestamos(pp))
  } catch (ex) { tbody.innerHTML = `<tr><td colspan="7" class="table-loading">${ex.message}</td></tr>` }
}

document.getElementById('filter-estado-prest').onchange = () => loadPrestamos(1)

async function devolver(id) {
  if (!confirm('¿Confirmar devolución?')) return
  try {
    await api('PATCH', `/prestamos/${id}/devolver`, {})
    toast('Devolución registrada', 'success'); loadPrestamos()
  } catch (ex) { toast(ex.message, 'error') }
}

document.getElementById('btn-nuevo-prestamo').onclick = async () => {
  let exps = []
  try { const r = await api('GET', '/expedientes?limit=100&estado=ACTIVO'); exps = r.data } catch {}
  const opts = exps.map(e => `<option value="${e.id}">${e.numeroExpediente} — ${e.nombreTitular}</option>`).join('')
  openModal('Nuevo Préstamo', `
    <div class="field-group"><label>Expediente</label><select id="m-pexp"><option value="">— Seleccionar —</option>${opts}</select></div>
    <div class="field-group"><label>Solicitante</label><input id="m-psol" placeholder="Nombre completo" /></div>
    <div class="field-group"><label>Departamento</label><input id="m-pdept" placeholder="Recursos Humanos" /></div>
    <div class="field-group"><label>Motivo del préstamo</label><input id="m-pmotivo" placeholder="Mínimo 10 caracteres..." /></div>
    <div class="field-group"><label>Fecha de devolución esperada</label><input id="m-pdevol" type="date" /></div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-primary" id="btn-save-prest">Guardar</button>`)
  document.getElementById('btn-save-prest').onclick = async () => {
    try {
      await api('POST', '/prestamos', {
        expedienteId: document.getElementById('m-pexp').value || undefined,
        solicitanteNombre: document.getElementById('m-psol').value,
        solicitanteDepartamento: document.getElementById('m-pdept').value,
        motivoPrestamo: document.getElementById('m-pmotivo').value,
        fechaDevolucionEsperada: document.getElementById('m-pdevol').value,
      })
      closeModal(); toast('Préstamo registrado', 'success'); loadPrestamos()
    } catch (ex) { toast(ex.message, 'error') }
  }
}

// ─── DIGITALIZACIÓN ───────────────────────────────────────────────
async function loadDigitalizacion() {
  const tbody = document.getElementById('tbody-digitalizacion')
  tbody.innerHTML = '<tr><td colspan="7" class="table-loading">Cargando...</td></tr>'
  try {
    const estado = document.getElementById('filter-estado-dig').value
    const res = await api('GET', `/digitalizacion?limit=20${estado ? '&estado=' + estado : ''}`)
    if (!res.data.length) { tbody.innerHTML = '<tr><td colspan="7" class="table-loading">Sin registros</td></tr>'; return }
    tbody.innerHTML = res.data.map(d => `
      <tr>
        <td><code style="font-size:11px">${d.expedienteId.slice(0,8)}…</code></td>
        <td><code style="font-size:11px">${d.operadorId.slice(0,8)}…</code></td>
        <td>${chip(d.formatoArchivo)}</td>
        <td>${d.totalPaginas}</td>
        <td>${d.resolucionDpi} dpi</td>
        <td>${chip(d.estado)}</td>
        <td style="font-size:13px;color:var(--text-muted)">${fdate(d.creadoEn)}</td>
      </tr>`).join('')
  } catch (ex) { tbody.innerHTML = `<tr><td colspan="7" class="table-loading">${ex.message}</td></tr>` }
}

document.getElementById('filter-estado-dig').onchange = loadDigitalizacion

// ─── PAGINATION ───────────────────────────────────────────────────
function renderPag(containerId, meta, onPage) {
  const el = document.getElementById(containerId)
  if (!meta) { el.innerHTML = ''; return }
  const { page, totalPages, total } = meta
  el.innerHTML = `
    <span>${total} registros · Página ${page} de ${Math.max(totalPages,1)}</span>
    <div style="display:flex;gap:8px">
      <button class="btn btn-ghost btn-sm" ${page<=1?'disabled':''} onclick="(${onPage.toString()})(${page-1})">‹ Anterior</button>
      <button class="btn btn-ghost btn-sm" ${page>=totalPages?'disabled':''} onclick="(${onPage.toString()})(${page+1})">Siguiente ›</button>
    </div>`
}

// ─── UTILS ────────────────────────────────────────────────────────
function debounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) }
}
