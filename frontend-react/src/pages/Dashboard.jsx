import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
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

function MetricCard({ icon, title, value, trend, onClick }) {
  return (
    <button
      type="button"
      className="card metric"
      onClick={onClick}
      style={{ textAlign: 'left', cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="metric__icon">{icon}</div>
      <div className="metric__meta">
        <div className="metric__title">{title}</div>
        <div className="metric__value">{value}</div>
      </div>
      <div className="metric__trend">{trend}</div>
    </button>
  )
}

function AlertRow({ icon, title, subtitle, pill, actionLabel, actionTone = 'green', onAction }) {
  return (
    <div className="card alert">
      <div className="alert__left">
        <div className="alert__icon">{icon}</div>
        <div className="alert__text">
          <div className="alert__title">
            {title} {pill ? <span className="pill pill--amber">{pill}</span> : null}
          </div>
          <div className="alert__subtitle">{subtitle}</div>
        </div>
      </div>
      <button
        type="button"
        className={actionTone === 'green' ? 'btn btn--pill btn--green' : 'btn btn--pill btn--gray'}
        onClick={onAction}
      >
        {actionLabel}
      </button>
    </div>
  )
}

function CasesTable({
  rows,
  sortMode,
  statusFilter,
  priorityFilter,
  onCycleSort,
  onCycleStatusFilter,
  onCyclePriorityFilter,
}) {
  return (
    <div className="card table">
      <div className="table__header">
        <div className="table__title">Active Cases</div>
        <div className="table__actions" aria-label="Table actions">
          <button type="button" className="btn btn--gray btn--pill" onClick={onCyclePriorityFilter}>
            Priority: {priorityFilter}
          </button>
          <button type="button" className="icon-btn" aria-label="Filter" onClick={onCycleStatusFilter}>
            <Icon className="icon" title="Filter">
              <path d="M3 5h18" />
              <path d="M6 12h12" />
              <path d="M10 19h4" />
            </Icon>
          </button>
          <button type="button" className="icon-btn" aria-label="Sort" onClick={onCycleSort}>
            <Icon className="icon" title="Sort">
              <path d="M7 6v14" />
              <path d="M7 20l-3-3" />
              <path d="M7 20l3-3" />
              <path d="M17 18V4" />
              <path d="M17 4l-3 3" />
              <path d="M17 4l3 3" />
            </Icon>
          </button>
        </div>
      </div>
      <div className="table__meta" style={{ padding: '0 18px 10px', color: 'var(--muted)', fontSize: 12 }}>
        Status: {statusFilter} • Sort: {sortMode}
      </div>
      <div className="table__wrap" role="region" aria-label="Active cases">
        <table>
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Organ</th>
              <th>Recipient</th>
              <th>Status</th>
              <th>Timeline</th>
              <th aria-label="Menu" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.id}</td>
                <td>
                  <span className="cell-organ">
                    <span
                      className={
                        r.organTone === 'green'
                          ? 'dot dot--green'
                          : r.organTone === 'amber'
                            ? 'dot dot--amber'
                            : 'dot dot--purple'
                      }
                    />
                    {r.organ}
                  </span>
                </td>
                <td className="muted">{r.recipient}</td>
                <td>
                  <span
                    className={
                      r.statusTone === 'blue'
                        ? 'pill pill--blue'
                        : r.statusTone === 'amber'
                          ? 'pill pill--amber'
                          : 'pill pill--green'
                    }
                  >
                    {r.status}
                  </span>
                </td>
                <td className="mono">{r.timeline}</td>
                <td>
                  <button type="button" className="icon-btn" aria-label="More">
                    <Icon className="icon" title="More">
                      <circle cx="12" cy="5" r="1" />
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="12" cy="19" r="1" />
                    </Icon>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [banner, setBanner] = useState({
    visible: true,
    title: 'Action Required: Heart Match Found',
    subtitle: 'Patient #8821 (Priority 1) • Immediate surgeon approval required for transport.',
  })
  const [hasNotifications, setHasNotifications] = useState(true)
  const [search, setSearch] = useState('')

  const [caseSortMode, setCaseSortMode] = useState('Time ↑')
  const [caseStatusFilter, setCaseStatusFilter] = useState('All')
  const [casePriorityFilter, setCasePriorityFilter] = useState('All')
  const [nowMs, setNowMs] = useState(Date.now())

  const GOVERNMENT_INSTITUTES = useMemo(
    () => [
      'Victoria Hospital, Bengaluru',
      'Bowring and Lady Curzon Hospital, Bengaluru',
      'ESIC Medical College & Hospital, Rajajinagar',
      'Indira Gandhi Institute of Child Health, Bengaluru',
      'Bangalore Medical College and Research Institute',
    ],
    [],
  )
  const [govCursor, setGovCursor] = useState(0)
  const [donationBox, setDonationBox] = useState([])

  const [viabilityItems, setViabilityItems] = useState(() => {
    const now = Date.now()
    const startedKidney = now - (3 * 3600 + 20 * 60) * 1000
    const startedHeart = now - (3 * 3600 + 45 * 60) * 1000
    return [
      {
        id: '#402',
        organ: 'Kidney',
        startedAtMs: startedKidney,
        maxHours: 24,
        matched: true,
        takenByRecipient: true,
        status: 'active',
      },
      {
        id: '#309',
        organ: 'Heart',
        startedAtMs: startedHeart,
        maxHours: 4,
        matched: false,
        takenByRecipient: false,
        status: 'active',
      },
    ]
  })

  const liveMapElRef = useRef(null)
  const liveMapRef = useRef(null)
  const liveMarkerRef = useRef(null)
  const liveRouteRef = useRef([])
  const [etaSeconds, setEtaSeconds] = useState(30 * 60)

  const formatHhMm = (totalSeconds) => {
    const secs = Math.max(0, Math.floor(totalSeconds))
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    return `${h}h ${String(m).padStart(2, '0')}m`
  }

  const formatClock = (ms) => {
    const d = new Date(ms)
    let hh = d.getHours()
    const mm = String(d.getMinutes()).padStart(2, '0')
    const ampm = hh >= 12 ? 'PM' : 'AM'
    hh = hh % 12 || 12
    return `${hh}:${mm} ${ampm}`
  }

  const [cases, setCases] = useState(() => [
    {
      id: '#402',
      organ: 'Kidney',
      organTone: 'green',
      recipient: 'Sarah J.',
      status: 'In Transit',
      statusTone: 'blue',
      timeline: '00:45:00',
      priority: 2,
    },
    {
      id: '#309',
      organ: 'Heart',
      organTone: 'amber',
      recipient: 'Michael B.',
      status: 'Matching',
      statusTone: 'amber',
      timeline: '--:--:--',
      priority: 1,
    },
    {
      id: '#411',
      organ: 'Lungs',
      organTone: 'purple',
      recipient: 'David K.',
      status: 'Prep',
      statusTone: 'green',
      timeline: '02:30:00',
      priority: 3,
    },
  ])

  const liveEtaText = useMemo(() => {
    const s = Math.max(0, etaSeconds)
    const mm = String(Math.floor(s / 60)).padStart(2, '0')
    const ss = String(s % 60).padStart(2, '0')
    return `${mm}:${ss}`
  }, [etaSeconds])

  function openNotificationBar() {
    if (!hasNotifications) return
    setBanner((b) => ({ ...b, visible: true }))
  }

  function dismissNotificationBar() {
    setBanner((b) => ({ ...b, visible: false }))
    setHasNotifications(false)
  }

  function createNewCase() {
    const n = String(Date.now()).slice(-3)
    const id = `#N${n}`
    const newCase = {
      id,
      organ: 'Heart',
      organTone: 'amber',
      recipient: 'New Patient',
      status: 'Matching',
      statusTone: 'amber',
      timeline: '--:--:--',
      priority: 2,
    }
    setCases((prev) => [newCase, ...prev])
    setHasNotifications(true)
    setBanner({
      visible: true,
      title: `New Case Created: ${newCase.organ} Match Pending`,
      subtitle: `${newCase.id} • Waiting for allocation approval and transport planning.`,
    })
  }

  function approveLiverMatch() {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== '#309') return c
        return {
          ...c,
          status: 'Completed',
          statusTone: 'green',
          timeline: '00:00:00',
        }
      }),
    )
    setBanner({
      visible: true,
      title: 'Liver Match Approved',
      subtitle: 'Case #309 has been accepted and marked as completed transplant.',
    })
    setHasNotifications(true)
  }

  useEffect(() => {
    liveRouteRef.current = [
      [12.8926, 77.5995],
      [12.9028, 77.6052],
      [12.9136, 77.6043],
      [12.9249, 77.6022],
      [12.9347, 77.5989],
      [12.9435, 77.5963],
    ]
  }, [])

  useEffect(() => {
    if (!liveMapElRef.current || liveMapRef.current) return

    const map = L.map(liveMapElRef.current, {
      center: [12.9136, 77.6043],
      zoom: 12,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    const route = liveRouteRef.current.length ? liveRouteRef.current : [[12.9136, 77.6043]]
    const poly = L.polyline(route, { weight: 4 }).addTo(map)
    map.fitBounds(poly.getBounds(), { padding: [16, 16] })

    const marker = L.circleMarker(route[0], { radius: 7 }).addTo(map)
    liveMarkerRef.current = marker
    liveMapRef.current = map

    const invalidate = () => map.invalidateSize()
    const t = setTimeout(invalidate, 120)
    window.addEventListener('resize', invalidate)

    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', invalidate)
      map.remove()
      liveMapRef.current = null
      liveMarkerRef.current = null
    }
  }, [])

  useEffect(() => {
    let idx = 0
    const interval = setInterval(() => {
      setEtaSeconds((s) => (s > 0 ? s - 1 : 0))

      const route = liveRouteRef.current
      if (!route?.length) return
      idx = (idx + 1) % route.length
      if (liveMarkerRef.current) liveMarkerRef.current.setLatLng(route[idx])
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const parseTimelineToSeconds = (timeline) => {
    if (!timeline || timeline === '--:--:--') return Number.POSITIVE_INFINITY
    const parts = String(timeline)
      .split(':')
      .map((p) => Number(p))
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return Number.POSITIVE_INFINITY
    const [h, m, s] = parts
    return h * 3600 + m * 60 + s
  }

  const visibleCases = useMemo(() => {
    const q = search.trim().toLowerCase()
    let arr = cases.slice()

    if (q) {
      arr = arr.filter((c) => `${c.id} ${c.organ} ${c.recipient} ${c.status}`.toLowerCase().includes(q))
    }

    if (caseStatusFilter !== 'All') {
      arr = arr.filter((c) => c.status === caseStatusFilter)
    }

    if (casePriorityFilter !== 'All') {
      arr = arr.filter((c) => `P${c.priority ?? 0}` === casePriorityFilter)
    }

    arr.sort((a, b) => {
      if (caseSortMode.startsWith('Priority')) {
        const ap = a.priority ?? 99
        const bp = b.priority ?? 99
        if (ap === bp) return 0
        const dir = caseSortMode.endsWith('↑') ? 1 : -1
        return ap < bp ? -1 * dir : 1 * dir
      }

      const at = parseTimelineToSeconds(a.timeline)
      const bt = parseTimelineToSeconds(b.timeline)
      if (at === bt) return 0
      const dir = caseSortMode.endsWith('↑') ? 1 : -1
      return at < bt ? -1 * dir : 1 * dir
    })

    return arr
  }, [cases, search, caseSortMode, caseStatusFilter, casePriorityFilter])

  const viabilityRuntime = useMemo(() => {
    return viabilityItems.map((item) => {
      const elapsedSec = Math.max(0, Math.floor((nowMs - item.startedAtMs) / 1000))
      const maxSec = item.maxHours * 3600
      const remainingSec = Math.max(0, maxSec - elapsedSec)
      const usedPct = Math.min(100, Math.round((elapsedSec / maxSec) * 100))
      const isCritical = item.maxHours <= 4 ? remainingSec <= 45 * 60 : remainingSec <= 2 * 3600
      return {
        ...item,
        elapsedSec,
        remainingSec,
        maxSec,
        usedPct,
        isCritical,
      }
    })
  }, [viabilityItems, nowMs])

  const activeCasesCount = useMemo(
    () => cases.filter((c) => c.status !== 'Completed' && c.status !== 'Donated').length,
    [cases],
  )
  const inTransitCount = useMemo(
    () => cases.filter((c) => c.status === 'In Transit').length,
    [cases],
  )
  const criticalMatchesCount = useMemo(() => {
    const caseCritical = cases.filter((c) => c.status === 'Matching' && (c.priority ?? 9) <= 1).length
    const viabilityCritical = viabilityRuntime.filter((v) => v.isCritical && v.status === 'active').length
    return caseCritical + viabilityCritical
  }, [cases, viabilityRuntime])

  const successfulTransplantsCount = useMemo(() => {
    const completedCases = cases.filter((c) => c.status === 'Completed').length
    const activeAccepted = viabilityRuntime.filter((v) => v.status === 'active' && v.matched && v.takenByRecipient).length
    return completedCases + activeAccepted
  }, [cases, viabilityRuntime])

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const expiring = viabilityRuntime.filter(
      (v) => v.status === 'active' && v.remainingSec <= 0 && (!v.matched || !v.takenByRecipient),
    )
    if (!expiring.length) return

    setViabilityItems((prev) =>
      prev.map((item) => {
        const hit = expiring.find((e) => e.id === item.id)
        if (!hit) return item
        return { ...item, status: 'donation-box' }
      }),
    )

    setCases((prev) =>
      prev.map((c) => {
        const hit = expiring.find((e) => e.id === c.id)
        if (!hit) return c
        return { ...c, status: 'Donated', statusTone: 'green', timeline: '00:00:00' }
      }),
    )

    setDonationBox((prev) => {
      const next = [...prev]
      let cursor = govCursor
      for (const e of expiring) {
        if (next.some((d) => d.organId === e.id)) continue
        const receiver = GOVERNMENT_INSTITUTES[cursor % GOVERNMENT_INSTITUTES.length]
        cursor += 1
        next.unshift({
          organId: e.id,
          organ: e.organ,
          receiver,
          movedAt: Date.now(),
          reason: e.matched ? 'Not accepted by recipient' : 'No matching recipient found',
        })
      }
      setGovCursor(cursor)
      return next
    })
  }, [viabilityRuntime, GOVERNMENT_INSTITUTES, govCursor])

  const cycleCaseSort = () => {
    setCaseSortMode((m) => {
      if (m === 'Time ↑') return 'Time ↓'
      if (m === 'Time ↓') return 'Priority ↑'
      if (m === 'Priority ↑') return 'Priority ↓'
      return 'Time ↑'
    })
  }

  const cycleCaseStatusFilter = () => {
    const statuses = ['All', 'In Transit', 'Matching', 'Prep']
    setCaseStatusFilter((current) => {
      const idx = statuses.indexOf(current)
      return statuses[(idx + 1) % statuses.length]
    })
  }

  const cycleCasePriorityFilter = () => {
    const priorities = ['All', 'P1', 'P2', 'P3']
    setCasePriorityFilter((current) => {
      const idx = priorities.indexOf(current)
      return priorities[(idx + 1) % priorities.length]
    })
  }

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
            active={activeNav === 'Dashboard'}
            onClick={() => setActiveNav('Dashboard')}
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
            active={activeNav === 'Patient Registry'}
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
            active={activeNav === 'Patient Registration'}
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
            active={activeNav === 'Organ Inventory'}
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
            active={activeNav === 'Transport Logistics'}
            onClick={() => setActiveNav('Transport Logistics')}
            icon={
              <Icon className="icon" title="Transport Logistics">
                <rect x="1" y="3" width="15" height="13" rx="2" />
                <path d="M16 8h4l3 3v5h-7V8z" />
                <circle cx="5.5" cy="18.5" r="1.5" />
                <circle cx="18.5" cy="18.5" r="1.5" />
              </Icon>
            }
          />
          <SidebarItem
            label="Profile"
            active={activeNav === 'Profile'}
            onClick={() => setActiveNav('Profile')}
            icon={
              <Icon className="icon" title="Profile">
                <path d="M12 21s8-4 8-10V5l-8-3-8 3v6c0 6 8 10 8 10z" />
              </Icon>
            }
          />
        </nav>

        <div className="logout">
          <button type="button" className="btn btn--ghost">
            <Icon className="icon" title="Log out">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </Icon>
            Log Out
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="h1">Dashboard Overview</div>
            <div className="sub">Monday, Oct 24 • 09:42 AM</div>
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
                placeholder="Search cases, IDs..."
                aria-label="Search"
              />
            </div>

            <button type="button" className="icon-btn" aria-label="Notifications" onClick={openNotificationBar}>
              <Icon className="icon" title="Notifications">
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </Icon>
              {hasNotifications ? <span className="notif-dot" aria-hidden="true" /> : null}
            </button>

            <button type="button" className="btn btn--green" onClick={createNewCase}>
              <Icon className="icon" title="New case">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </Icon>
              New Case
            </button>
          </div>
        </header>

        {banner.visible ? (
          <section className="banner" role="status" aria-live="polite">
            <div className="banner__left">
              <div className="banner__badge" aria-hidden="true">
                <Icon className="icon" title="Alert">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                </Icon>
              </div>
              <div>
                <div className="banner__title">{banner.title}</div>
                <div className="banner__sub">{banner.subtitle}</div>
              </div>
            </div>
            <div className="banner__actions">
              <button type="button" className="btn btn--link" onClick={dismissNotificationBar}>
                Dismiss
              </button>
              <button type="button" className="btn btn--red" onClick={() => navigate('/matching')}>
                Review Case
              </button>
            </div>
          </section>
        ) : null}

        <section className="grid grid--metrics" aria-label="Key metrics">
          <MetricCard
            title="Active Cases"
            value={String(activeCasesCount)}
            trend="Live"
            onClick={() => {
              setCaseStatusFilter('All')
              setCasePriorityFilter('All')
            }}
            icon={
              <Icon className="icon" title="Activity">
                <path d="M3 12h4l2-5 4 10 2-5h4" />
              </Icon>
            }
          />
          <MetricCard
            title="Organs in Transit"
            value={String(inTransitCount)}
            trend="Live"
            onClick={() => setCaseStatusFilter('In Transit')}
            icon={
              <Icon className="icon" title="Truck">
                <rect x="1" y="3" width="15" height="13" rx="2" />
                <path d="M16 8h4l3 3v5h-7V8z" />
              </Icon>
            }
          />
          <MetricCard
            title="Critical Matches"
            value={String(criticalMatchesCount)}
            trend={criticalMatchesCount > 0 ? 'Attention' : 'Stable'}
            onClick={() => setCasePriorityFilter('P1')}
            icon={
              <Icon className="icon" title="Match">
                <path d="M8 8l8 8" />
                <path d="M16 8l-8 8" />
              </Icon>
            }
          />
          <MetricCard
            title="Successful Transplants"
            value={String(successfulTransplantsCount)}
            trend="Completed"
            onClick={() => navigate('/patients')}
            icon={
              <Icon className="icon" title="Shield">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </Icon>
            }
          />
        </section>

        <section className="grid grid--main" aria-label="Main content">
          <div className="col col--left">
            <div className="section-head">
              <div className="section-title">
                <Icon className="icon" title="Alerts">
                  <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                  <path d="M10 21a2 2 0 0 0 4 0" />
                </Icon>
                Priority Alerts
              </div>
              <button type="button" className="btn btn--link" onClick={() => navigate('/alerts')}>
                View All
              </button>
            </div>

            <div className="stack">
              <AlertRow
                icon={
                  <Icon className="icon" title="Timer">
                    <path d="M10 2h4" />
                    <path d="M12 14l3-3" />
                    <circle cx="12" cy="14" r="8" />
                  </Icon>
                }
                title="Kidney Transport - Arriving Soon"
                subtitle="Estimated arrival at O.R. 3 in 45 minutes."
                pill="URGENT"
                actionLabel="Track"
                actionTone="gray"
                onAction={() => navigate('/logistics')}
              />
              <AlertRow
                icon={
                  <Icon className="icon" title="Medical">
                    <path d="M12 2v20" />
                    <path d="M2 12h20" />
                  </Icon>
                }
                title="Liver Match - Waiting Approval"
                subtitle="Donor ID #9902 matches Patient #309."
                actionLabel="Review"
                actionTone="green"
                onAction={approveLiverMatch}
              />
            </div>

            <div className="spacer" />
            <CasesTable
              rows={visibleCases}
              sortMode={caseSortMode}
              statusFilter={caseStatusFilter}
              priorityFilter={casePriorityFilter}
              onCycleSort={cycleCaseSort}
              onCycleStatusFilter={cycleCaseStatusFilter}
              onCyclePriorityFilter={cycleCasePriorityFilter}
            />
          </div>

          <div className="col col--right">
            <div className="card tracker">
              <div className="tracker__header">
                <div className="tracker__title">
                  <Icon className="icon" title="Tracker">
                    <path d="M12 2v20" />
                    <path d="M2 12h20" />
                  </Icon>
                  Viability Tracker
                </div>
              </div>

              <div className="tracker__row">
                {viabilityRuntime
                  .filter((v) => v.status === 'active')
                  .map((v) => (
                    <div key={v.id} className="tracker__row">
                      <div className="tracker__left">
                        <div className="tracker__name">{v.organ} {v.id}</div>
                        <div className="tracker__sub">Ischemia Time</div>
                      </div>
                      <div className="tracker__right">
                        <div className="tracker__time">{formatHhMm(v.remainingSec)}</div>
                        <div className={v.isCritical ? 'tracker__bar tracker__bar--amber' : 'tracker__bar'}>
                          <div
                            className={v.isCritical ? 'tracker__fill tracker__fill--amber' : 'tracker__fill'}
                            style={{ width: `${v.usedPct}%` }}
                          />
                        </div>
                        <div className="tracker__meta">
                          <span className="muted">Started {formatClock(v.startedAtMs)}</span>
                          <span className={v.isCritical ? 'warn' : 'muted'}>{v.isCritical ? `Critical (Max ${v.maxHours}h)` : `Max ${v.maxHours}h`}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                    </div>
            </div>

            <div className="card" style={{ marginTop: 14, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div className="tracker__title" style={{ margin: 0 }}>
                  <Icon className="icon" title="Donation Box">
                    <rect x="3" y="6" width="18" height="12" rx="2" />
                    <path d="M9 6V4h6v2" />
                  </Icon>
                  Donation Box (Unmatched / Unaccepted)
                </div>
                <span className="pill pill--gray">{donationBox.length} moved</span>
              </div>
              {donationBox.length === 0 ? (
                <div className="muted" style={{ fontSize: 13 }}>No organs moved to donation box yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {donationBox.slice(0, 5).map((d) => (
                    <div key={`${d.organId}-${d.movedAt}`} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 12px' }}>
                      <div style={{ fontWeight: 700 }}>{d.organ} {d.organId}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{d.reason}</div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>Receiver: <strong>{d.receiver}</strong></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card map">
              <div className="map__header">
                <span className="pill pill--gray">Live Tracking</span>
              </div>
              <div className="map__body" aria-label="Map preview">
                <div ref={liveMapElRef} className="map__leaflet" aria-hidden="true" />
                <div className="map__eta">
                  <div className="map__eta-num">{liveEtaText}</div>
                  <div className="map__eta-sub">Unit 4 • 5 mins away</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
