import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DEMO_DOCTORS, getCurrentUser, logout } from '../auth'
import { ensureDoctorKeypair, deriveAesKey, decryptText, encryptText } from '../e2ee'

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

const DEMO_CASES = [
  {
    id: 'case-9092',
    title: 'Case: Heart Transplant #9092',
    status: 'Organ En Route',
    now: true,
    peerDoctorId: 'dr-smith',
    patient: {
      caseId: '#9092',
      recipientId: 'R-9921-X',
      recipientStatus: 'Pre-Op Ready',
      eta: '45 mins',
      donorMatched: true,
    },
  },
  {
    id: 'case-3811',
    title: 'Case: Liver Transplant #3811',
    status: 'Surgery Prep',
    now: false,
    peerDoctorId: 'dr-chen',
    patient: {
      caseId: '#3811',
      recipientId: 'R-4481-A',
      recipientStatus: 'In Review',
      eta: '2h 10m',
      donorMatched: false,
    },
  },
]

async function apiFetchJson(url, options) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error || `Request failed (${res.status})`
    throw new Error(msg)
  }
  return data
}

export default function SecureMessages() {
  const navigate = useNavigate()
  const current = getCurrentUser()
  const [activeCaseId, setActiveCaseId] = useState(DEMO_CASES[0].id)
  const activeCase = useMemo(() => DEMO_CASES.find((c) => c.id === activeCaseId) || DEMO_CASES[0], [activeCaseId])
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [peerKeyAvailable, setPeerKeyAvailable] = useState(false)
  const lastTimestampRef = useRef('')
  const pollRef = useRef(null)
  const scrollerRef = useRef(null)

  const me = useMemo(() => {
    const fallback = DEMO_DOCTORS[0]
    const u = current
    if (!u) return { id: fallback.id, name: fallback.name, email: fallback.email }
    return u
  }, [current])

  const peer = useMemo(() => {
    const peerId = activeCase.peerDoctorId
    return DEMO_DOCTORS.find((d) => d.id === peerId) || DEMO_DOCTORS[0]
  }, [activeCase.peerDoctorId])

  useEffect(() => {
    if (!scrollerRef.current) return
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight
  }, [messages.length])

  async function ensureKeysAndRegister() {
    setError('')
    try {
      const kp = await ensureDoctorKeypair(me.id)
      await apiFetchJson('/api/secure/keys/register', {
        method: 'POST',
        body: JSON.stringify({ doctor_id: me.id, public_key_jwk: kp.publicJwk }),
      })
      return kp
    } catch (e) {
      setError(String(e?.message || e))
      return null
    }
  }

  async function fetchPeerKey() {
    try {
      const data = await apiFetchJson(`/api/secure/keys/${peer.id}`)
      if (data?.public_key_jwk) {
        setPeerKeyAvailable(true)
        return data.public_key_jwk
      }
      setPeerKeyAvailable(false)
      return null
    } catch {
      setPeerKeyAvailable(false)
      return null
    }
  }

  async function decryptPayloads({ myPrivateJwk, peerPublicJwk, rows }) {
    const key = await deriveAesKey({ myPrivateJwk, peerPublicJwk })
    const aad = `${activeCase.id}|${me.id}|${peer.id}`
    const out = []
    for (const r of rows) {
      const p = r.payload
      if (!p || !p.iv || !p.ct) continue
      try {
        const text = await decryptText({ key, iv: p.iv, ct: p.ct, aad })
        out.push({
          id: r.message_id,
          senderId: r.sender_id,
          at: r.timestamp,
          text,
        })
      } catch {
        // Ignore undecryptable rows (wrong key / different case)
      }
    }
    return out
  }

  async function refreshMessages() {
    setStatus('Syncing…')
    const kp = await ensureKeysAndRegister()
    if (!kp) return
    const peerJwk = await fetchPeerKey()
    if (!peerJwk) {
      setStatus('Waiting for peer key…')
      return
    }

    try {
      const qs = new URLSearchParams({
        case_id: activeCase.id,
        doctor_id: me.id,
        peer_id: peer.id,
      })
      if (lastTimestampRef.current) qs.set('since', lastTimestampRef.current)
      const rows = await apiFetchJson(`/api/secure/messages?${qs.toString()}`)
      const decrypted = await decryptPayloads({ myPrivateJwk: kp.privateJwk, peerPublicJwk: peerJwk, rows })

      if (decrypted.length) {
        lastTimestampRef.current = decrypted[decrypted.length - 1].at || lastTimestampRef.current
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id))
          const merged = [...prev]
          for (const d of decrypted) if (!seen.has(d.id)) merged.push(d)
          return merged
        })
      }
      setStatus(peerKeyAvailable ? 'Secure link established' : 'Waiting for peer key…')
    } catch (e) {
      setStatus('Offline')
      setError(String(e?.message || e))
    }
  }

  useEffect(() => {
    setMessages([])
    lastTimestampRef.current = ''
    setPeerKeyAvailable(false)
    setError('')
    refreshMessages()

    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => {
      refreshMessages()
    }, 3000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCase.id, peer.id, me.id])

  async function sendMessage() {
    const text = String(draft || '').trim()
    if (!text) return
    setDraft('')
    setError('')

    const kp = await ensureKeysAndRegister()
    if (!kp) return
    const peerJwk = await fetchPeerKey()
    if (!peerJwk) {
      setError('Peer is not online yet (no public key registered).')
      return
    }

    try {
      const key = await deriveAesKey({ myPrivateJwk: kp.privateJwk, peerPublicJwk: peerJwk })
      const aad = `${activeCase.id}|${me.id}|${peer.id}`
      const enc = await encryptText({ key, plaintext: text, aad })
      const payload = { v: 1, alg: 'AES-GCM', iv: enc.iv, ct: enc.ct }

      const res = await apiFetchJson('/api/secure/messages', {
        method: 'POST',
        body: JSON.stringify({ sender_id: me.id, recipient_id: peer.id, case_id: activeCase.id, payload }),
      })

      setMessages((prev) => [
        ...prev,
        { id: res?.message?.message_id || `${Date.now()}`, senderId: me.id, at: res?.message?.timestamp, text },
      ])
    } catch (e) {
      setError(String(e?.message || e))
    }
  }

  return (
    <div className="min-h-screen bg-background-dark text-white">
      <div className="border-b border-white/10 bg-background-dark/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/15">
              <Icon className="h-5 w-5 text-primary">
                <path d="M12 2l8 4v6c0 5-3.5 9.4-8 10-4.5-.6-8-5-8-10V6l8-4z" />
                <path d="M9 12l2 2 4-4" />
              </Icon>
            </div>
            <div>
              <div className="text-sm font-extrabold tracking-tight">Secure Messages</div>
              <div className="text-[11px] text-white/55">End-to-end encrypted • {status || 'Connecting…'}</div>
            </div>
          </div>

          <div className="hidden items-center gap-6 text-sm text-white/70 md:flex">
            <Link className="hover:text-white" to="/dashboard">
              Dashboard
            </Link>
            <Link className="hover:text-white" to="/matching">
              Organ Matching
            </Link>
            <Link className="hover:text-white" to="/logistics">
              Live Logistics
            </Link>
            <Link className="text-primary" to="/messages">
              Messages
            </Link>
            <Link className="hover:text-white" to="/unmatched-organs">
              Protocols
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <div className="text-xs font-semibold text-white/80">{me.name}</div>
              <div className="text-[11px] text-white/45">{me.email}</div>
            </div>
            <button
              type="button"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80"
              onClick={() => {
                logout()
                window.location.assign('/login')
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-[320px_1fr_320px] gap-6 px-6 py-6">
        {/* Left: cases */}
        <aside className="rounded-2xl border border-white/10 bg-card-dark/50 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-extrabold">Active Cases</div>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5"
              aria-label="New"
              onClick={() => navigate('/messages/new')}
            >
              <Icon className="h-4 w-4 text-primary">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </Icon>
            </button>
          </div>
          <div className="mt-3 grid gap-2">
            {DEMO_CASES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCaseId(c.id)}
                className={
                  c.id === activeCase.id
                    ? 'w-full rounded-2xl border border-primary/25 bg-primary/10 p-4 text-left'
                    : 'w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10'
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-extrabold">{c.title.replace('Case: ', '')}</div>
                    <div className="mt-1 text-xs text-white/55">Status: {c.status}</div>
                  </div>
                  {c.now ? (
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                      NOW
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-white/60">
                      recent
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 border-t border-white/10 pt-4">
            <div className="text-xs font-bold uppercase tracking-wider text-white/45">Direct Messages</div>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="h-9 w-9 rounded-full border border-white/10 bg-white/10" />
              <div>
                <div className="text-sm font-bold">{peer.name}</div>
                <div className="text-xs text-white/55">Secure link: {peerKeyAvailable ? 'Established' : 'Pending'}</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Center: chat */}
        <section className="rounded-2xl border border-white/10 bg-card-dark/50">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/15">
                <Icon className="h-5 w-5 text-primary">
                  <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                </Icon>
              </div>
              <div>
                <div className="text-sm font-extrabold">{activeCase.title}</div>
                <div className="mt-1 text-xs text-white/55">
                  Status: <span className="text-primary">{activeCase.status}</span> • Secure Link{' '}
                  <span className="text-white/70">{peerKeyAvailable ? 'Established' : 'Pending'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5" aria-label="Call">
                <Icon className="h-4 w-4 text-white/80">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3.1 5.18 2 2 0 0 1 5.08 3h3a2 2 0 0 1 2 1.72c.12.86.3 1.7.54 2.5a2 2 0 0 1-.45 2.11L9 10.91a16 16 0 0 0 6.09 6.09l1.58-1.17a2 2 0 0 1 2.11-.45c.8.24 1.64.42 2.5.54A2 2 0 0 1 22 16.92z" />
                </Icon>
              </button>
              <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5" aria-label="Video">
                <Icon className="h-4 w-4 text-white/80">
                  <path d="M23 7l-7 5 7 5V7z" />
                  <rect x="1" y="5" width="15" height="14" rx="2" />
                </Icon>
              </button>
            </div>
          </div>

          <div ref={scrollerRef} className="h-[560px] overflow-y-auto p-4">
            <div className="mx-auto max-w-2xl">
              <div className="mb-4 flex justify-center">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/60">Today</span>
              </div>

              {error ? (
                <div className="mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  {error}
                </div>
              ) : null}

              {messages.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                  No decrypted messages yet. Once both doctors are logged in, messages will sync end-to-end encrypted.
                </div>
              ) : null}

              <div className="grid gap-3">
                {messages.map((m) => {
                  const mine = m.senderId === me.id
                  return (
                    <div key={m.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
                      <div
                        className={
                          mine
                            ? 'max-w-[75%] rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-background-dark'
                            : 'max-w-[75%] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85'
                        }
                      >
                        {m.text}
                        <div className={mine ? 'mt-2 text-[10px] text-background-dark/70' : 'mt-2 text-[10px] text-white/45'}>
                          {mine ? 'You' : peer.name}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="mx-auto flex max-w-2xl items-end gap-3">
              <div className="flex-1 rounded-2xl border border-white/10 bg-background-dark/30 p-3">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  className="w-full resize-none border-0 bg-transparent p-0 text-sm text-white placeholder:text-white/40 focus:ring-0"
                  placeholder="Type a secure message to the team…"
                />
              </div>
              <button
                type="button"
                onClick={sendMessage}
                className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-background-dark"
                aria-label="Send"
              >
                <Icon className="h-5 w-5">
                  <path d="M22 2L11 13" />
                  <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                </Icon>
              </button>
            </div>
            <div className="mt-3 text-center text-[11px] text-white/45">End-to-end encrypted. Server stores ciphertext only.</div>
          </div>
        </section>

        {/* Right: patient context */}
        <aside className="rounded-2xl border border-white/10 bg-card-dark/50 p-4">
          <div className="text-sm font-extrabold">Patient Context</div>
          <div className="mt-1 text-xs text-white/55">
            {activeCase.title.replace('Case: ', '')} • {activeCase.patient.caseId}
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-white/45">Donor Details</div>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                Matched
              </span>
            </div>
            <div className="mt-3 h-20 rounded-2xl border border-white/10 bg-background-dark/30" />
            <div className="mt-3 text-xs text-white/55">Restricted (E2EE coordination only)</div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-white/45">Recipient Details</div>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-white/55">ID</div>
              <div className="text-xs font-extrabold">{activeCase.patient.recipientId}</div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="text-xs text-white/55">Status</div>
              <div className="text-xs font-extrabold text-primary">{activeCase.patient.recipientStatus}</div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-white/45">Logistics & Transport</div>
            <div className="mt-3 h-28 rounded-2xl border border-white/10 bg-background-dark/30" />
            <div className="mt-3 flex items-center justify-between">
              <div>
                <div className="text-xs text-white/55">ETA to hospital</div>
                <div className="text-lg font-extrabold">{activeCase.patient.eta}</div>
              </div>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">Live</span>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-white/45">Case Files</div>
            <div className="mt-3 grid gap-2">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-background-dark/30 px-3 py-3">
                <div className="text-xs font-semibold">Consent_Form_Signed.pdf</div>
                <button type="button" className="text-xs font-bold text-primary">Download</button>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-background-dark/30 px-3 py-3">
                <div className="text-xs font-semibold">Organ_Imaging_Set_A.dicom</div>
                <button type="button" className="text-xs font-bold text-primary">Download</button>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center text-[11px] text-white/45">Secure environment</div>
        </aside>
      </div>
    </div>
  )
}
