const MATCH_KEY = 'organflow.activeMatch'

export function startMatch({ organName, matchId, expiresInMs = 2 * 60 * 1000 }) {
  const now = Date.now()
  const payload = {
    matchId: matchId || `match-${now}`,
    organName: organName || 'Organ',
    startedAt: now,
    expiresAt: now + Math.max(10_000, Number(expiresInMs) || 0),
    accepted: false,
  }
  localStorage.setItem(MATCH_KEY, JSON.stringify(payload))
  return payload
}

export function acceptMatch() {
  const m = getMatch()
  if (!m) return null
  const next = { ...m, accepted: true, acceptedAt: Date.now() }
  localStorage.setItem(MATCH_KEY, JSON.stringify(next))
  return next
}

export function clearMatch() {
  localStorage.removeItem(MATCH_KEY)
}

export function getMatch() {
  try {
    const raw = localStorage.getItem(MATCH_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (!parsed.expiresAt || !parsed.startedAt) return null
    return parsed
  } catch {
    return null
  }
}

export function isMatchExpired(match) {
  const m = match ?? getMatch()
  if (!m) return false
  if (m.accepted) return false
  return Date.now() > Number(m.expiresAt)
}
