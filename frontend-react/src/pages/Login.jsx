import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEMO_ADMIN, DEMO_DOCTORS, loginWithEmailPassword } from '../auth'

function Icon({ className = '', children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('emily.chen@organflow.in')
  const [password, setPassword] = useState('OrganFlow@560076')
  const [error, setError] = useState('')

  const hint = useMemo(() => {
    const all = [DEMO_ADMIN, ...DEMO_DOCTORS]
    return all.map((d) => `${d.email} / ${d.password}`).join('  •  ')
  }, [])

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    const res = await loginWithEmailPassword(email, password)
    if (!res.ok) {
      setError(res.error || 'Login failed')
      return
    }
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-background-dark text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-card-dark/60 p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/15">
              <Icon className="h-5 w-5 text-primary">
                <path d="M12 2l8 4v6c0 5-3.5 9.4-8 10-4.5-.6-8-5-8-10V6l8-4z" />
                <path d="M9 12l2 2 4-4" />
              </Icon>
            </div>
            <div>
              <div className="text-lg font-extrabold tracking-tight">Admin Login</div>
              <div className="text-xs text-white/60">Doctors access — Bangalore, Karnataka (560076)</div>
            </div>
          </div>

          <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
            <div>
              <div className="text-xs font-semibold text-white/70">Doctor Email</div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-background-dark/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
                placeholder="name@hospital.org"
                autoComplete="username"
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-white/70">Password</div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-background-dark/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-extrabold text-background-dark"
            >
              Sign In
              <Icon className="h-4 w-4">
                <path d="M5 12h14" />
                <path d="M13 5l7 7-7 7" />
              </Icon>
            </button>
          </form>

          <div className="mt-5 text-xs text-white/55">
            Demo credentials: <span className="text-white/70">{hint}</span>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-white/45">
            <span>Secure environment</span>
            <span>End-to-end encryption available</span>
          </div>
        </div>
      </div>
    </div>
  )
}
