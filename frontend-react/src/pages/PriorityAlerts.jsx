import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../App.css'

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

function priorityPill(priority) {
  if (priority <= 1) return 'pill pill--amber'
  if (priority <= 2) return 'pill pill--blue'
  return 'pill pill--gray'
}

export default function PriorityAlerts() {
  const navigate = useNavigate()
  const [sortMode, setSortMode] = useState('priority') // priority | time
  const [sortDir, setSortDir] = useState('asc') // asc | desc

  const alerts = useMemo(
    () => [
      {
        id: 'ALERT-8821',
        title: 'Action Required: Heart Match Found',
        priority: 1,
        receivedAt: Date.now() - 1000 * 60 * 3,
        organ: 'Heart',
        patientId: '#8821',
        location: 'Bengaluru, Karnataka (560076)',
        details: 'Immediate surgeon approval required for transport. Cold ischemia window is limited.',
        action: { label: 'Review Case', to: '/matching' },
      },
      {
        id: 'ALERT-402',
        title: 'Kidney Transport - Arriving Soon',
        priority: 2,
        receivedAt: Date.now() - 1000 * 60 * 10,
        organ: 'Kidney',
        patientId: '#402',
        location: 'Bengaluru, Karnataka',
        details: 'Estimated arrival at O.R. 3 in 45 minutes. Confirm corridor readiness and surgical team ETA.',
        action: { label: 'Track', to: '/logistics' },
      },
      {
        id: 'ALERT-309',
        title: 'Liver Match - Waiting Approval',
        priority: 3,
        receivedAt: Date.now() - 1000 * 60 * 18,
        organ: 'Liver',
        patientId: '#309',
        location: 'Bengaluru, Karnataka',
        details: 'Donor ID #9902 matches Patient #309. Awaiting allocation approval and cross-checks.',
        action: { label: 'Review', to: '/matching' },
      },
    ],
    [],
  )

  const visible = useMemo(() => {
    const arr = alerts.slice()
    arr.sort((a, b) => {
      const av = sortMode === 'priority' ? a.priority : a.receivedAt
      const bv = sortMode === 'priority' ? b.priority : b.receivedAt
      if (av === bv) return 0
      const dir = sortDir === 'asc' ? 1 : -1
      return av < bv ? -1 * dir : 1 * dir
    })
    return arr
  }, [alerts, sortMode, sortDir])

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
            active={false}
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
            <div className="h1">Priority Alerts</div>
            <div className="sub">View all alerts with details</div>
          </div>
          <div className="topbar__right">
            <button
              type="button"
              className="btn btn--gray"
              onClick={() => {
                if (sortMode === 'priority') {
                  setSortMode('time')
                  return
                }
                setSortMode('priority')
              }}
            >
              Sort: {sortMode === 'priority' ? 'Priority' : 'Time'}
            </button>
            <button
              type="button"
              className="btn btn--gray"
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            >
              Order: {sortDir === 'asc' ? 'Asc' : 'Desc'}
            </button>
          </div>
        </header>

        <div className="grid" style={{ gap: 12 }}>
          {visible.map((a) => (
            <div key={a.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 900, letterSpacing: '-0.2px' }}>{a.title}</div>
                    <span className={priorityPill(a.priority)}>PRIORITY {a.priority}</span>
                  </div>
                  <div style={{ marginTop: 6, color: 'var(--muted)', fontSize: 12 }}>
                    {a.organ} • Patient {a.patientId} • {a.location}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.4 }}>{a.details}</div>
                  <div style={{ marginTop: 10, color: 'var(--muted)', fontSize: 12 }}>
                    Received: {new Date(a.receivedAt).toLocaleString()} • Alert ID: {a.id}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <button type="button" className="btn btn--green" onClick={() => navigate(a.action.to)}>
                    {a.action.label}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
