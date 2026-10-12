# HackJos 2026 — Volunteer Application

Volunteer signup for **HackJos 2026 — From Farm to Future**, a 48-hour agritech
hackathon and technology conference powered by nHub, Jos, Nigeria.
**Nov 4–6, 2026.**

A site to apply as a Volunteer for HackJos 2026, and to view the volunteers in
the admin page.

Applicants fill in their details, pick one of six volunteer teams, and submit.
Organisers review applications on a passcode-protected admin dashboard.

---

## Stack

- **Vite** + **React 19**
- **Tailwind CSS v4**
- **Supabase** (Postgres + Row Level Security + Realtime)
- **lucide-react** icons

## Getting started

```bash
npm install
```

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Then fill in the values (see [Configuration](#configuration)).

```bash
npm run dev      # start the dev server
npm run build    # production build
npm run preview  # preview the production build
npm run lint     # lint the source
```

---

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL, e.g. `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Yes | The **anon / publishable** key from Project Settings → API |
| `VITE_ADMIN_PASSCODE` | Recommended | Passcode for the admin dashboard |

> **Never commit the `service_role` key.** It bypasses Row Level Security and
> would let anyone read and delete the volunteers table. Only the publishable
> key belongs in a browser app — `.env` is git-ignored for this reason.

The admin passcode is read from the environment rather than hard-coded. Note
that Vite inlines `VITE_*` values into the built JavaScript, so this raises the
bar but is **not** real protection. For a hardened admin area, put the route
behind Supabase Auth.

---

## Database

The schema lives in `supabase/migrations/`. Apply it with the Supabase CLI:

```bash
npm install -D supabase
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Or paste the migration into **Supabase Dashboard → SQL Editor → New query** and
run it.

### `volunteers` table

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, defaults to `gen_random_uuid()` |
| `name` | `text` | Required |
| `email` | `text` | Required |
| `phone` | `text` | Required, digits only |
| `team` | `text` | Required — team id, e.g. `registration` |
| `team_name` | `text` | Human-readable team name |
| `availability` | `text` | Defaults to `''` |
| `note` | `text` | Optional message, max 400 chars |
| `created_at` | `timestamptz` | Defaults to `now()` |

Indexes exist on `team` and `created_at DESC` to support the admin filters and
newest-first ordering.

### Row Level Security

RLS is enabled with three policies for the `anon` role:

- **insert** — anyone may apply
- **select** — anyone may read (required for the admin dashboard, which uses the
  same publishable key)
- **delete** — anyone may delete

> ⚠️ **Before going live with real data:** these policies mean volunteer names,
> emails and phone numbers are readable by anyone who inspects network traffic.
> That is acceptable while testing. For production, restrict `select` and
> `delete` to an authenticated admin role, or proxy admin access through an Edge
> Function using the `service_role` key.

---

## Volunteer teams

Defined in `src/data/teams.js`. Each team carries an `accent` (used on light
surfaces), an `accentLight` (used on the dark admin panel) and a Lucide icon.

| id | Team |
| --- | --- |
| `technical` | Technical |
| `mentors` | 48hr Challenge Mentors |
| `swags` | Swags |
| `registration` | Registration |
| `ushering` | Ushering |
| `welfare` | Welfare |

---

## Project structure

```
src/
  App.jsx              # routes, navbar, application form, admin dashboard
  data/teams.js        # team definitions
  lib/
    supabase.js        # client + credential resolution
    store.js           # data access (Supabase-first, localStorage fallback)
  index.css            # design system: tokens, glass, motion
  form-green.css       # green glass form + admin panel styles
supabase/
  migrations/          # versioned SQL migrations
  config.toml
scripts/
  verify-supabase.mjs  # insert -> select -> delete round-trip test
```

## Routing

Hash-based routing, so no server rewrite rules are required:

- `#/` — public application form
- `#/admin` — protected dashboard

The admin session is scoped to the dashboard: navigating away clears it, so the
passcode is required every time `#/admin` is opened.

---

## Verify the backend

With your credentials in `.env`:

```bash
node scripts/verify-supabase.mjs
```

Runs an insert → select → delete round-trip and reports whether the table and
its RLS policies are working.
