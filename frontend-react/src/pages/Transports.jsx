import { Link, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { acceptMatch } from '../matchState'

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

function TopMetric({ label, value, icon, tone = 'primary' }) {
  const toneClasses =
    tone === 'amber'
      ? 'border-amber-500/25 bg-amber-500/10 text-amber-400'
      : tone === 'blue'
        ? 'border-white/10 bg-white/5 text-white/80'
        : 'border-primary/25 bg-primary/10 text-primary'

  return (
    <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-card-dark/50 px-4 py-3">
      <div className={`grid h-9 w-9 place-items-center rounded-xl border ${toneClasses}`}>
        {icon}
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wider text-white/50">{label}</div>
        <div className="text-lg font-extrabold tracking-tight">{value}</div>
      </div>
    </div>
  )
}

function StatusDot({ tone }) {
  const cls =
    tone === 'green'
      ? 'bg-primary'
      : tone === 'amber'
        ? 'bg-amber-400'
        : tone === 'blue'
          ? 'bg-sky-400'
          : 'bg-white/40'
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />
}

function QueueItem({ icon, title, subtitle, status, statusTone, eta, from, to, active, onClick }) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={
        active
          ? 'rounded-2xl border border-primary/25 bg-primary/10 p-4 cursor-pointer'
          : 'rounded-2xl border border-white/10 bg-card-dark/40 p-4 cursor-pointer hover:bg-white/5'
      }
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={
              active
                ? 'grid h-10 w-10 place-items-center rounded-xl bg-background-dark/40 text-primary'
                : 'grid h-10 w-10 place-items-center rounded-xl bg-background-dark/40 text-white/70'
            }
          >
            {icon}
          </div>
          <div>
            <div className="text-sm font-bold">{title}</div>
            <div className="mt-1 flex items-center gap-2 text-xs text-white/60">
              <StatusDot tone={statusTone} />
              <span className="font-semibold text-white/70">{status}</span>
              <span className="text-white/35">•</span>
              <span>{subtitle}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-white/40">ETA</div>
          <div className="text-base font-extrabold tracking-tight">{eta}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/40">Origin</div>
          <div className="mt-1 text-xs font-semibold text-white/75">{from}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/40">Destination</div>
          <div className="mt-1 text-xs font-semibold text-white/75">{to}</div>
        </div>
      </div>
    </div>
  )
}

function SideIconButton({ active, children, label }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={
        active
          ? 'grid h-11 w-11 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary'
          : 'grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white/70'
      }
    >
      {children}
    </button>
  )
}

export default function Transports() {
  const navigate = useNavigate()
  const [trafficOn, setTrafficOn] = useState(false)
  const mapRef = useRef(null)
  const mapContainerRef = useRef(null)
  const routeLayerRef = useRef(null)
  const hospitalLayerRef = useRef(null)
  const originMarkerRef = useRef(null)
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [routeInfo, setRouteInfo] = useState(null)
  const markersRef = useRef({})
  const polylineCoordsRef = useRef({})
  const pollRef = useRef(null)
  const demoAnimRef = useRef({})
  const [animating, setAnimating] = useState(false)
  const [followUnit, setFollowUnit] = useState(true)
  const [speedMultiplier, setSpeedMultiplier] = useState(1)
  const [origin, setOrigin] = useState({ lat: 12.9184, lng: 77.6051 })
  const [selectedHospital, setSelectedHospital] = useState(null)
  const [mapReady, setMapReady] = useState(false)
  const [routingBusy, setRoutingBusy] = useState(false)
  const [hospitalsVisible, setHospitalsVisible] = useState(true)

  const BANGALORE_SOUTH_HOSPITALS = [
    { id: 'f', name: 'Fortis Hospital, Bannerghatta Road', lat: 12.8957, lng: 77.5967 },
    { id: 'a', name: 'Apollo Hospitals, Jayanagar', lat: 12.9304, lng: 77.5938 },
    { id: 'm', name: 'Manipal Hospital, Jayanagar', lat: 12.9297, lng: 77.5834 },
    { id: 's', name: "St. John's Medical College Hospital", lat: 12.9365, lng: 77.6051 },
    { id: 'n', name: 'Narayana Health City', lat: 12.8266, lng: 77.6606 },
  ]

  // sample coordinates for demonstration (lat, lng)
  const UNITS = {
    'Heart (ID #492)': {
      from: { lat: 12.9716, lng: 77.5946 },
      to: { lat: 12.9352, lng: 77.6245 },
    },
    'Kidney (ID #882)': {
      from: { lat: 12.9712, lng: 77.6412 },
      to: { lat: 12.9081, lng: 77.6476 },
    },
    'Lungs (ID #104)': {
      from: { lat: 12.9141, lng: 77.6446 },
      to: { lat: 12.9898, lng: 77.5537 },
    },
  }

  useEffect(() => {
    if (!mapContainerRef.current) return
    mapRef.current = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false }).setView([12.95, 77.61], 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(mapRef.current)
    routeLayerRef.current = L.layerGroup().addTo(mapRef.current)
    hospitalLayerRef.current = L.layerGroup().addTo(mapRef.current)

    originMarkerRef.current = L.circleMarker([origin.lat, origin.lng], {
      radius: 7,
      color: '#12e28c',
      fillColor: '#12e28c',
      fillOpacity: 0.95,
    })
      .addTo(routeLayerRef.current)
      .bindTooltip('Current Location', { permanent: false })

    for (const h of BANGALORE_SOUTH_HOSPITALS) {
      const marker = L.marker([h.lat, h.lng]).addTo(hospitalLayerRef.current)
      marker.bindPopup(`<strong>${h.name}</strong><br/>Bangalore South`)
      marker.on('click', () => {
        setSelectedHospital(h.name)
        routeFromOriginTo(h)
      })
    }

    setMapReady(true)
    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  async function osrmRoute(start, end) {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`
    const res = await fetch(url)
    const data = await res.json()
    if (!data?.routes?.length) throw new Error('No route found')
    return data.routes[0]
  }

  async function routeFromOriginTo(destination) {
    if (!mapRef.current || !routeLayerRef.current) return
    setRoutingBusy(true)
    try {
      routeLayerRef.current.clearLayers()
      originMarkerRef.current = L.circleMarker([origin.lat, origin.lng], {
        radius: 7,
        color: '#12e28c',
        fillColor: '#12e28c',
        fillOpacity: 0.95,
      })
        .addTo(routeLayerRef.current)
        .bindTooltip('Current Location', { permanent: false })
      L.marker([destination.lat, destination.lng]).addTo(routeLayerRef.current).bindPopup(destination.name)

      const route = await osrmRoute(origin, destination)
      const coords = route.geometry.coordinates.map((c) => [c[1], c[0]])
      const poly = L.polyline(coords, { color: '#12e28c', weight: 5 }).addTo(routeLayerRef.current)
      mapRef.current.fitBounds(poly.getBounds(), { padding: [40, 40] })
      setRouteInfo({
        distanceKm: +(route.distance / 1000).toFixed(1),
        durationMin: Math.round(route.duration / 60),
        source: 'osrm',
      })
    } catch (e) {
      setRouteInfo((prev) => prev || { distanceKm: 0, durationMin: 0, source: 'estimate' })
    } finally {
      setRoutingBusy(false)
    }
  }

  async function routeNearestHospital() {
    if (!mapReady) return
    setRoutingBusy(true)
    try {
      let best = null
      for (const h of BANGALORE_SOUTH_HOSPITALS) {
        try {
          const route = await osrmRoute(origin, h)
          if (!best || route.duration < best.duration) {
            best = { hospital: h, duration: route.duration, distance: route.distance }
          }
        } catch {
          // skip hospitals with no route response
        }
      }
      if (best) {
        setSelectedHospital(best.hospital.name)
        await routeFromOriginTo(best.hospital)
      }
    } finally {
      setRoutingBusy(false)
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const next = { lat: p.coords.latitude, lng: p.coords.longitude }
        setOrigin(next)
        if (mapRef.current) mapRef.current.setView([next.lat, next.lng], 12)
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function zoomInMap() {
    if (!mapRef.current) return
    mapRef.current.zoomIn()
  }

  function zoomOutMap() {
    if (!mapRef.current) return
    mapRef.current.zoomOut()
  }

  function toggleHospitalLayer() {
    if (!mapRef.current || !hospitalLayerRef.current) return
    if (hospitalsVisible) {
      mapRef.current.removeLayer(hospitalLayerRef.current)
      setHospitalsVisible(false)
      return
    }
    hospitalLayerRef.current.addTo(mapRef.current)
    setHospitalsVisible(true)
  }

  function showAllHospitals() {
    if (!mapRef.current) return
    const bounds = L.latLngBounds(BANGALORE_SOUTH_HOSPITALS.map((h) => [h.lat, h.lng]))
    if (origin?.lat && origin?.lng) bounds.extend([origin.lat, origin.lng])
    mapRef.current.fitBounds(bounds, { padding: [40, 40] })
  }

  function openSouthBangaloreMapImage() {
    const markerString = BANGALORE_SOUTH_HOSPITALS.map((h) => `${h.lat},${h.lng},red-pushpin`).join('|')
    const center = '12.9184,77.6051'
    const url = `https://staticmap.openstreetmap.de/staticmap.php?center=${center}&zoom=12&size=1280x800&markers=${encodeURIComponent(markerString)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  useEffect(() => {
    if (!selectedHospital || !trafficOn) return
    const destination = BANGALORE_SOUTH_HOSPITALS.find((h) => h.name === selectedHospital)
    if (destination) routeFromOriginTo(destination)
  }, [trafficOn])

  async function drawRouteFor(title) {
    const unit = UNITS[title]
    if (!unit || !mapRef.current) return
    const { from, to } = unit
    // clear
    routeLayerRef.current.clearLayers()
    // markers
    const m1 = L.marker([from.lat, from.lng]).addTo(routeLayerRef.current)
    const m2 = L.marker([to.lat, to.lng]).addTo(routeLayerRef.current)

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
      const res = await fetch(url)
      const data = await res.json()
      if (data?.routes?.length) {
        const coords = data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]])
        const poly = L.polyline(coords, { color: '#12e28c', weight: 4 }).addTo(routeLayerRef.current)
        polylineCoordsRef.current[title] = coords
        mapRef.current.fitBounds(poly.getBounds(), { padding: [40, 40] })
        const distM = data.routes[0].distance || 0
        const durS = data.routes[0].duration || 0
        const distanceKm = +(distM / 1000).toFixed(1)
        const durationMin = Math.round(durS / 60)
        setRouteInfo({ distanceKm, durationMin, source: 'osrm' })
      } else {
        // fallback: show bounds and estimate roughly
        mapRef.current.fitBounds(L.latLngBounds([ [from.lat, from.lng], [to.lat, to.lng] ]), { padding: [40,40] })
        const distanceKm = haversineKm(from, to)
        const avgSpeed = trafficOn ? 30 : 45
        const durationMin = Math.max(1, Math.round((distanceKm / avgSpeed) * 60))
        setRouteInfo({ distanceKm: +distanceKm.toFixed(1), durationMin, source: 'estimate' })
      }
    } catch (e) {
      mapRef.current.fitBounds(L.latLngBounds([ [from.lat, from.lng], [to.lat, to.lng] ]), { padding: [40,40] })
      const distanceKm = haversineKm(from, to)
      const avgSpeed = trafficOn ? 30 : 45
      const durationMin = Math.max(1, Math.round((distanceKm / avgSpeed) * 60))
      setRouteInfo({ distanceKm: +distanceKm.toFixed(1), durationMin, source: 'estimate' })
    }
  }

  function startSelectedAnimation(title) {
    if (!polylineCoordsRef.current[title] || !mapRef.current) return
    stopSelectedAnimation(title)
    setAnimating(true)
    const coords = polylineCoordsRef.current[title]
    let idx = 0
    demoAnimRef.current[title] = { idx }
    demoAnimRef.current[title].timer = setInterval(() => {
      const s = demoAnimRef.current[title]
      if (!s) return
      s.idx = (s.idx + 1) % coords.length
      const p = coords[s.idx]
      if (!markersRef.current[title]) {
        markersRef.current[title] = L.circleMarker(p, { radius: 6, color: '#12e28c', fillColor: '#12e28c' }).addTo(routeLayerRef.current)
      } else {
        markersRef.current[title].setLatLng(p)
      }
      if (followUnit && mapRef.current) mapRef.current.panTo(p)
    }, Math.max(200, Math.round(1000 / speedMultiplier)))
  }

  function stopSelectedAnimation(title) {
    const entry = demoAnimRef.current[title]
    if (entry && entry.timer) {
      clearInterval(entry.timer)
      delete demoAnimRef.current[title]
    }
    setAnimating(false)
  }

  function toggleAnimationForSelected() {
    if (!selectedUnit) return
    if (animating) stopSelectedAnimation(selectedUnit)
    else startSelectedAnimation(selectedUnit)
  }

  function haversineKm(a, b) {
    const toRad = (v) => (v * Math.PI) / 180
    const R = 6371
    const dLat = toRad(b.lat - a.lat)
    const dLon = toRad(b.lng - a.lng)
    const lat1 = toRad(a.lat)
    const lat2 = toRad(b.lat)
    const sinDLat = Math.sin(dLat / 2)
    const sinDLon = Math.sin(dLon / 2)
    const h = sinDLat * sinDLat + sinDLon * sinDLon * Math.cos(lat1) * Math.cos(lat2)
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
    return R * c
  }

  // Poll backend for live unit positions. Expected shape: [{ id, title, lat, lng, speed }]
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    async function poll() {
      try {
        const res = await fetch('/api/transports')
        if (!res.ok) throw new Error('no-data')
        const data = await res.json()
        if (!Array.isArray(data) || data.length === 0) throw new Error('no-units')

        // update/add markers
        for (const u of data) {
          const key = u.title || u.id
          if (markersRef.current[key]) {
            markersRef.current[key].setLatLng([u.lat, u.lng])
          } else {
            markersRef.current[key] = L.marker([u.lat, u.lng]).addTo(routeLayerRef.current)
            markersRef.current[key].bindTooltip(key, { permanent: false })
          }
        }
      } catch (e) {
        // fallback: animate demo units along their polylines if any
        for (const title of Object.keys(UNITS)) {
          if (!polylineCoordsRef.current[title]) continue
          // create marker if missing
          if (!markersRef.current[title]) {
            const start = polylineCoordsRef.current[title][0]
            markersRef.current[title] = L.circleMarker(start, { radius: 6, color: '#12e28c', fillColor: '#12e28c' }).addTo(routeLayerRef.current)
          }
          // start demo animation if not running
          if (!demoAnimRef.current[title]) {
            demoAnimRef.current[title] = { idx: 0 }
            demoAnimRef.current[title].timer = setInterval(() => {
              const coords = polylineCoordsRef.current[title]
              if (!coords || coords.length === 0) return
              const s = demoAnimRef.current[title]
              s.idx = (s.idx + 1) % coords.length
              markersRef.current[title].setLatLng(coords[s.idx])
            }, 1000)
          }
        }
      }
    }

    // initial poll & interval
    poll()
    pollRef.current = setInterval(poll, 3000)
    return () => {
      clearInterval(pollRef.current)
      // clear demo timers
      for (const k of Object.keys(demoAnimRef.current || {})) {
        clearInterval(demoAnimRef.current[k].timer)
      }
      demoAnimRef.current = {}
    }
  }, [mapReady])

  return (
    <div className="min-h-screen bg-background-dark text-white">
      <div className="border-b border-white/10 bg-background-dark/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15">
              <Icon className="h-4 w-4 text-primary">
                <path d="M12 2l8 4v6c0 5-3.5 9.4-8 10-4.5-.6-8-5-8-10V6l8-4z" />
                <path d="M9 12l2 2 4-4" />
              </Icon>
            </div>
            <div className="font-semibold tracking-tight">MANG</div>

            <div className="ml-4 hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 md:flex">
              <Icon className="h-4 w-4 text-white/50">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </Icon>
              <input
                className="w-72 border-0 bg-transparent p-0 text-sm text-white placeholder:text-white/40 focus:ring-0"
                placeholder="Search transports, IDs, hospitals"
              />
            </div>
          </div>

          <div className="hidden items-center gap-8 text-sm text-white/70 md:flex">
            <Link className="hover:text-white" to="/dashboard">
              Dashboard
            </Link>
            <Link className="text-primary" to="/logistics">
              Transports
            </Link>
            <Link className="hover:text-white" to="/inventory">
              Hospitals
            </Link>
            <Link className="hover:text-white" to="/messages">
              Settings
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5"
              aria-label="Alerts"
            >
              <Icon className="h-4 w-4 text-white/80">
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </Icon>
            </button>
            <div className="h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-white/10" aria-label="Profile">
              <div className="h-full w-full bg-gradient-to-br from-white/30 to-white/5" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-[72px_1fr] gap-6 px-6 py-6">
        <aside className="flex flex-col items-center gap-3">
          <SideIconButton label="Home">
            <Icon className="h-5 w-5">
              <rect x="4" y="4" width="7" height="7" rx="1" />
              <rect x="13" y="4" width="7" height="7" rx="1" />
              <rect x="4" y="13" width="7" height="7" rx="1" />
              <rect x="13" y="13" width="7" height="7" rx="1" />
            </Icon>
          </SideIconButton>
          <SideIconButton active label="Active">
            <Icon className="h-5 w-5">
              <path d="M12 2v6" />
              <path d="M12 8c3 0 5 2 5 5s-2 7-5 9c-3-2-5-6-5-9s2-5 5-5z" />
            </Icon>
          </SideIconButton>
          <SideIconButton label="Map">
            <Icon className="h-5 w-5">
              <path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z" />
              <path d="M9 3v15" />
              <path d="M15 6v15" />
            </Icon>
          </SideIconButton>
          <SideIconButton label="History">
            <Icon className="h-5 w-5">
              <path d="M3 3v5h5" />
              <path d="M3.05 13a9 9 0 1 0 .5-4" />
              <path d="M12 7v5l3 3" />
            </Icon>
          </SideIconButton>

          <div className="flex-1" />
          <SideIconButton label="Settings">
            <Icon className="h-5 w-5">
              <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-1.4 3.4h-.2a2 2 0 0 1-1.8-1.2 1.7 1.7 0 0 0-1.6-1h-.2a1.7 1.7 0 0 0-1.5 1 2 2 0 0 1-1.8 1.2h-.2a2 2 0 0 1-1.4-3.4l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.4-1h-.2a2 2 0 0 1 0-4h.2a1.7 1.7 0 0 0 1.4-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 0 1 6 3.6h.2A2 2 0 0 1 8 4.8a1.7 1.7 0 0 0 1.5 1h.2a1.7 1.7 0 0 0 1.6-1A2 2 0 0 1 13 3.6h.2a2 2 0 0 1 1.4 3.4l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.4 1h.2a2 2 0 0 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1z" />
            </Icon>
          </SideIconButton>
        </aside>

        <main>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-3xl font-extrabold tracking-tight">Live Transport Monitoring</div>
              <div className="mt-1 text-sm text-white/60">
                Region A • Bangalore City, Karnataka, India - 560076 • Shift Manager: Dr. Emily Chen
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <TopMetric
                label="Active Units"
                value="3"
                tone="primary"
                icon={
                  <Icon className="h-5 w-5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </Icon>
                }
              />
              <TopMetric
                label="Alerts"
                value="0"
                tone="amber"
                icon={
                  <Icon className="h-5 w-5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                  </Icon>
                }
              />
              <TopMetric
                label="Avg Speed"
                value="65 km/h"
                tone="blue"
                icon={
                  <Icon className="h-5 w-5">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 12l4-2" />
                  </Icon>
                }
              />
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
            <section>
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold">Transport Queue</div>
                <button
                  type="button"
                  className="text-xs font-semibold text-primary/90 hover:text-primary"
                  onClick={showAllHospitals}
                >
                  View All
                </button>
              </div>

              <div className="mt-3 grid gap-3">
                <QueueItem
                  active
                  title="Heart (ID #492)"
                  subtitle="In Transit"
                  status="In Transit"
                  statusTone="green"
                  eta="14m"
                  from="St. Mary's Hospital, Bengaluru"
                  to="General Hospital, Bengaluru"
                  onClick={() => {
                    setSelectedUnit('Heart (ID #492)')
                    drawRouteFor('Heart (ID #492)')
                  }}
                  icon={
                    <Icon className="h-5 w-5">
                      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
                    </Icon>
                  }
                />

                <QueueItem
                  title="Kidney (ID #882)"
                  subtitle="Preparing"
                  status="Preparing"
                  statusTone="amber"
                  eta="2h 10m"
                  from="Victoria Hospital, Bengaluru"
                  to="Narayana Health City, Bengaluru"
                  onClick={() => {
                    setSelectedUnit('Kidney (ID #882)')
                    drawRouteFor('Kidney (ID #882)')
                  }}
                  icon={
                    <Icon className="h-5 w-5">
                      <path d="M12 2v6" />
                      <path d="M12 8c3 0 5 2 5 5s-2 7-5 9c-3-2-5-6-5-9s2-5 5-5z" />
                    </Icon>
                  }
                />

                <QueueItem
                  title="Lungs (ID #104)"
                  subtitle="Approaching City"
                  status="Approaching City"
                  statusTone="blue"
                  eta="45m"
                  from="Manipal Hospital, Bengaluru"
                  to="BGS Gleneagles Global Hospital, Bengaluru"
                  onClick={() => {
                    setSelectedUnit('Lungs (ID #104)')
                    drawRouteFor('Lungs (ID #104)')
                  }}
                  icon={
                    <Icon className="h-5 w-5">
                      <path d="M12 21V3" />
                      <path d="M7 9c-2 0-4 2-4 5 0 3 2 5 4 5 2 0 3-2 3-4V9H7z" />
                      <path d="M17 9c2 0 4 2 4 5 0 3-2 5-4 5-2 0-3-2-3-4V9h3z" />
                    </Icon>
                  }
                />
              </div>

              <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-400">
                    <Icon className="h-5 w-5">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <path d="M12 9v4" />
                      <path d="M12 17h.01" />
                    </Icon>
                  </div>
                  <div>
                    <div className="text-sm font-bold">Traffic Congestion Detected</div>
                    <div className="mt-1 text-xs text-white/65">
                      Heavy traffic reported on NICE Road. Consider rerouting Unit #492.
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-card-dark/50">
              <div ref={mapContainerRef} className="absolute inset-0 z-0" />
              <div className="absolute inset-0 opacity-60" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)', backgroundSize: '18px 18px' }} />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background-dark/70" />

              <div className="absolute inset-6">
                <div className="absolute right-10 top-12 rounded-full bg-red-500/80 px-3 py-1 text-xs font-semibold text-white">
                  General Hospital
                </div>
                <div className="absolute left-16 bottom-28 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                  St. Mary's Hospital
                </div>

                <div className="absolute bottom-16 left-0 right-0 mx-auto max-w-[520px]">
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-background-dark/50 px-5 py-3">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <div className="h-1 flex-1 rounded-full bg-white/10">
                      <div className="relative h-1 w-3/4 rounded-full bg-primary">
                        <div className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-primary/40 bg-primary" />
                      </div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold">14m left</div>
                  </div>
                  <div className="mt-2 flex items-center justify-between px-2 text-[10px] uppercase tracking-wider text-white/35">
                    <span>Picked Up</span>
                    <span>Highway Exit</span>
                    <span>Arrival</span>
                  </div>
                </div>
              </div>

              <div className="absolute left-6 top-6 w-[320px] rounded-2xl border border-white/10 bg-background-dark/60 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold">Mission Control</div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold text-primary">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    LIVE
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-white/10">
                      <div className="h-full w-full bg-gradient-to-br from-white/30 to-white/5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold">Shiva</div>
                      <div className="text-xs text-white/55">Driver • +91 9876543210</div>
                      <div className="mt-2 grid gap-1 text-xs text-white/60">
                        <div>
                          <span className="text-white/40">Pickup: </span>
                          St. Mary's Hospital, Bengaluru
                        </div>
                        <div>
                          <span className="text-white/40">Drop: </span>
                          General Hospital, Bengaluru
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-primary"
                    aria-label="Call"
                  >
                    <Icon className="h-5 w-5">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3.1 5.18 2 2 0 0 1 5.08 3h3a2 2 0 0 1 2 1.72c.12.86.3 1.7.54 2.5a2 2 0 0 1-.45 2.11L9 10.91a16 16 0 0 0 6.09 6.09l1.58-1.17a2 2 0 0 1 2.11-.45c.8.24 1.64.42 2.5.54A2 2 0 0 1 22 16.92z" />
                    </Icon>
                  </button>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-card-dark/40 p-4">
                  <div className="text-[10px] uppercase tracking-wider text-white/40">Smart Container Vitals</div>
                  <div className="mt-3 grid gap-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-white/70">
                        <StatusDot tone="green" />
                        4.2°C (Optimal)
                      </span>
                      <span className="text-white/50"> </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-white/70">
                        <StatusDot tone="green" />
                        98%
                      </span>
                      <span className="text-white/50"> </span>
                    </div>
                  </div>
                </div>

                {routeInfo ? (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/2 p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-white/60">Route</div>
                      <div className="text-xs text-white/50">{routeInfo.source === 'osrm' ? 'Live' : 'Estimate'}</div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-4">
                      <div className="text-2xl font-extrabold">{routeInfo.distanceKm} km</div>
                      <div className="text-sm text-white/70">ETA {routeInfo.durationMin} min</div>
                    </div>
                    {selectedHospital ? <div className="mt-1 text-xs text-white/60">Destination: {selectedHospital}</div> : null}
                  </div>
                ) : null}

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/85"
                    onClick={useMyLocation}
                  >
                    Use My Location
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-white/10 bg-primary/20 px-3 py-2 text-xs font-semibold text-primary"
                    onClick={routeNearestHospital}
                    disabled={routingBusy}
                  >
                    {routingBusy ? 'Finding...' : 'Nearest Hospital Route'}
                  </button>
                </div>

                <button
                  type="button"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/85"
                  onClick={openSouthBangaloreMapImage}
                >
                  Open South Bangalore Hospitals Map Image
                </button>

                <div className="mt-2 flex flex-wrap gap-2">
                  {BANGALORE_SOUTH_HOSPITALS.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/80"
                      onClick={() => {
                        setSelectedHospital(h.name)
                        routeFromOriginTo(h)
                      }}
                    >
                      {h.name}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex gap-3 items-center">
                  <button
                    type="button"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85"
                    onClick={routeNearestHospital}
                  >
                    <Icon className="h-4 w-4">
                      <path d="M21 12a9 9 0 1 1-9-9" />
                      <path d="M22 3v6h-6" />
                    </Icon>
                    Optimize
                  </button>
                  <button
                    type="button"
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold ${
                      trafficOn ? 'bg-primary text-background-dark' : 'bg-white/5 text-white/85'
                    }`}
                    onClick={() => setTrafficOn((t) => !t)}
                  >
                    <Icon className="h-4 w-4">
                      <path d="M3 12h18" />
                      <path d="M7 6v12" />
                      <path d="M17 6v12" />
                    </Icon>
                    {trafficOn ? 'Traffic On' : 'Traffic'}
                  </button>
                </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/85"
                      onClick={() => toggleAnimationForSelected()}
                    >
                      {animating ? 'Pause' : 'Play'}
                    </button>

                    <button
                      type="button"
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${followUnit ? 'bg-primary text-background-dark' : 'bg-white/5 text-white/85'}`}
                      onClick={() => setFollowUnit((s) => !s)}
                    >
                      {followUnit ? 'Following' : 'Follow Off'}
                    </button>

                    <select
                      value={speedMultiplier}
                      onChange={(e) => setSpeedMultiplier(Number(e.target.value))}
                      className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/80"
                    >
                      <option value={0.5}>0.5x</option>
                      <option value={1}>1x</option>
                      <option value={2}>2x</option>
                    </select>
                  </div>

                <button
                  type="button"
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-extrabold text-background-dark"
                  onClick={() => {
                    acceptMatch()
                    navigate('/messages')
                  }}
                >
                  <Icon className="h-4 w-4">
                    <path d="M12 2v20" />
                    <path d="M2 12h20" />
                  </Icon>
                  Trigger Green Corridor
                </button>
              </div>

              <div className="absolute bottom-6 right-6 flex flex-col gap-3">
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-background-dark/50"
                  aria-label="Zoom in"
                  onClick={zoomInMap}
                >
                  <Icon className="h-4 w-4 text-white/80">
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </Icon>
                </button>
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-background-dark/50"
                  aria-label="Zoom out"
                  onClick={zoomOutMap}
                >
                  <Icon className="h-4 w-4 text-white/80">
                    <path d="M5 12h14" />
                  </Icon>
                </button>
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-background-dark/50"
                  aria-label="Layers"
                  onClick={toggleHospitalLayer}
                >
                  <Icon className="h-4 w-4 text-white/80">
                    <path d="M12 2l9 5-9 5-9-5 9-5z" />
                    <path d="M3 12l9 5 9-5" />
                  </Icon>
                </button>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
