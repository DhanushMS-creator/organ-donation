function b64encode(bytes) {
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}

function b64decode(b64) {
  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

function keyStorageKey(doctorId) {
  return `organflow.e2ee.ecdh.${doctorId}`
}

export async function ensureDoctorKeypair(doctorId) {
  const storageKey = keyStorageKey(doctorId)
  const existing = localStorage.getItem(storageKey)
  if (existing) {
    try {
      const parsed = JSON.parse(existing)
      if (parsed?.publicJwk && parsed?.privateJwk) return parsed
    } catch {
      // fall through
    }
  }

  const keypair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  )
  const publicJwk = await crypto.subtle.exportKey('jwk', keypair.publicKey)
  const privateJwk = await crypto.subtle.exportKey('jwk', keypair.privateKey)

  const payload = {
    publicJwk,
    privateJwk,
    createdAt: new Date().toISOString(),
  }
  localStorage.setItem(storageKey, JSON.stringify(payload))
  return payload
}

export async function importEcdhPublicKey(jwk) {
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, [])
}

export async function importEcdhPrivateKey(jwk) {
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey'])
}

export async function deriveAesKey({ myPrivateJwk, peerPublicJwk }) {
  const privateKey = await importEcdhPrivateKey(myPrivateJwk)
  const publicKey = await importEcdhPublicKey(peerPublicJwk)

  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptText({ key, plaintext, aad }) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder().encode(String(plaintext ?? ''))
  const additionalData = aad ? new TextEncoder().encode(aad) : undefined
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData }, key, enc)
  return { iv: b64encode(iv), ct: b64encode(new Uint8Array(ct)) }
}

export async function decryptText({ key, iv, ct, aad }) {
  const additionalData = aad ? new TextEncoder().encode(aad) : undefined
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64decode(iv), additionalData },
    key,
    b64decode(ct)
  )
  return new TextDecoder().decode(pt)
}
