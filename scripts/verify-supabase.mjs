// Verifies the Supabase backend end-to-end:
// insert → select → delete a test row using the anon key.
// Usage: node scripts/verify-supabase.mjs
// Requires VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function loadEnv(path) {
  try {
    const text = readFileSync(path, 'utf8')
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) process.env[m[1]] ??= m[2]
    }
  } catch {
    /* no .env — rely on real env vars */
  }
}
loadEnv(new URL('../.env', import.meta.url))

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const sb = createClient(url, key)
const tag = `verify-${Date.now()}`

const { data: inserted, error: insErr } = await sb
  .from('volunteers')
  .insert({
    name: tag,
    email: `${tag}@example.com`,
    phone: '+234 800 000 0000',
    team: 'technical',
    team_name: 'Technical',
    availability: 'All 3 days (Nov 4–6)',
    note: 'backend verification row',
  })
  .select()
  .single()
if (insErr) {
  console.error('INSERT failed:', insErr.message)
  process.exit(1)
}
console.log('INSERT ok:', inserted.id)

const { data: rows, error: selErr } = await sb
  .from('volunteers')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(3)
if (selErr) {
  console.error('SELECT failed:', selErr.message)
  process.exit(1)
}
console.log(`SELECT ok: newest ${rows.length} row(s), test row present: ${rows.some((r) => r.id === inserted.id)}`)

const { error: delErr } = await sb.from('volunteers').delete().eq('id', inserted.id)
if (delErr) {
  console.error('DELETE failed:', delErr.message)
  process.exit(1)
}
console.log('DELETE ok: test row removed. Backend is live ✔')
