const AUTH_KEY = 'organflow.auth'

export const DEMO_DOCTORS = [
  {
    id: 'dr-chen',
    name: 'Dr. Emily Chen',
    email: 'emily.chen@organflow.in',
    password: 'OrganFlow@560076',
  },
  {
    id: 'dr-smith',
    name: 'Dr. Smith',
    email: 'dr.smith@organflow.in',
    password: 'OrganFlow@560076',
  },
]

export const DEMO_ADMIN = {
  id: 'admin-001',
  name: 'Admin',
  email: 'admin@organflow.in',
  password: 'OrganFlow@560076',
}

export function getAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (!parsed.user || typeof parsed.user !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

export function getCurrentUser() {
  return getAuth()?.user ?? null
}

export function getAuthToken() {
  return getAuth()?.token ?? null
}

export async function loginWithEmailPassword(email, password) {
  const e = String(email || '').trim().toLowerCase()
  const p = String(password || '')

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e, password: p }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, error: data?.error || 'Login failed' }
    }

    const user = data?.user
    const token = data?.token
    if (!user || !token) return { ok: false, error: 'Invalid login response' }

    const payload = {
      user: { id: user.user_id || user.id, name: user.name, email: user.email, role: user.role },
      token,
      loggedInAt: new Date().toISOString(),
    }
    localStorage.setItem(AUTH_KEY, JSON.stringify(payload))
    return { ok: true, user: payload.user }
  } catch (err) {
    return { ok: false, error: String(err?.message || err) }
  }
}

export function logout() {
  localStorage.removeItem(AUTH_KEY)
}
