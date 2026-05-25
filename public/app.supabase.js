let supabaseClient = null
let supabaseConfigPromise = null

const legacyEnterApp = enterApp
const legacyOpenNuevoUsuarioModal = openNuevoUsuarioModal

function getDefaultPermisos() {
  return {
    crearUsuarios: false,
    subirArchivos: false,
    modificarArchivos: false,
    eliminarArchivos: false,
    verOtrasDivisiones: false,
  }
}

function normalizePermisos(row) {
  const isAdmin = String(row?.role || '').toUpperCase().includes('ADMIN')

  if (isAdmin) {
    return {
      crearUsuarios: true,
      subirArchivos: true,
      modificarArchivos: true,
      eliminarArchivos: true,
      verOtrasDivisiones: true,
    }
  }

  return {
    crearUsuarios: Boolean(row?.crear_usuarios),
    subirArchivos: Boolean(row?.subir_archivos),
    modificarArchivos: Boolean(row?.modificar_archivos),
    eliminarArchivos: Boolean(row?.eliminar_archivos),
    verOtrasDivisiones: Boolean(row?.ver_otras_divisiones),
  }
}

async function bootstrapSupabase() {
  if (supabaseClient) {
    return supabaseClient
  }

  if (!supabaseConfigPromise) {
    supabaseConfigPromise = (async () => {
      const response = await fetch('/api/config')
      if (!response.ok) {
        throw new Error('No se pudo cargar la configuración de Supabase')
      }

      const config = await response.json()

      if (!window.supabase?.createClient) {
        throw new Error('SDK de Supabase no disponible')
      }

      supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })

      return supabaseClient
    })()
  }

  return supabaseConfigPromise
}

async function getSession() {
  const client = await bootstrapSupabase()
  const { data } = await client.auth.getSession()
  return data.session
}

async function loadCurrentProfile() {
  const client = await bootstrapSupabase()
  const { data, error } = await client.auth.getUser()

  if (error || !data?.user) {
    return null
  }

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, username, display_name, division, role, crear_usuarios, subir_archivos, modificar_archivos, eliminar_archivos, ver_otras_divisiones')
    .eq('id', data.user.id)
    .single()

  if (profileError || !profile) {
    return null
  }

  return {
    id: data.user.id,
    email: data.user.email,
    nombre: profile.display_name || data.user.email,
    rol: profile.role || 'Usuario de Consulta',
    division: profile.division || '',
    permisos: normalizePermisos(profile),
  }
}

async function syncAuthState() {
  const session = await getSession()
  if (!session) {
    return null
  }

  token = session.access_token
  localStorage.setItem('token', token)
  const profile = await loadCurrentProfile()

  if (!profile) {
    return null
  }

  currentUser = profile
  currentPermisos = profile.permisos
  currentDivision = profile.division || ''
  return profile
}

async function api(method, path, body) {
  await bootstrapSupabase()

  if (path === '/auth/login') {
    const email = String(body?.email || '').trim()
    const password = String(body?.password || '').trim()

    if (!email || !password) {
      throw { status: 400, message: 'Credenciales incompletas' }
    }

    const client = await bootstrapSupabase()
    const { data, error } = await client.auth.signInWithPassword({ email, password })

    if (error || !data.session) {
      throw { status: 401, message: 'Usuario o contraseña incorrectos' }
    }

    token = data.session.access_token
    localStorage.setItem('token', token)

    const profile = await loadCurrentProfile()
    if (!profile) {
      throw { status: 401, message: 'No se encontró el perfil del usuario' }
    }

    currentUser = profile
    currentPermisos = profile.permisos
    currentDivision = profile.division || ''

    return { data: { token, usuario: profile } }
  }

  if (path === '/auth/me') {
    const profile = await loadCurrentProfile()
    if (!profile) {
      throw { status: 401, message: 'Sesión inválida' }
    }
    return { data: profile }
  }

  const accessToken = token || (await getSession())?.access_token || ''
  const headers = {
    'Content-Type': 'application/json',
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  let url = '/api/usuarios'
  if (path !== '/usuarios' && path.startsWith('/usuarios/')) {
    url = `/api/usuarios/${encodeURIComponent(path.replace('/usuarios/', ''))}`
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw {
      status: response.status,
      message: payload.error || 'Error en la operación',
    }
  }

  return payload
}

async function openSupabaseLoginFlow() {
  await bootstrapSupabase()
}

window.addEventListener('load', async () => {
  try {
    await openSupabaseLoginFlow()
    const session = await getSession()

    if (session?.access_token) {
      token = session.access_token
      localStorage.setItem('token', token)
      const profile = await loadCurrentProfile()
      if (profile) {
        currentUser = profile
        currentPermisos = profile.permisos
        currentDivision = profile.division || ''
        await legacyEnterApp()
      }
    }
  } catch {
    // Si no hay sesión activa, el usuario seguirá en el login
  }
})

const loginForm = document.getElementById('login-form')
if (loginForm) {
  loginForm.onsubmit = async (e) => {
    e.preventDefault()

    const btn = document.getElementById('login-btn')
    const err = document.getElementById('login-error')
    const username = document.getElementById('username').value.trim()
    const password = document.getElementById('password').value

    btn.querySelector('.btn-text').classList.add('hidden')
    btn.querySelector('.btn-loader').classList.remove('hidden')
    btn.disabled = true
    err.classList.add('hidden')

    try {
      await bootstrapSupabase()
      const email = username.includes('@') ? username : `${username}@itse.edu.mx`
      const res = await api('POST', '/auth/login', { email, password })
      currentUser = res.data.usuario
      if (document.getElementById('remember-me').checked) {
        localStorage.setItem('remember_user', username)
      }
      await legacyEnterApp()
    } catch (ex) {
      err.textContent = ex.message || 'Usuario o contraseña incorrectos'
      err.classList.remove('hidden')
    } finally {
      btn.querySelector('.btn-text').classList.remove('hidden')
      btn.querySelector('.btn-loader').classList.add('hidden')
      btn.disabled = false
    }
  }
}

const logoutBtn = document.getElementById('logout-btn')
if (logoutBtn) {
  logoutBtn.onclick = async () => {
    try {
      const client = await bootstrapSupabase()
      await client.auth.signOut()
    } catch {}

    token = ''
    currentUser = null
    currentPermisos = getDefaultPermisos()
    currentDivision = ''
    localStorage.removeItem('token')

    const bContainer = document.getElementById('topbar-user-badge-container')
    if (bContainer) {
      bContainer.innerHTML = ''
    }

    document.getElementById('app').classList.add('hidden')
    document.getElementById('login-screen').classList.remove('hidden')
  }
}

enterApp = async function () {
  try {
    await bootstrapSupabase()
    const profile = currentUser || (await loadCurrentProfile())

    if (!profile) {
      token = ''
      localStorage.removeItem('token')
      document.getElementById('app').classList.add('hidden')
      document.getElementById('login-screen').classList.remove('hidden')
      return
    }

    currentUser = profile
    currentPermisos = profile.permisos || getDefaultPermisos()
    currentDivision = profile.division || ''
    token = token || (await getSession())?.access_token || ''

    await legacyEnterApp()
  } catch {
    token = ''
    localStorage.removeItem('token')
    document.getElementById('app').classList.add('hidden')
    document.getElementById('login-screen').classList.remove('hidden')
  }
}

openNuevoUsuarioModal = function () {
  legacyOpenNuevoUsuarioModal()

  const saveBtn = document.getElementById('btn-save-user')
  if (!saveBtn) {
    return
  }

  saveBtn.onclick = async () => {
    const username = document.getElementById('m-username').value.trim()
    const pass = document.getElementById('m-pass').value
    const nombre = document.getElementById('m-encargado').value.trim()
    const division = document.getElementById('m-division').value.trim()
    const rol = document.getElementById('m-rol').value

    if (!username || !pass || !nombre) {
      toast('Completa los campos obligatorios (nombre, usuario y contraseña)', 'error')
      return
    }

    const permisos = {
      crearUsuarios: document.getElementById('perm-crear-usuarios').checked,
      subirArchivos: document.getElementById('perm-subir-archivos').checked,
      modificarArchivos: document.getElementById('perm-modificar-archivos').checked,
      eliminarArchivos: document.getElementById('perm-eliminar-archivos').checked,
      verOtrasDivisiones: document.getElementById('perm-ver-otras-divisiones').checked,
    }

    try {
      await api('POST', '/usuarios', {
        username,
        password: pass,
        nombre,
        division,
        rol,
        ...permisos,
      })

      await loadUsuariosAdmin()
      closeModal()
      toast(`Usuario "${nombre}" creado correctamente`, 'success')
    } catch (error) {
      if (error?.status === 409) {
        toast('Ese nombre de usuario ya existe', 'error')
        return
      }

      if (error?.status === 403) {
        toast('No tienes permiso para crear usuarios', 'error')
        closeModal()
        return
      }

      toast(error?.message || 'No se pudo guardar el usuario en Supabase', 'error')
    }
  }
}
