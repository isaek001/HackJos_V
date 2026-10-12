import { createClient } from '@supabase/supabase-js'

/**
 * Supabase connection.
 *
 * Resolution order:
 *   1. Runtime override (localStorage) — lets an admin connect the app
 *      from the browser without editing files.
 *   2. Build-time env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) — the
 *      production path, baked in at build time.
 *
 * Only the *anon public* key belongs here. Never ship the service_role key:
 * it bypasses Row Level Security and would let anyone read/write the table
 * directly through the REST API.
 */

const RUNTIME_URL = 'hackjos2026.supabaseUrl'
const RUNTIME_KEY = 'hackjos2026.supabaseAnonKey'

const DEFAULT_URL = import.meta.env.VITE_SUPABASE_URL || ''

function safeGet(key) {
  try {
    return window.localStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

function safeSet(key, value) {
  try {
    if (value) window.localStorage.setItem(key, value)
    else window.localStorage.removeItem(key)
  } catch {
    /* storage unavailable (private mode) — fall back to env only */
  }
}

function resolve() {
  const url = safeGet(RUNTIME_URL) || DEFAULT_URL
  // Accept either name: the long-standing ANON_KEY or the newer
  // PUBLISHABLE_KEY that Supabase now uses in its own env examples.
  const anonKey =
    safeGet(RUNTIME_KEY) ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    ''
  return { url: url.trim(), anonKey: anonKey.trim() }
}

let client = null
let clientKey = ''

export function getConfig() {
  const { url, anonKey } = resolve()
  return {
    url,
    anonKey,
    usingRuntime: Boolean(safeGet(RUNTIME_KEY)),
  }
}

export function isSupabaseConfigured() {
  const { url, anonKey } = resolve()
  return Boolean(url && anonKey)
}

/** Persist (or clear) a runtime connection. */
export function setRuntimeCredentials({ url, anonKey }) {
  safeSet(RUNTIME_URL, (url ?? '').trim())
  safeSet(RUNTIME_KEY, (anonKey ?? '').trim())
  client = null
  clientKey = ''
}

export function clearRuntimeCredentials() {
  safeSet(RUNTIME_URL, '')
  safeSet(RUNTIME_KEY, '')
  client = null
  clientKey = ''
}

export function getSupabase() {
  const { url, anonKey } = resolve()
  if (!url || !anonKey) return null

  const key = `${url}|${anonKey}`
  if (!client || clientKey !== key) {
    client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    clientKey = key
  }
  return client
}

/** Normalise a pasted key (people often add stray quotes or whitespace). */
export function normaliseKey(raw) {
  return String(raw || '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/\s+/g, '')
}
