import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const DEFAULT_LOCATION = { lat: 12.9716, lng: 77.5946 } // Bangalore (fallback)

const BANGALORE_HOSPITALS = [
  {
    id: 'apollo-bannerghatta',
    name: 'Apollo Hospitals, Bannerghatta Road',
    address: '154/11, Bannerghatta Main Rd, IIMB, Krishnaraju Layout, Bengaluru, Karnataka 560076',
    lat: 12.8926,
    lng: 77.5995,
    zip: '560076',
  },
  {
    id: 'fortis-bannerghatta',
    name: 'Fortis Hospital, Bannerghatta Road',
    address: '154/9, Bannerghatta Main Rd, Opp. IIM-B, Bengaluru, Karnataka 560076',
    lat: 12.892,
    lng: 77.599,
    zip: '560076',
  },
  {
    id: 'narayana-health-city',
    name: 'Narayana Health City',
    address: '258/A, Bommasandra Industrial Area, Hosur Rd, Bengaluru, Karnataka 560099',
    lat: 12.8122,
    lng: 77.7026,
    zip: '560099',
  },
  {
    id: 'manipal-jayanagar',
    name: 'Manipal Hospital, Jayanagar',
    address: 'No. 45, 45th Cross, 4th T Block, Jayanagar, Bengaluru, Karnataka 560041',
    lat: 12.9304,
    lng: 77.5828,
    zip: '560041',
  },
  {
    id: 'nimhans',
    name: 'NIMHANS',
    address: 'Hosur Rd, Lakkasandra, Bengaluru, Karnataka 560029',
    lat: 12.9435,
    lng: 77.5963,
    zip: '560029',
  },
]

function computeAge(dob) {
  if (!dob) return null
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const m = today.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1
  return age
}

function computeBmi(heightCm, weightKg) {
  const h = Number(heightCm)
  const w = Number(weightKg)
  if (!h || !w) return null
  const meters = h / 100
  if (!meters) return null
  const bmi = w / (meters * meters)
  if (!Number.isFinite(bmi)) return null
  return Math.round(bmi * 10) / 10
}

function bmiLabel(bmi) {
  if (bmi == null) return null
  if (bmi < 18.5) return 'Underweight'
  if (bmi < 25) return 'Healthy'
  if (bmi < 30) return 'Overweight'
  return 'Obese'
}

export default function PatientRegistration() {
  const navigate = useNavigate()

  const mapElRef = useRef(null)
  const mapRef = useRef(null)
  const markersLayerRef = useRef(null)

  const [fullName, setFullName] = useState('')
  const [mrn, setMrn] = useState('')
  const [dob, setDob] = useState('')
  const [sex, setSex] = useState('')

  const [organ, setOrgan] = useState('Kidneys')
  const [bloodType, setBloodType] = useState('O')
  const [rh, setRh] = useState('Positive (+)')

  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')

  const [hla, setHla] = useState({
    A1: '',
    A2: '',
    B1: '',
    B2: '',
    C1: '',
    C2: '',
    DR1: '',
    DR2: '',
    DQ1: '',
    DQ2: '',
    DP1: '',
    DP2: '',
  })

  const [hospitalCenter, setHospitalCenter] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [stateValue, setStateValue] = useState('Select...')

  const [unosStatus, setUnosStatus] = useState('2') // 1/2/3
  const [notes, setNotes] = useState('')

  const [savingDraft, setSavingDraft] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const age = useMemo(() => computeAge(dob), [dob])
  const bmi = useMemo(() => computeBmi(heightCm, weightKg), [heightCm, weightKg])
  const bmiText = useMemo(() => {
    const label = bmiLabel(bmi)
    if (bmi == null || !label) return null
    return `${bmi} (${label})`
  }, [bmi])

  const urgencyLevel = useMemo(() => {
    // Map 1/2/3 -> 5/4/3
    if (unosStatus === '1') return 5
    if (unosStatus === '2') return 4
    return 3
  }, [unosStatus])

  const filteredHospitals = useMemo(() => {
    const q = hospitalCenter.trim().toLowerCase()
    if (!q) return BANGALORE_HOSPITALS
    return BANGALORE_HOSPITALS.filter((h) => `${h.name} ${h.address} ${h.zip}`.toLowerCase().includes(q))
  }, [hospitalCenter])

  function selectHospital(h) {
    setHospitalCenter(`${h.name} — ${h.address}`)
    setZipCode(h.zip)
    setStateValue('Karnataka')
    if (mapRef.current) {
      mapRef.current.setView([h.lat, h.lng], 14)
    }
  }

  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return

    const map = L.map(mapElRef.current, {
      center: [DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng],
      zoom: 11,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    const layer = L.layerGroup().addTo(map)
    markersLayerRef.current = layer
    mapRef.current = map

    for (const h of BANGALORE_HOSPITALS) {
      const marker = L.circleMarker([h.lat, h.lng], { radius: 6 }).addTo(layer)
      marker.bindPopup(`<b>${h.name}</b><br/>${h.address}<br/>${h.zip}`)
      marker.on('click', () => selectHospital(h))
    }

    return () => {
      map.remove()
      mapRef.current = null
      markersLayerRef.current = null
    }
  }, [])

  async function handleSaveDraft() {
    setSavingDraft(true)
    setError('')
    setSuccess('')
    try {
      const draft = {
        fullName,
        mrn,
        dob,
        sex,
        organ,
        bloodType,
        rh,
        heightCm,
        weightKg,
        hla,
        hospitalCenter,
        zipCode,
        stateValue,
        unosStatus,
        notes,
        savedAt: new Date().toISOString(),
      }
      localStorage.setItem('patient_registration_draft', JSON.stringify(draft))
      setSuccess('Draft saved.')
    } catch (e) {
      setError('Unable to save draft.')
    } finally {
      setSavingDraft(false)
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    setSuccess('')

    if (!fullName.trim() || !mrn.trim() || !dob || !organ || !bloodType) {
      setError('Please complete all required fields in Demographics and Clinical sections.')
      setSubmitting(false)
      return
    }
    if (age == null || age < 0 || age > 120) {
      setError('Please enter a valid Date of Birth.')
      setSubmitting(false)
      return
    }

    const contact_info = [hospitalCenter.trim(), zipCode.trim(), stateValue].filter(Boolean).join(' • ') || 'N/A'
    const medical_status = notes.trim() || 'N/A'

    const payload = {
      patient_id: mrn.trim(),
      name: fullName.trim(),
      age,
      blood_type: bloodType,
      organ_required: organ,
      urgency_level: urgencyLevel,
      location: DEFAULT_LOCATION,
      medical_status,
      contact_info,
      extra_data: {
        dob,
        sex,
        rh,
        height_cm: heightCm ? Number(heightCm) : null,
        weight_kg: weightKg ? Number(weightKg) : null,
        bmi,
        hla,
        hospital_center: hospitalCenter,
        zip_code: zipCode,
        state: stateValue,
        unos_status: unosStatus,
      },
    }

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body?.error || 'Registration failed.')
        setSubmitting(false)
        return
      }

      localStorage.removeItem('patient_registration_draft')
      setSuccess('Patient registered successfully.')
      setSubmitting(false)
      setTimeout(() => navigate('/'), 700)
    } catch (e) {
      setError('Unable to reach server. Is the backend running on port 5001?')
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-gray-800 dark:text-gray-100 min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#10221b]/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <span className="material-icons-round text-2xl">favorite</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">LifeLink Connect</h1>
            <nav className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-2">
              <span>Dashboard</span>
              <span className="material-icons-round text-[10px]">chevron_right</span>
              <span>Patients</span>
              <span className="material-icons-round text-[10px]">chevron_right</span>
              <span className="text-primary font-semibold">New Registration</span>
            </nav>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <span className="material-icons-round text-sm text-gray-500">lock</span>
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">PHI Secure Environment</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-semibold">Dr. Sarah Chen</span>
              <span className="text-xs text-gray-500">Transplant Coordinator</span>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-primary/30 bg-primary/10" aria-hidden="true" />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-12 gap-8">
        <aside className="col-span-12 lg:col-span-3 hidden lg:block">
          <div className="sticky top-28 space-y-8">
            <div>
              <h2 className="text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold mb-4">
                Registration Steps
              </h2>
              <nav className="space-y-1 relative">
                <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-800 -z-10" />
                <a className="group flex items-center gap-4 py-2" href="#demographics">
                  <div className="w-8 h-8 rounded-full bg-primary text-black font-bold flex items-center justify-center text-sm shadow-[0_0_15px_rgba(18,226,140,0.4)]">
                    1
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">Demographics</span>
                </a>
                <a className="group flex items-center gap-4 py-2" href="#clinical">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 font-bold flex items-center justify-center text-sm group-hover:border-primary group-hover:text-primary transition-colors">
                    2
                  </div>
                  <span className="text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
                    Clinical Compatibility
                  </span>
                </a>
                <a className="group flex items-center gap-4 py-2" href="#logistics">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 font-bold flex items-center justify-center text-sm group-hover:border-primary group-hover:text-primary transition-colors">
                    3
                  </div>
                  <span className="text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
                    Logistics &amp; Location
                  </span>
                </a>
                <a className="group flex items-center gap-4 py-2" href="#urgency">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 font-bold flex items-center justify-center text-sm group-hover:border-primary group-hover:text-primary transition-colors">
                    4
                  </div>
                  <span className="text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
                    Urgency &amp; Notes
                  </span>
                </a>
              </nav>
            </div>

            <div className="bg-card-light dark:bg-card-dark rounded-xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="material-icons-round text-primary mt-0.5">info</span>
                <div>
                  <h3 className="text-sm font-bold mb-1">Match Accuracy</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Complete HLA typing increases match probability by 45%. Please ensure all antigen fields are verified.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="col-span-12 lg:col-span-9 space-y-6">
          {(error || success) && (
            <div
              className={
                error
                  ? 'rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200'
                  : 'rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm text-primary'
              }
              role="status"
            >
              {error || success}
            </div>
          )}

          <section
            className="bg-card-light dark:bg-card-dark rounded-xl p-6 lg:p-8 border border-gray-200 dark:border-gray-800 shadow-sm"
            id="demographics"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-1">Patient Demographics</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Basic identification information for the recipient.</p>
              </div>
              <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full border border-primary/20">
                Step 1 of 4
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                  Full Legal Name
                </label>
                <input
                  className="w-full bg-background-light dark:bg-background-dark border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm font-medium transition-all"
                  placeholder="e.g. Johnathan Doe"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                  Medical Record Number (MRN)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-gray-400 material-icons-round text-sm">badge</span>
                  <input
                    className="w-full bg-background-light dark:bg-background-dark border border-gray-300 dark:border-gray-700 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm font-medium transition-all"
                    placeholder="XXX-XX-XXXX"
                    type="text"
                    value={mrn}
                    onChange={(e) => setMrn(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                  Date of Birth
                </label>
                <input
                  className="w-full bg-background-light dark:bg-background-dark border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm font-medium transition-all text-gray-500 dark:text-gray-300"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                  Biological Sex
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="cursor-pointer">
                    <input
                      className="peer sr-only"
                      name="gender"
                      type="radio"
                      checked={sex === 'Male'}
                      onChange={() => setSex('Male')}
                    />
                    <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-background-light dark:bg-background-dark px-4 py-3 text-center text-sm font-medium peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary transition-all hover:bg-gray-100 dark:hover:bg-gray-800">
                      Male
                    </div>
                  </label>
                  <label className="cursor-pointer">
                    <input
                      className="peer sr-only"
                      name="gender"
                      type="radio"
                      checked={sex === 'Female'}
                      onChange={() => setSex('Female')}
                    />
                    <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-background-light dark:bg-background-dark px-4 py-3 text-center text-sm font-medium peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary transition-all hover:bg-gray-100 dark:hover:bg-gray-800">
                      Female
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section
            className="bg-card-light dark:bg-card-dark rounded-xl p-6 lg:p-8 border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden"
            id="clinical"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <h2 className="text-2xl font-bold mb-6">Clinical Compatibility</h2>

            <div className="mb-8">
              <label className="block text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider mb-3">
                Required Organ
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Heart', icon: 'favorite' },
                  { label: 'Kidneys', icon: 'local_florist' },
                  { label: 'Liver', icon: 'water_drop' },
                  { label: 'Lungs', icon: 'air' },
                ].map((o) => (
                  <label key={o.label} className="cursor-pointer group">
                    <input className="peer sr-only" name="organ" type="radio" checked={organ === o.label} onChange={() => setOrgan(o.label)} />
                    <div className="relative rounded-xl border border-gray-300 dark:border-gray-700 bg-background-light dark:bg-background-dark p-4 flex flex-col items-center gap-2 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-black transition-all hover:border-primary/50">
                      <span className="material-icons-round text-3xl opacity-70 group-hover:opacity-100">{o.icon}</span>
                      <span className="text-sm font-bold">{o.label === 'Kidneys' ? 'Kidney' : o.label}</span>
                      {o.label === organ ? (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white animate-pulse" />
                      ) : null}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <hr className="border-gray-200 dark:border-gray-800 mb-8" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <label className="block text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider mb-3">
                  Blood Type &amp; Rh
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {['A', 'B', 'AB', 'O'].map((bt) => (
                    <label key={bt} className="cursor-pointer flex-1">
                      <input className="peer sr-only" name="blood_type" type="radio" checked={bloodType === bt} onChange={() => setBloodType(bt)} />
                      <div className="h-12 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 bg-background-light dark:bg-background-dark font-bold text-lg peer-checked:bg-white dark:peer-checked:bg-white peer-checked:text-black peer-checked:border-white transition-all">
                        {bt}
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  {['Positive (+)', 'Negative (-)'].map((r) => (
                    <label key={r} className="cursor-pointer flex-1">
                      <input className="peer sr-only" name="rh" type="radio" checked={rh === r} onChange={() => setRh(r)} />
                      <div className="h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 bg-background-light dark:bg-background-dark font-bold peer-checked:bg-primary/20 peer-checked:text-primary peer-checked:border-primary transition-all">
                        {r}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-1/2 space-y-2">
                    <label className="block text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                      Height (cm)
                    </label>
                    <input
                      className="w-full bg-background-light dark:bg-background-dark border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm font-medium"
                      placeholder="175"
                      type="number"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                    />
                  </div>
                  <div className="w-1/2 space-y-2">
                    <label className="block text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                      Weight (kg)
                    </label>
                    <input
                      className="w-full bg-background-light dark:bg-background-dark border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm font-medium"
                      placeholder="70"
                      type="number"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-primary bg-primary/10 p-2 rounded-lg justify-center">
                  <span className="text-xs font-bold uppercase">BMI Estimate:</span>
                  <span className="text-sm font-bold">{bmiText || '—'}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                  HLA Tissue Typing
                </label>
                <button
                  className="text-xs text-primary font-bold hover:underline"
                  type="button"
                  onClick={() => setSuccess('Import not connected (demo).')}
                >
                  Import from Lab System
                </button>
              </div>

              <div className="bg-background-light dark:bg-background-dark border border-gray-300 dark:border-gray-700 rounded-xl p-4 grid grid-cols-2 md:grid-cols-6 gap-4">
                {[
                  { key: 'A', a: 'A1', b: 'A2' },
                  { key: 'B', a: 'B1', b: 'B2' },
                  { key: 'C', a: 'C1', b: 'C2' },
                  { key: 'DR', a: 'DR1', b: 'DR2' },
                  { key: 'DQ', a: 'DQ1', b: 'DQ2' },
                  { key: 'DP', a: 'DP1', b: 'DP2' },
                ].map((g) => (
                  <div key={g.key} className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-gray-500 block text-center">HLA-{g.key}</label>
                    <input
                      className="w-full text-center bg-card-light dark:bg-card-dark border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                      placeholder={g.a}
                      type="text"
                      value={hla[g.a]}
                      onChange={(e) => setHla((p) => ({ ...p, [g.a]: e.target.value }))}
                    />
                    <input
                      className="w-full text-center bg-card-light dark:bg-card-dark border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                      placeholder={g.b}
                      type="text"
                      value={hla[g.b]}
                      onChange={(e) => setHla((p) => ({ ...p, [g.b]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section
              className="bg-card-light dark:bg-card-dark rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm h-full"
              id="logistics"
            >
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="material-icons-round text-gray-400">place</span>
                Logistics &amp; Location
              </h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                    Hospital Center
                  </label>
                  <div className="relative">
                    <span className="material-icons-round absolute right-3 top-3 text-gray-400">search</span>
                    <input
                      className="w-full bg-background-light dark:bg-background-dark border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm font-medium"
                      placeholder="Search Hospital Database..."
                      type="text"
                      value={hospitalCenter}
                      onChange={(e) => setHospitalCenter(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                      Zip Code
                    </label>
                    <input
                      className="w-full bg-background-light dark:bg-background-dark border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm font-medium"
                      placeholder="560076"
                      type="text"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">State</label>
                    <select
                      className="w-full bg-background-light dark:bg-background-dark border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm font-medium text-gray-700 dark:text-gray-300"
                      value={stateValue}
                      onChange={(e) => setStateValue(e.target.value)}
                    >
                      <option>Select...</option>
                      <option>Karnataka</option>
                      <option>Tamil Nadu</option>
                      <option>Kerala</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                    Bangalore Hospitals
                  </div>
                  <div className="space-y-2">
                    {(filteredHospitals.length ? filteredHospitals : BANGALORE_HOSPITALS).slice(0, 5).map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => selectHospital(h)}
                        className="w-full text-left rounded-lg border border-gray-200 dark:border-gray-800 bg-background-light/60 dark:bg-background-dark/40 hover:bg-background-light dark:hover:bg-background-dark px-3 py-2 transition-colors"
                      >
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{h.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{h.address}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-lg overflow-hidden h-56 relative border border-gray-200 dark:border-gray-800">
                  <div ref={mapElRef} className="w-full h-full" aria-label="Bangalore hospitals map" />
                </div>
              </div>
            </section>

            <section
              className="bg-card-light dark:bg-card-dark rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm h-full flex flex-col"
              id="urgency"
            >
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="material-icons-round text-gray-400">warning</span>
                Urgency &amp; Notes
              </h2>
              <div className="space-y-4 flex-1">
                <div className="space-y-2">
                  <label className="block text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                    UNOS Status
                  </label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center p-3 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-background-light dark:hover:bg-background-dark cursor-pointer transition-colors">
                      <input
                        className="w-4 h-4 text-primary focus:ring-primary border-gray-500 bg-transparent"
                        name="urgency"
                        type="radio"
                        checked={unosStatus === '1'}
                        onChange={() => setUnosStatus('1')}
                      />
                      <div className="ml-3 flex-1">
                        <div className="text-sm font-bold">Status 1 (Critical)</div>
                        <div className="text-xs text-gray-500">Life expectancy less than 7 days without transplant</div>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                    </label>
                    <label className="flex items-center p-3 rounded-lg border border-primary bg-primary/5 cursor-pointer transition-colors">
                      <input
                        className="w-4 h-4 text-primary focus:ring-primary border-gray-500 bg-transparent"
                        name="urgency"
                        type="radio"
                        checked={unosStatus === '2'}
                        onChange={() => setUnosStatus('2')}
                      />
                      <div className="ml-3 flex-1">
                        <div className="text-sm font-bold text-primary">Status 2 (Urgent)</div>
                        <div className="text-xs text-gray-500">Hospitalized, continuous mechanical support</div>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                    </label>
                    <label className="flex items-center p-3 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-background-light dark:hover:bg-background-dark cursor-pointer transition-colors">
                      <input
                        className="w-4 h-4 text-primary focus:ring-primary border-gray-500 bg-transparent"
                        name="urgency"
                        type="radio"
                        checked={unosStatus === '3'}
                        onChange={() => setUnosStatus('3')}
                      />
                      <div className="ml-3 flex-1">
                        <div className="text-sm font-bold">Status 3 (Active)</div>
                        <div className="text-xs text-gray-500">Routine listing, waiting at home</div>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                    Physician Notes
                  </label>
                  <textarea
                    className="w-full bg-background-light dark:bg-background-dark border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm font-medium min-h-[100px]"
                    placeholder="Add specific clinical notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </section>
          </div>

          <div className="sticky bottom-6 bg-card-light dark:bg-card-dark border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-xl flex items-center justify-between z-40">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              <span className="text-gray-500">Draft saved 2 mins ago</span>
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                disabled={savingDraft}
                onClick={handleSaveDraft}
                className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 font-bold text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-60"
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="px-8 py-2.5 rounded-lg bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors shadow-[0_0_20px_rgba(18,226,140,0.3)] flex items-center gap-2 disabled:opacity-60"
              >
                <span>{submitting ? 'Registering...' : 'Register Patient'}</span>
                <span className="material-icons-round text-sm">arrow_forward</span>
              </button>
            </div>
          </div>

          <div className="h-10" />
        </div>
      </main>
    </div>
  )
}
