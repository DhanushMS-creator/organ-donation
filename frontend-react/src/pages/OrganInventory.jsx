import { useEffect, useMemo, useState } from 'react'
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

function Pill({ tone = 'green', children }) {
  const className = tone === 'green' ? 'pill pill--green' : tone === 'amber' ? 'pill pill--amber' : 'pill pill--blue'
  return <span className={className}>{children}</span>
}

export default function OrganInventory() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [organSpecs, setOrganSpecs] = useState([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/organs')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (Array.isArray(data)) setOrganSpecs(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const viabilityByOrgan = useMemo(() => {
    const m = new Map()
    for (const s of organSpecs) {
      if (s?.organ) m.set(String(s.organ), s)
    }
    return m
  }, [organSpecs])

  const notifications = useMemo(
    () => [
      {
        id: 'INV-560076-001',
        organ: 'Heart',
        bloodType: 'O+',
        hospital: 'Apollo Hospitals, Bannerghatta Road',
        address: '154/11, Bannerghatta Main Rd, IIMB, Krishnaraju Layout, Bengaluru, Karnataka 560076',
        status: 'Ready for donation',
        statusTone: 'green',
        receivedAt: 'Just now',
      },
      {
        id: 'INV-560076-002',
        organ: 'Kidneys',
        bloodType: 'A+',
        hospital: 'Fortis Hospital, Bannerghatta Road',
        address: '154/9, Bannerghatta Main Rd, Opp. IIM-B, Bengaluru, Karnataka 560076',
        status: 'Crossmatch pending',
        statusTone: 'amber',
        receivedAt: '5 min ago',
      },
      {
        id: 'INV-560041-003',
        organ: 'Liver',
        bloodType: 'B+',
        hospital: 'Manipal Hospital, Jayanagar',
        address: 'No. 45, 45th Cross, 4th T Block, Jayanagar, Bengaluru, Karnataka 560041',
        status: 'Ready for donation',
        statusTone: 'green',
        receivedAt: '14 min ago',
      },
      {
        id: 'INV-560029-004',
        organ: 'Lungs',
        bloodType: 'AB+',
        hospital: 'NIMHANS',
        address: 'Hosur Rd, Lakkasandra, Bengaluru, Karnataka 560029',
        status: 'Transport coordination',
        statusTone: 'blue',
        receivedAt: '28 min ago',
      },
    ],
    [],
  )

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return notifications
    return notifications.filter((n) => `${n.id} ${n.organ} ${n.bloodType} ${n.hospital} ${n.status}`.toLowerCase().includes(q))
  }, [notifications, search])

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
            active={true}
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

        <div className="logout">
          <button type="button" className="btn btn--ghost" onClick={() => navigate('/dashboard')}>
            <Icon className="icon" title="Back">
              <path d="M15 18l-6-6 6-6" />
            </Icon>
            Back
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="h1">Organ Inventory</div>
            <div className="sub">Donation-ready notifications (Bengaluru)</div>
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
                placeholder="Search organ, hospital, status..."
                aria-label="Search notifications"
              />
            </div>
          </div>
        </header>

        <div className="grid" style={{ gap: 12 }}>
          {visible.map((n) => {
            const spec = viabilityByOrgan.get(n.organ)
            return (
              <div key={n.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, letterSpacing: '-0.2px' }}>{n.organ} • {n.bloodType}</div>
                    <div style={{ color: 'rgba(209, 236, 228, 0.65)', marginTop: 4, fontSize: 12 }}>
                      {n.hospital} — {n.address}
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Pill tone={n.statusTone}>{n.status}</Pill>
                      <span style={{ fontSize: 12, color: 'rgba(209, 236, 228, 0.65)' }}>Received: {n.receivedAt}</span>
                      {spec?.viability_time_hours ? (
                        <span style={{ fontSize: 12, color: 'rgba(209, 236, 228, 0.65)' }}>
                          Viability: {spec.viability_time_hours} hrs
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: 'rgba(209, 236, 228, 0.65)' }}>{n.id}</div>
                    <button
                      type="button"
                      className={n.statusTone === 'green' ? 'btn btn--green' : 'btn btn--gray'}
                      style={{ marginTop: 10 }}
                      onClick={() => navigate('/matching')}
                    >
                      View Matching
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {!visible.length ? (
            <div className="card" style={{ padding: 18, color: 'rgba(209, 236, 228, 0.65)' }}>
              No notifications match your search.
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}
