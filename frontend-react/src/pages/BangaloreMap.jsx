import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const HOSPITALS = [
  { id: 'h1', name: "St. John's Medical College & Hospital", lat: 12.9506, lng: 77.5906 },
  { id: 'h2', name: 'Fortis Hospital, Bannerghatta Road', lat: 12.9172, lng: 77.5839 },
  { id: 'h3', name: 'Manipal Hospital, Jayanagar', lat: 12.9290, lng: 77.5938 },
  { id: 'h4', name: 'Apollo Hospitals, Jayanagar', lat: 12.9295, lng: 77.5987 },
  { id: 'h5', name: 'Narayana Health City', lat: 12.9486, lng: 77.6246 },
]

export default function BangaloreMap() {
  const mapRef = useRef(null)
  const containerRef = useRef(null)
  const routeLayerRef = useRef(null)
  const markersRef = useRef({})
  const [origin, setOrigin] = useState({ lat: 12.92, lng: 77.61 }) // center: Bangalore South
  const [selected, setSelected] = useState(null)
  const [routeInfo, setRouteInfo] = useState(null)

  useEffect(() => {
    if (!containerRef.current) return
    mapRef.current = L.map(containerRef.current, { zoomControl: true, attributionControl: false }).setView([origin.lat, origin.lng], 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapRef.current)
    routeLayerRef.current = L.layerGroup().addTo(mapRef.current)

    // add hospital markers
    for (const h of HOSPITALS) {
      const m = L.marker([h.lat, h.lng]).addTo(routeLayerRef.current)
      m.bindPopup(`<strong>${h.name}</strong><br/><button id="go-${h.id}">Route Here</button>`)
      markersRef.current[h.id] = m
      m.on('popupopen', () => {
        const btn = document.getElementById(`go-${h.id}`)
        if (btn) btn.onclick = () => {
          computeRouteTo(h)
        }
      })
    }

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  async function computeRouteTo(hospital) {
    if (!mapRef.current) return
    routeLayerRef.current.clearLayers()
    // add origin marker
    L.marker([origin.lat, origin.lng], { title: 'Origin' }).addTo(routeLayerRef.current)
    // add hospital marker
    L.marker([hospital.lat, hospital.lng], { title: hospital.name }).addTo(routeLayerRef.current)

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${hospital.lng},${hospital.lat}?overview=full&geometries=geojson`
      const res = await fetch(url)
      const data = await res.json()
      if (data?.routes?.length) {
        const coords = data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]])
        const poly = L.polyline(coords, { color: '#1db954', weight: 5 }).addTo(routeLayerRef.current)
        mapRef.current.fitBounds(poly.getBounds(), { padding: [40, 40] })
        const distKm = +(data.routes[0].distance / 1000).toFixed(2)
        const durMin = Math.round(data.routes[0].duration / 60)
        setSelected(hospital)
        setRouteInfo({ distKm, durMin })
      } else {
        setRouteInfo(null)
      }
    } catch (e) {
      setRouteInfo(null)
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return alert('Geolocation not available')
    navigator.geolocation.getCurrentPosition((p) => {
      setOrigin({ lat: p.coords.latitude, lng: p.coords.longitude })
      if (mapRef.current) mapRef.current.setView([p.coords.latitude, p.coords.longitude], 13)
    })
  }

  return (
    <div className="min-h-screen bg-background-dark text-white">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="text-3xl font-extrabold">Bangalore South — Nearby Multi-Speciality Hospitals</div>
        <div className="mt-2 text-sm text-white/60">Click any hospital marker and choose "Route Here" to get the easiest driving route.</div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-white/10 bg-card-dark/40 p-4">
              <div className="text-sm font-bold">Origin</div>
              <div className="mt-2 text-sm">Lat: {origin.lat.toFixed(4)}, Lng: {origin.lng.toFixed(4)}</div>
              <div className="mt-4 flex gap-2">
                <button type="button" className="btn" onClick={useMyLocation}>Use My Location</button>
                <button type="button" className="btn btn--ghost" onClick={() => { setOrigin({ lat: 12.92, lng: 77.61 }); mapRef.current?.setView([12.92,77.61],12) }}>Center</button>
              </div>

              <div className="mt-6">
                <div className="text-sm font-bold">Hospitals</div>
                <ul className="mt-2 space-y-2 text-sm">
                  {HOSPITALS.map((h) => (
                    <li key={h.id}>
                      <button type="button" className="w-full text-left" onClick={() => computeRouteTo(h)}>
                        <div className="font-semibold">{h.name}</div>
                        <div className="text-xs text-white/60">{h.lat.toFixed(4)}, {h.lng.toFixed(4)}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {routeInfo ? (
                <div className="mt-6 rounded-md border border-white/10 p-3 bg-white/2 text-sm">
                  <div className="font-semibold">Route to {selected?.name}</div>
                  <div className="mt-1">Distance: {routeInfo.distKm} km</div>
                  <div>ETA: {routeInfo.durMin} min</div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="lg:col-span-3">
            <div ref={containerRef} style={{ height: '640px' }} className="rounded-2xl border border-white/10 bg-card-dark/40" />
          </div>
        </div>
      </div>
    </div>
  )
}
