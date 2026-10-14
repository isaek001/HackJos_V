import { getSupabase, isSupabaseConfigured } from './supabase.js'

/**
 * Volunteer store.
 * Uses Supabase when VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set,
 * otherwise falls back to localStorage (frontend-only demo mode).
 */

export const isBackendLive = () => isSupabaseConfigured

/* ---------- mapping: DB (snake_case) <-> app (camelCase) ---------- */
const toRecord = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  team: row.team,
  teamName: row.team_name,
  availability: row.availability ?? '',
  note: row.note ?? '',
  submittedAt: row.created_at,
})

const toRow = (entry) => ({
  name: entry.name,
  email: entry.email,
  phone: entry.phone,
  team: entry.team,
  team_name: entry.teamName ?? entry.team,
  availability: entry.availability ?? '',
  note: entry.note ?? '',
})

/* ---------- localStorage fallback ---------- */
const STORAGE_KEY = 'hackjos2026.volunteers'

function localAll() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function localSave(entry) {
  const record = {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `v-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    submittedAt: new Date().toISOString(),
    ...entry,
  }
  const next = [record, ...localAll()]
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return record
}

/* ---------- public API (all async) ---------- */
export async function getVolunteers() {
  const sb = getSupabase()
  if (!sb) return localAll()
  const { data, error } = await sb
    .from('volunteers')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Could not load volunteers: ${error.message}`)
  return (data ?? []).map(toRecord)
}

export async function saveVolunteer(entry) {
  const sb = getSupabase()
  if (!sb) return localSave(entry)
  const { data, error } = await sb
    .from('volunteers')
    .insert(toRow(entry))
    .select()
    .single()
  if (error) throw new Error(`Could not save application: ${error.message}`)
  return toRecord(data)
}

export async function removeVolunteer(id) {
  const sb = getSupabase()
  if (!sb) {
    const next = localAll().filter((v) => v.id !== id)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    return next
  }
  const { error } = await sb.from('volunteers').delete().eq('id', id)
  if (error) throw new Error(`Could not remove volunteer: ${error.message}`)
  return getVolunteers()
}

export async function clearVolunteers() {
  const sb = getSupabase()
  if (!sb) {
    window.localStorage.removeItem(STORAGE_KEY)
    return
  }
  // Supabase requires a filter on delete; match every row.
  const { error } = await sb
    .from('volunteers')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) throw new Error(`Could not clear volunteers: ${error.message}`)
}

/**
 * Live updates for the admin dashboard.
 * Returns an unsubscribe function. No-op when offline/demo mode.
 */
/**
 * Live updates for the admin dashboard.
 * Returns an unsubscribe function. No-op when offline/demo mode.
 *
 * A unique channel name per subscription is required: React StrictMode mounts
 * effects twice in development, and Supabase throws if two channels share a
 * name on the same client.
 */
let realtimeSeq = 0

export function subscribeVolunteers(onChange) {
  const sb = getSupabase()
  if (!sb) return () => {}
  const channelName = `volunteers-live-${++realtimeSeq}-${Math.random()
    .toString(36)
    .slice(2, 8)}`

  const channel = sb
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'volunteers' },
      () => onChange(),
    )

  channel.subscribe()

  return () => {
    try {
      sb.removeChannel(channel)
    } catch {
      /* channel already torn down */
    }
  }
}

/* ---------- team availability settings ---------- */
/*
 * Admins can switch individual volunteer teams on or off. A team that is
 * off is hidden from the public application form. If every team is off
 * the form closes and the submit button is disabled.
 *
 * Shape: { [teamId]: boolean }. Teams with no row are treated as enabled,
 * so a fresh install behaves normally before the table is seeded.
 */

const TEAM_SETTINGS_KEY = 'hackjos2026.teamSettings'

function localTeamSettings() {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(TEAM_SETTINGS_KEY) || '{}') || {}
  } catch {
    return {}
  }
}

export async function getTeamSettings() {
  const sb = getSupabase()
  if (!sb) return localTeamSettings()
  const { data, error } = await sb.from('team_settings').select('team_id, enabled')
  if (error) {
    // A missing table should not break the public form.
    console.warn('Could not read team_settings:', error.message)
    return {}
  }
  const map = {}
  for (const row of data ?? []) map[row.team_id] = row.enabled
  return map
}

export async function setTeamEnabled(teamId, enabled) {
  const sb = getSupabase()
  if (!sb) {
    const next = { ...localTeamSettings(), [teamId]: enabled }
    window.localStorage.setItem(TEAM_SETTINGS_KEY, JSON.stringify(next))
    return next
  }
  const { error } = await sb
    .from('team_settings')
    .upsert({ team_id: teamId, enabled }, { onConflict: 'team_id' })
  if (error) throw new Error(`Could not update team: ${error.message}`)
  return getTeamSettings()
}

/** Live team-setting changes (e.g. an admin toggling a team in another tab). */
export function subscribeTeamSettings(onChange) {
  const sb = getSupabase()
  if (!sb) return () => {}
  const channelName = `team-settings-live-${++realtimeSeq}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
  const channel = sb
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'team_settings' },
      () => onChange(),
    )
  channel.subscribe()
  return () => {
    try {
      sb.removeChannel(channel)
    } catch {
      /* already torn down */
    }
  }
}

/* ---------- admin passcode gate (session-only) ---------- */
const ADMIN_KEY = 'hackjos2026.admin'

/**
 * The passcode lives in the env file so it is not hard-coded in source.
 * Note: any VITE_* value is inlined at build time, so this only raises the
 * bar — someone determined can still inspect the bundle. For real
 * protection, put the admin area behind Supabase Auth instead.
 */
const ADMIN_PASSCODE = (import.meta.env.VITE_ADMIN_PASSCODE || '').trim()

export function isAdminUnlocked() {
  try {
    return window.sessionStorage.getItem(ADMIN_KEY) === '1'
  } catch {
    return false
  }
}

export function unlockAdmin(code) {
  // Case-sensitive: only surrounding whitespace is trimmed.
  // With no passcode configured, the admin area is unreachable.
  const valid = ADMIN_PASSCODE.length > 0 && String(code ?? '').trim() === ADMIN_PASSCODE
  if (valid) {
    try {
      window.sessionStorage.setItem(ADMIN_KEY, '1')
    } catch {
      /* ignore */
    }
  }
  return valid
}

export function lockAdmin() {
  try {
    window.sessionStorage.removeItem(ADMIN_KEY)
  } catch {
    /* ignore */
  }
}

/* ---------- CSV export (unchanged) ---------- */
export function toCsv(rows) {
  const headers = ['Name', 'Team', 'Email', 'Phone', 'Availability', 'Note', 'Submitted']
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const lines = rows.map((r) =>
    [
      r.name,
      r.teamName ?? r.team,
      r.email,
      r.phone,
      r.availability,
      r.note,
      r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '',
    ]
      .map(escape)
      .join(','),
  )
  return [headers.join(','), ...lines].join('\n')
}
