import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../App.css'

function computeBmi(heightCm, weightKg) {
  const h = Number(heightCm)
  const w = Number(weightKg)
  if (!h || !w) return null
  const meters = h / 100
  if (!meters) return null
  const bmi = w / (meters * meters)
  return Number.isFinite(bmi) ? Math.round(bmi * 10) / 10 : null
}

function formatBmi(patient) {
  const extraData = patient?.extra_data || {}
  const bmiValue = Number(extraData.bmi)

  if (Number.isFinite(bmiValue)) {
    return bmiValue.toFixed(1)
  }

  const fallbackBmi = computeBmi(extraData.height_cm, extraData.weight_kg)
  return fallbackBmi == null ? '—' : fallbackBmi.toFixed(1)
}

function Icon({ children, className = '', title }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
    >
      {children}
    </svg>
  )
}

function SidebarItem({ icon, label, active, onClick }) {
  return (
    <button
      type="button"
      className={active ? 'sb-item sb-item--active' : 'sb-item'}
      onClick={onClick}
    >
      <span className="sb-item__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="sb-item__label">{label}</span>
    </button>
  )
}

export default function PatientRegistry() {
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function fetchPatients() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/patients')
      const body = await res.json().catch(() => [])
      if (!res.ok) {
        setError(body?.error || 'Unable to load registered patients.')
        setLoading(false)
        return
      }
      setPatients(Array.isArray(body) ? body : [])
      setLoading(false)
    } catch (e) {
      setError('Unable to reach server to load patients.')
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPatients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return patients
    return patients.filter((p) => `${p.patient_id} ${p.name} ${p.blood_type} ${p.organ_required} ${p.urgency_level}`.toLowerCase().includes(q))
  }, [patients, search])

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="profile">
          <div className="avatar" aria-hidden="true">
            <span className="avatar__dot" />
          </div>
          <div className="profile__meta">
            <div className="profile__name">Dr.Dhanush Kumar M</div>
            <div className="profile__role">Chief Surgeon</div>
          </div>
        </div>

        <nav className="nav" aria-label="Primary">
          <SidebarItem
            label="Dashboard"
            active={false}
            onClick={() => navigate('/dashboard')}
            icon={
              <Icon className="icon" title="Dashboard">
                <rect x="3" y="3" width="8" height="8" rx="2" />
                <rect x="13" y="3" width="8" height="8" rx="2" />
                <rect x="3" y="13" width="8" height="8" rx="2" />
                <rect x="13" y="13" width="8" height="8" rx="2" />
              </Icon>
            }
          />
          <SidebarItem
            label="Patient Registry"
            active={true}
            onClick={() => navigate('/patients')}
            icon={
              <Icon className="icon" title="Patient Registry">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </Icon>
            }
          />
          <SidebarItem
            label="Patient Registration"
            active={false}
            onClick={() => navigate('/patients/new')}
            icon={
              <Icon className="icon" title="Patient Registration">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </Icon>
            }
          />
          <SidebarItem
            label="Organ Inventory"
            active={false}
            onClick={() => navigate('/inventory')}
            icon={
              <Icon className="icon" title="Organ Inventory">
                <path d="M12 2v6" />
                <path d="M12 8c3 0 5 2 5 5s-2 7-5 9c-3-2-5-6-5-9s2-5 5-5z" />
              </Icon>
            }
          />
          <SidebarItem
            label="Transport Logistics"
            active={false}
            onClick={() => navigate('/logistics')}
            icon={
              <Icon className="icon" title="Transport Logistics">
                <rect x="1" y="3" width="15" height="13" rx="2" />
                <path d="M16 8h4l3 3v5h-7V8z" />
                <circle cx="5.5" cy="18.5" r="1.5" />
                <circle cx="18.5" cy="18.5" r="1.5" />
              </Icon>
            }
          />
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="h1">Patient Registry</div>
            <div className="sub">View registered patients</div>
          </div>
          <div className="topbar__right">
            <div className="search">
              <Icon className="icon" title="Search">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </Icon>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patients..."
                aria-label="Search patients"
              />
            </div>
            <button type="button" className="btn btn--green" onClick={() => navigate('/patients/new')}
            >
              New Registration
            </button>
            <button type="button" className="btn btn--gray" onClick={fetchPatients} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </header>

        {error ? (
          <div className="banner" style={{ marginTop: 0 }}>
            <div className="banner__left">
              <div className="banner__badge">
                <Icon className="icon" title="Error">
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                  <path d="M10.3 3h3.4L22 21H2L10.3 3z" />
                </Icon>
              </div>
              <div>
                <div className="banner__title">Unable to load patients</div>
                <div className="banner__sub">{error}</div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 16, borderBottom: '1px solid var(--stroke)' }}>
            <div style={{ fontWeight: 800, letterSpacing: '-0.2px' }}>Registered Patients</div>
            <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
              {loading ? 'Loading…' : `${visible.length} patient(s)`}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'rgba(209, 236, 228, 0.65)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12 }}>PATIENT ID</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12 }}>NAME</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12 }}>AGE</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12 }}>BMI</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12 }}>BLOOD</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12 }}>ORGAN</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12 }}>URGENCY</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12 }}>REGISTERED</th>
                </tr>
              </thead>
              <tbody>
                {!loading && !visible.length ? (
                  <tr>
                    <td style={{ padding: '16px', color: 'var(--muted)' }} colSpan={7}>
                      No patients registered yet.
                    </td>
                  </tr>
                ) : null}
                {visible.map((p) => (
                  <tr key={p.patient_id} style={{ borderTop: '1px solid var(--stroke)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 800 }}>{p.patient_id}</td>
                    <td style={{ padding: '14px 16px' }}>{p.name}</td>
                    <td style={{ padding: '14px 16px' }}>{p.age}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 700 }}>{formatBmi(p)}</td>
                    <td style={{ padding: '14px 16px' }}>{p.blood_type}</td>
                    <td style={{ padding: '14px 16px' }}>{p.organ_required}</td>
                    <td style={{ padding: '14px 16px' }}>{p.urgency_level}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--muted)' }}>
                      {p.registered_at ? new Date(p.registered_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
