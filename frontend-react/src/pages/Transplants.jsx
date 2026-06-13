import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { startMatch } from '../matchState'

function Icon({ children, className = '' }) {
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

function Ring({ value, tone = 'primary' }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0))
  const r = 26
  const c = 2 * Math.PI * r
  const offset = c - (v / 100) * c
  const stroke = tone === 'amber' ? '#f59e0b' : tone === 'lime' ? '#12e28c' : '#12e28c'

  return (
    <div className="relative grid h-20 w-20 place-items-center">
      <svg className="h-20 w-20" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} stroke="rgba(255,255,255,0.12)" strokeWidth="6" fill="none" />
        <circle
          cx="36"
          cy="36"
          r={r}
          stroke={stroke}
          strokeWidth="6"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-xl font-extrabold tracking-tight">{v}%</div>
        <div className="text-[10px] font-semibold tracking-widest text-white/70">MATCH</div>
      </div>
    </div>
  )
}

function Chip({ children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
      {children}
    </span>
  )
}

function MiniStat({ label, value, icon }) {
  return (
    <div className="flex min-w-[140px] items-center gap-3 rounded-xl border border-white/10 bg-background-dark/30 px-4 py-3">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/80">{icon}</span>
      <div>
        <div className="text-[11px] text-white/60">{label}</div>
        <div className="text-sm font-semibold">{value}</div>
      </div>
    </div>
  )
}

const DEFAULT_CURRENT_LOCATION = {
  lat: 12.9716,
  lng: 77.5946,
  label: 'Our current location',
  details: 'Bangalore base location',
}

const DEFAULT_TARGET_ORGAN = 'Kidney (Left)'

const CANDIDATES = [
  {
    id: '#D-9921',
    pct: 98,
    badge: 'Ages 35-40',
    distance: '15 mi',
    ischemic: '~45 min',
    hla: '6/6 Match',
    blood: 'O+ (Comp)',
    tone: 'lime',
    summary:
      'Highest success probability due to a perfect 6/6 HLA match and short transport distance, minimizing ischemic time.',
    location: {
      label: 'Their current location',
      details: 'Apollo Hospitals, Bannerghatta Road',
      lat: 12.8926,
      lng: 77.5995,
    },
  },
  {
    id: '#D-4412',
    pct: 88,
    badge: 'Available: Immediately',
    distance: '120 mi',
    ischemic: 'Est. 2h 10m',
    hla: '5/6',
    blood: 'A+ (Comp)',
    tone: 'lime',
    summary: 'Good compatibility and a stable transfer window with a short regional transport path.',
    location: {
      label: 'Their current location',
      details: 'Manipal Hospital, Jayanagar',
      lat: 12.9304,
      lng: 77.5828,
    },
  },
  {
    id: '#D-1029',
    pct: 74,
    badge: 'Available: In 2hrs',
    distance: '450 mi (Air)',
    ischemic: 'Est. 4h 30m',
    hla: '4/6',
    blood: 'B+ (Comp)',
    tone: 'amber',
    summary: 'Air transport is required to keep the organ within safe ischemic time.',
    location: {
      label: 'Their current location',
      details: 'Narayana Health City',
      lat: 12.8122,
      lng: 77.7026,
    },
  },
  {
    id: '#D-5582',
    pct: 68,
    badge: 'Available: Immediately',
    distance: '15 mi',
    ischemic: 'Est. 0h 50m',
    hla: '—',
    blood: 'AB+ (Comp)',
    warning: 'Minor Incompat.',
    tone: 'amber',
    summary: 'Local transport is fast, but tissue compatibility is weaker than the top candidates.',
    location: {
      label: 'Their current location',
      details: 'Fortis Hospital, Bannerghatta Road',
      lat: 12.892,
      lng: 77.599,
    },
  },
]

function haversineKm(a, b) {
  const toRad = (value) => (value * Math.PI) / 180
  const r = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng), Math.sqrt(1 - sinLat * sinLat - Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng))
  return r * c
}

function formatDistanceKm(value) {
  return `${Math.max(0, value).toFixed(1)} km`
}

function formatMinutes(value) {
  return `${Math.max(1, Math.round(value))} min`
}

function getCurrentPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(DEFAULT_CURRENT_LOCATION)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: 'Your current location',
          details: 'Live GPS position',
        })
      },
      () => resolve(DEFAULT_CURRENT_LOCATION),
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 },
    )
  })
}

async function buildRoutePlan(start, end) {
  const fallbackPath = [
    [start.lat, start.lng],
    [
      start.lat + (end.lat - start.lat) * 0.33,
      start.lng + (end.lng - start.lng) * 0.33,
    ],
    [
      start.lat + (end.lat - start.lat) * 0.66,
      start.lng + (end.lng - start.lng) * 0.66,
    ],
    [end.lat, end.lng],
  ]

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Route lookup failed')

    const body = await res.json()
    const route = body?.routes?.[0]
    const coords = route?.geometry?.coordinates
    if (!route || !Array.isArray(coords) || !coords.length) throw new Error('Missing route geometry')

    return {
      source: 'live-road-route',
      path: coords.map(([lng, lat]) => [lat, lng]),
      distanceKm: route.distance / 1000,
      etaMinutes: route.duration / 60,
    }
  } catch (error) {
    const distanceKm = haversineKm(start, end)
    return {
      source: 'estimated-route',
      path: fallbackPath,
      distanceKm,
      etaMinutes: (distanceKm / 40) * 60,
    }
  }
}

function CandidateCard({ candidate, active, onOpen }) {
  return (
    <div
      className={
        active
          ? 'relative rounded-2xl border border-primary/30 bg-primary/10 p-5 ring-1 ring-primary/20'
          : 'relative rounded-2xl border border-white/10 bg-card-dark/70 p-5'
      }
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold">Donor {candidate.id}</div>
          <div className="mt-1 text-xs text-white/60">{candidate.badge}</div>
        </div>
        <div className="grid place-items-center">
          <div
            className={
              candidate.tone === 'amber'
                ? 'grid h-12 w-12 place-items-center rounded-full border border-amber-500/30 bg-amber-500/10 text-sm font-bold text-amber-400'
                : 'grid h-12 w-12 place-items-center rounded-full border border-primary/30 bg-primary/10 text-sm font-bold text-primary'
            }
          >
            {candidate.pct}%
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-xs text-white/70">
        <div className="flex items-center justify-between">
          <span>Distance</span>
          <span className="font-semibold text-white/85">{candidate.distance}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Ischemic Time</span>
          <span className="font-semibold text-white/85">{candidate.ischemic}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>HLA Match</span>
          <span className="font-semibold text-white/85">{candidate.hla}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Blood</span>
          <span className="font-semibold text-white/85">{candidate.blood}</span>
        </div>
        {candidate.warning ? <div className="font-semibold text-amber-400">Warning: {candidate.warning}</div> : null}
        <div className="text-sm text-white/70">{candidate.summary}</div>
      </div>

      <button
        type="button"
        className="mt-5 w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-white/85 transition hover:bg-white/10"
        onClick={() => onOpen(candidate.id)}
      >
        View Full Profile
      </button>
    </div>
  )
}

export default function Transplants() {
  const navigate = useNavigate()
  const routeMapElRef = useRef(null)
  const routeMapRef = useRef(null)
  const routeLayerRef = useRef(null)
  const profileSectionRef = useRef(null)

  const [recipientQuery, setRecipientQuery] = useState('REC-8921-XJ')
  const [targetOrgan, setTargetOrgan] = useState(DEFAULT_TARGET_ORGAN)
  const [selectedCandidateId, setSelectedCandidateId] = useState(CANDIDATES[0].id)
  const [routePlan, setRoutePlan] = useState(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState('')
  const [modalCandidateId, setModalCandidateId] = useState(null)

  const selectedCandidate = useMemo(
    () => CANDIDATES.find((candidate) => candidate.id === selectedCandidateId) || CANDIDATES[0],
    [selectedCandidateId],
  )

  const routeSummary = useMemo(() => {
    if (!routePlan) return null
    return {
      distance: formatDistanceKm(routePlan.distanceKm),
      eta: formatMinutes(routePlan.etaMinutes),
    }
  }, [routePlan])

  async function runAlgorithm() {
    setRouteLoading(true)
    setRouteError('')

    try {
      const ourLocation = await getCurrentPosition()
      const route = await buildRoutePlan(ourLocation, selectedCandidate.location)

      setRoutePlan({
        ourLocation,
        donorLocation: selectedCandidate.location,
        candidate: selectedCandidate,
        ...route,
      })
    } catch (error) {
      setRouteError('Unable to calculate a route right now. Please try again.')
    } finally {
      setRouteLoading(false)
    }
  }

  function resetFilters() {
    setRecipientQuery('')
    setTargetOrgan(DEFAULT_TARGET_ORGAN)
    setSelectedCandidateId(CANDIDATES[0].id)
    setRoutePlan(null)
    setRouteError('')
  }

  function viewFullProfile(candidateId = selectedCandidate.id) {
    setSelectedCandidateId(candidateId)
    setModalCandidateId(candidateId)
    // also scroll profile section for context when modal is dismissed
    window.requestAnimationFrame(() => {
      profileSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function selectMatch() {
    startMatch({ organName: targetOrgan, expiresInMs: 2 * 60 * 1000 })
    navigate('/logistics')
  }

  function closeModal() {
    setModalCandidateId(null)
  }

  useEffect(() => {
    if (!routeMapElRef.current || routeMapRef.current) return

    const map = L.map(routeMapElRef.current, {
      center: [DEFAULT_CURRENT_LOCATION.lat, DEFAULT_CURRENT_LOCATION.lng],
      zoom: 12,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    const layer = L.layerGroup().addTo(map)
    routeLayerRef.current = layer
    routeMapRef.current = map

    const invalidate = () => map.invalidateSize()
    const timer = setTimeout(invalidate, 120)
    window.addEventListener('resize', invalidate)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', invalidate)
      map.remove()
      routeMapRef.current = null
      routeLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!routeMapRef.current || !routeLayerRef.current || !routePlan) return

    const map = routeMapRef.current
    const layer = routeLayerRef.current
    layer.clearLayers()

    const ourMarker = L.circleMarker([routePlan.ourLocation.lat, routePlan.ourLocation.lng], {
      radius: 8,
      color: '#12e28c',
      weight: 3,
      fillColor: '#12e28c',
      fillOpacity: 0.8,
    }).addTo(layer)
    ourMarker.bindPopup(`<b>${routePlan.ourLocation.label}</b><br/>${routePlan.ourLocation.details}`)

    const donorMarker = L.circleMarker([routePlan.donorLocation.lat, routePlan.donorLocation.lng], {
      radius: 8,
      color: '#ffffff',
      weight: 3,
      fillColor: '#ffffff',
      fillOpacity: 0.65,
    }).addTo(layer)
    donorMarker.bindPopup(`<b>${routePlan.donorLocation.id}</b><br/>${routePlan.donorLocation.label}<br/>${routePlan.donorLocation.details}`)

    const poly = L.polyline(routePlan.path, { weight: 5, color: '#12e28c', opacity: 0.9 }).addTo(layer)
    map.fitBounds(poly.getBounds(), { padding: [24, 24] })
    map.invalidateSize()
  }, [routePlan])

  return (
    <div className="min-h-screen bg-background-dark text-white">
      <div className="border-b border-white/10 bg-background-dark/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15">
              <span className="h-2 w-2 rounded-full bg-primary" />
            </div>
            <div className="font-semibold tracking-tight">MANG</div>
          </div>

          <div className="hidden items-center gap-8 text-sm text-white/70 md:flex">
            <Link className="hover:text-white" to="/dashboard">
              Dashboard
            </Link>
            <Link className="hover:text-white" to="/patients/new">
              Patients
            </Link>
            <Link className="text-primary" to="/matching">
              Matching
            </Link>
            <button
              type="button"
              className="hover:text-white"
              onClick={() => navigate('/alerts')}
            >
              Notifications
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5"
              aria-label="Notifications"
              onClick={() => navigate('/alerts')}
            >
              <Icon className="h-4 w-4 text-white/80">
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </Icon>
            </button>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5"
              aria-label="Settings"
              onClick={() => navigate('/messages')}
            >
              <Icon className="h-4 w-4 text-white/80">
                <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-1.4 3.4h-.2a2 2 0 0 1-1.8-1.2 1.7 1.7 0 0 0-1.6-1h-.2a1.7 1.7 0 0 0-1.5 1 2 2 0 0 1-1.8 1.2h-.2a2 2 0 0 1-1.4-3.4l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.4-1h-.2a2 2 0 0 1 0-4h.2a1.7 1.7 0 0 0 1.4-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 0 1 6 3.6h.2A2 2 0 0 1 8 4.8a1.7 1.7 0 0 0 1.5 1h.2a1.7 1.7 0 0 0 1.6-1A2 2 0 0 1 13 3.6h.2a2 2 0 0 1 1.4 3.4l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.4 1h.2a2 2 0 0 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1z" />
              </Icon>
            </button>
            <div className="h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-white/10" aria-label="Profile">
              <div className="h-full w-full bg-gradient-to-br from-white/30 to-white/5" />
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 pb-14 pt-8">
        <section className="rounded-2xl border border-white/10 bg-card-dark/60 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-3xl font-extrabold tracking-tight">Organ Match Search</div>
              <div className="mt-1 text-sm text-white/60">
                Initiate compatibility search and view intelligent ranking for organ allocation.
              </div>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85"
              onClick={() => navigate('/unmatched-organs')}
            >
              <Icon className="h-4 w-4">
                <path d="M8 5h8" />
                <path d="M8 9h8" />
                <path d="M8 13h6" />
                <path d="M6 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
              </Icon>
              <span>View Protocols</span>
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-[1.2fr_1fr_auto] md:items-end">
            <div>
              <div className="text-xs text-white/60">Recipient ID or Name</div>
              <div className="mt-2 flex items-center gap-2 rounded-full border border-white/10 bg-background-dark/30 px-4 py-3">
                <Icon className="h-4 w-4 text-white/50">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </Icon>
                <input
                  className="w-full border-0 bg-transparent p-0 text-sm text-white placeholder:text-white/40 focus:ring-0"
                  value={recipientQuery}
                  onChange={(e) => setRecipientQuery(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="text-xs text-white/60">Target Organ</div>
              <div className="mt-2 flex items-center gap-2 rounded-full border border-white/10 bg-background-dark/30 px-4 py-3">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-white/5 text-primary">
                  <Icon className="h-4 w-4">
                    <path d="M12 2v6" />
                    <path d="M12 8c3 0 5 2 5 5s-2 7-5 9c-3-2-5-6-5-9s2-5 5-5z" />
                  </Icon>
                </div>
                <select
                  className="w-full border-0 bg-transparent p-0 text-sm text-white focus:ring-0"
                  value={targetOrgan}
                  onChange={(e) => setTargetOrgan(e.target.value)}
                >
                  <option className="bg-background-dark">Kidney (Left)</option>
                  <option className="bg-background-dark">Kidney (Right)</option>
                  <option className="bg-background-dark">Heart</option>
                  <option className="bg-background-dark">Liver</option>
                  <option className="bg-background-dark">Lungs</option>
                </select>
                <Icon className="h-4 w-4 text-white/50">
                  <path d="M6 9l6 6 6-6" />
                </Icon>
              </div>
            </div>

            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-extrabold text-background-dark"
              onClick={async () => {
                startMatch({ organName: targetOrgan, expiresInMs: 2 * 60 * 1000 })
                await runAlgorithm()
              }}
              disabled={routeLoading}
            >
              <Icon className="h-4 w-4">
                <path d="M8 5v14l11-7z" />
              </Icon>
              {routeLoading ? 'Calculating Route...' : 'Run Algorithm'}
            </button>
          </div>

          {routeError ? <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{routeError}</div> : null}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-white/50">Filters:</span>
              <Chip>Blood: O+</Chip>
              <Chip>Urgency: High</Chip>
              <Chip>Distance: &lt; 200mi</Chip>
              <Chip>HLA Match: &gt; 4/6</Chip>
            </div>
            <button
              type="button"
              className="text-xs font-semibold text-primary/90 transition hover:text-primary"
              onClick={resetFilters}
            >
              Reset Filters
            </button>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-white/10 bg-card-dark/60 p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex items-center gap-5">
              <div className="grid place-items-center rounded-2xl border border-white/10 bg-background-dark/30 p-4">
                <Ring value={98} tone="lime" />
                <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Top Pick
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-xl font-extrabold tracking-tight">Donor #D-9921</div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">Ages 35-40</span>
                </div>
                <div className="mt-2 text-sm text-white/70">
                  <span className="font-semibold text-primary">AI Insight:</span> Highest success probability due to a
                  perfect 6/6 HLA match and short transport distance (15mi), minimizing ischemic time.
                </div>
              </div>
            </div>

            <div className="hidden flex-1 items-center justify-end md:flex">
              <div className="relative h-20 w-28">
                <div className="absolute right-4 top-2 h-10 w-10 rounded-2xl bg-white/5" />
                <div className="absolute right-10 top-8 h-7 w-7 rounded-2xl bg-white/5" />
                <div className="absolute right-1 top-8 h-6 w-6 rounded-2xl bg-white/5" />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <MiniStat
              label="Distance"
              value="15 mi"
              icon={
                <Icon className="h-4 w-4">
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </Icon>
              }
            />
            <MiniStat
              label="Transport"
              value="~45 min"
              icon={
                <Icon className="h-4 w-4">
                  <path d="M3 12h4l2-5 4 10 2-5h4" />
                </Icon>
              }
            />
            <MiniStat
              label="HLA"
              value="6/6 Match"
              icon={
                <Icon className="h-4 w-4">
                  <path d="M12 2v20" />
                  <path d="M2 12h20" />
                </Icon>
              }
            />
            <MiniStat
              label="Blood"
              value="O+ (Comp)"
              icon={
                <Icon className="h-4 w-4">
                  <path d="M12 2v6" />
                  <path d="M12 8c3 0 5 2 5 5s-2 7-5 9c-3-2-5-6-5-9s2-5 5-5z" />
                </Icon>
              }
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-extrabold text-background-dark"
              onClick={selectMatch}
            >
              <Icon className="h-4 w-4">
                <path d="M20 6L9 17l-5-5" />
              </Icon>
              Select Match
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/85"
              onClick={() => viewFullProfile()}
            >
              <Icon className="h-4 w-4">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                <circle cx="12" cy="12" r="3" />
              </Icon>
              View Full Profile
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/85"
              onClick={() => navigate('/messages')}
            >
              <Icon className="h-4 w-4">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3.1 5.18 2 2 0 0 1 5.08 3h3a2 2 0 0 1 2 1.72c.12.86.3 1.7.54 2.5a2 2 0 0 1-.45 2.11L9 10.91a16 16 0 0 0 6.09 6.09l1.58-1.17a2 2 0 0 1 2.11-.45c.8.24 1.64.42 2.5.54A2 2 0 0 1 22 16.92z" />
              </Icon>
              Contact Center
            </button>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-background-dark/30 p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-lg font-bold">Route Preview</div>
                <div className="text-sm text-white/60">Map your current location to the donor location and preview the fastest road path.</div>
              </div>
              {routeSummary ? (
                <div className="flex flex-wrap gap-2 text-xs text-white/70">
                  <Chip>Road distance: {routeSummary.distance}</Chip>
                  <Chip>ETA: {routeSummary.eta}</Chip>
                  <Chip>{routePlan?.source === 'live-road-route' ? 'Live road route' : 'Estimated route'}</Chip>
                </div>
              ) : null}
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.95fr]">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                <div ref={routeMapElRef} className="h-[360px] w-full" aria-label="Route map" />
              </div>

              <div className="grid gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wider text-white/50">Our current location</div>
                  <div className="mt-2 text-base font-semibold">
                    {routePlan?.ourLocation.label || DEFAULT_CURRENT_LOCATION.label}
                  </div>
                  <div className="mt-1 text-sm text-white/65">
                    {routePlan ? `${routePlan.ourLocation.lat.toFixed(4)}, ${routePlan.ourLocation.lng.toFixed(4)}` : 'Click Run Algorithm to detect your current location.'}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wider text-white/50">Their current location</div>
                  <div className="mt-2 text-base font-semibold">
                    {routePlan?.candidate?.id || selectedCandidate.id}
                  </div>
                  <div className="mt-1 text-sm text-white/65">
                    {routePlan?.donorLocation.details || selectedCandidate.location.details}
                  </div>
                  <div className="mt-1 text-sm text-white/65">
                    {routePlan ? `${routePlan.donorLocation.lat.toFixed(4)}, ${routePlan.donorLocation.lng.toFixed(4)}` : 'Waiting for route calculation.'}
                  </div>
                </div>

                <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                  <div className="text-xs uppercase tracking-wider text-primary">Best way to reach them</div>
                  <div className="mt-2 text-sm text-white/80">
                    {routePlan
                      ? 'Follow the highlighted road path from your current location to the donor location. The route is optimized with live map data when available.'
                      : 'Run the algorithm to generate the fastest route and arrival estimate.'}
                  </div>
                  {routeSummary ? (
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="text-white/50">Distance</div>
                        <div className="font-bold">{routeSummary.distance}</div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="text-white/50">ETA</div>
                        <div className="font-bold">{routeSummary.eta}</div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div ref={profileSectionRef} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-wider text-white/50">Selected profile</div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold">Donor {selectedCandidate.id}</div>
                      <div className="text-sm text-white/65">{selectedCandidate.badge}</div>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                      {selectedCandidate.pct}% match
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-white/75">
                    <div>Blood: {selectedCandidate.blood}</div>
                    <div>HLA: {selectedCandidate.hla}</div>
                    <div>Distance: {selectedCandidate.distance}</div>
                    <div>ETA: {selectedCandidate.ischemic}</div>
                    <div>{selectedCandidate.summary}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold">Other Candidates</div>
            <div className="text-xs text-white/60">
              Sorted by:&nbsp;<span className="font-semibold text-white/85">Compatibility</span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {CANDIDATES.slice(1).map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                active={selectedCandidate.id === candidate.id}
                onOpen={viewFullProfile}
              />
            ))}
          </div>
        </section>
      </main>
      {modalCandidateId ? (
        (() => {
          const c = CANDIDATES.find((x) => x.id === modalCandidateId) || selectedCandidate
          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
              onClick={() => closeModal()}
            >
              <div
                className="max-w-2xl w-full rounded-2xl bg-card-dark/90 border border-white/10 p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-bold">Donor {c.id}</div>
                    <div className="text-sm text-white/65">{c.badge} • {c.location.details}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm"
                      onClick={() => closeModal()}
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <div className="text-sm text-white/70">{c.summary}</div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-white/75">
                      <div>Blood: {c.blood}</div>
                      <div>HLA: {c.hla}</div>
                      <div>Distance: {c.distance}</div>
                      <div>ETA: {c.ischemic}</div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-background-dark"
                      onClick={() => {
                        setSelectedCandidateId(c.id)
                        selectMatch()
                        closeModal()
                      }}
                    >
                      Select Match
                    </button>
                    <button
                      type="button"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85"
                      onClick={async () => {
                        setSelectedCandidateId(c.id)
                        await runAlgorithm()
                      }}
                    >
                      Get Directions
                    </button>
                    <button
                      type="button"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85"
                      onClick={() => {
                        setSelectedCandidateId(c.id)
                        navigate('/messages')
                        closeModal()
                      }}
                    >
                      Contact Center
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })()
      ) : null}
    </div>
  )
}
