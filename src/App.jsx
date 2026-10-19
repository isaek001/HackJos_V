import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCheck,
  ClipboardList,
  Clock,
  Download,
  GraduationCap,
  Lock,
  Loader2,
  Menu,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,  Trash2,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { TEAMS, teamById } from './data/teams.js'
import {
  clearVolunteers,
  DuplicateEmailError,
  getVolunteers,
  isAdminUnlocked,
  lockAdmin,
  removeVolunteer,
  saveVolunteer,
  setTeamEnabled,
  getTeamSettings,
  subscribeTeamSettings,
  subscribeVolunteers,
  toCsv,
  unlockAdmin,
} from './lib/store.js'

/* ---------- tiny reveal-on-scroll ---------- */
function useReveal(deps = []) {
  useEffect(() => {
    const showAll = () =>
      document
        .querySelectorAll('.reveal:not(.is-visible)')
        .forEach((el) => el.classList.add('is-visible'))

    if (!('IntersectionObserver' in window)) {
      showAll()
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.05, rootMargin: '0px 0px -40px 0px' },
    )
    document
      .querySelectorAll('.reveal:not(.is-visible)')
      .forEach((el) => io.observe(el))

    // Safety net: never leave content permanently invisible
    // (e.g. observer misses elements that are already in view).
    const failsafe = setTimeout(showAll, 1200)

    return () => {
      clearTimeout(failsafe)
      io.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash || '#/')
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/')
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash.startsWith('#/admin') ? 'admin' : 'site'
}

/* ---------- go & page ---------- */
const go = (path) => {
  window.location.hash = path
}

/* ---------- liquid glass interaction ----------
   Tracks the pointer over an element and exposes --mx / --my so the
   specular highlight follows the cursor. Pointer-fine devices only. */
function useLiquidGlass(ref) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const onMove = (e) => {
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${e.clientX - r.left}px`)
      el.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
    const onLeave = () => {
      el.style.setProperty('--mx', '50%')
      el.style.setProperty('--my', '0%')
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [ref])
}

/* ---------- Navigation ---------- */
function Navbar({ route, count }) {
  const [open, setOpen] = useState(false)
  const navRef = useRef(null)
  useLiquidGlass(navRef)

  // Close the sheet on route change / resize to desktop
  useEffect(() => setOpen(false), [route])
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = () => mq.matches && setOpen(false)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Lock scroll while the mobile sheet is open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Escape closes the sheet
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const brand = (
    <>
      <img
        src="/logo_white.png"
        alt="HackJos 2026 — From Farm to Future"
        className="hackjos-logo shrink-0"
        width={707}
        height={335}
      />
      <span className="hidden text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--color-muted)] xl:block">
        Volunteer crew
      </span>
    </>
  )

  return (
    <header
      className="fixed inset-x-0 top-0 z-50"
      style={{
        paddingTop: 'max(0.625rem, env(safe-area-inset-top))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
      }}
    >
      <nav
        ref={navRef}
        className="liquid liquid-lit anim-nav relative mx-auto flex h-16 w-full min-w-0 max-w-6xl items-center justify-between gap-2 rounded-[26px] px-3 sm:gap-3 sm:px-4"
        aria-label="Primary"
      >
        {/* Brand */}
        <button
          onClick={() => go('#/')}
          className="group flex shrink items-center gap-2.5 rounded-full py-1 pr-1 text-left sm:pr-2"
          aria-label="HackJos 2026 home"
        >
          {brand}
        </button>

        {/* Applied count */}
        {route === 'site' && (
          <span className="liquid-pill badge hidden shrink-0 whitespace-nowrap lg:inline-flex">
            <Users className="h-3 w-3" aria-hidden />
            <span className="tabular text-[var(--color-pine)]">{count}</span> applied
          </span>
        )}

        {/* Actions */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {route === 'site' ? (
            <>
              <a
                href="#apply"
                className="btn btn-primary btn-sm hidden sm:inline-flex"
                aria-label="Jump to the application form"
              >
                <span className="hidden lg:inline">Join as a Volunteer</span>
                <span className="lg:hidden">Apply</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </a>
              <a
                href="#apply"
                aria-label="Jump to the application form"
                className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-pine)] text-white sm:hidden"
              >
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            </>
          ) : (
            <a
              href="#/"
              onClick={(e) => {
                e.preventDefault()
                go('#/')
              }}
              className="btn btn-secondary btn-sm hidden sm:inline-flex"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Volunteer form
            </a>
          )}

          {route === 'site' && (
            <button
              onClick={() => go('#/admin')}
              className="hidden h-10 w-10 place-items-center rounded-full text-[var(--color-muted)] transition-colors hover:bg-white/70 hover:text-[var(--color-pine)] md:grid"
              aria-label="Open admin dashboard"
              title="Admin dashboard"
            >
              <ShieldCheck className="h-[18px] w-[18px]" aria-hidden />
            </button>
          )}

          {/* Mobile trigger */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-full text-[var(--color-ink)] transition-colors hover:bg-white/70 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-sheet"
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? (
              <X className="h-5 w-5" strokeWidth={2.2} aria-hidden />
            ) : (
              <Menu className="h-5 w-5" strokeWidth={2.2} aria-hidden />
            )}
          </button>
        </div>

        {/* Mobile sheet */}
        {open && (
          <div
            id="mobile-sheet"
            className="anim-sheet liquid liquid-strong absolute inset-x-0 top-[calc(100%+0.5rem)] max-h-[70vh] overflow-y-auto overscroll-contain rounded-[26px] p-2 md:hidden"
          >
            <div
              className="flex flex-col gap-2"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {route === 'site' ? (
                <>
                  <a
                    href="#apply"
                    onClick={() => setOpen(false)}
                    className="btn btn-primary btn-lg w-full shrink-0"
                  >
                    Join as a Volunteer
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </a>
                  <a
                    href="#/admin"
                    onClick={(e) => {
                      e.preventDefault()
                      go('#/admin')
                    }}
                    className="btn btn-secondary w-full"
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden />
                    Admin dashboard
                  </a>
                </>
              ) : (
                <a
                  href="#/"
                  onClick={(e) => {
                    e.preventDefault()
                    go('#/')
                  }}
                  className="btn btn-primary btn-lg w-full"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Back to application
                </a>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}

/* ---------- Form primitives ---------- */

/**
 * Labelled field with hint, inline error and a valid-state tick.
 * Placeholders supplement the label — they never replace it.
 */
function Field({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  hint,
  error,
  required,
  autoComplete,
  inputMode,
  maxLength,
  enterKeyHint,
  autoCapitalize,
  spellCheck,
  pattern,
  sanitise,
  className = '',
  children,
}) {
  const invalid = Boolean(error)
  const valid = !invalid && value && String(value).trim().length > 1
  const hintId = hint ? `${id}-hint` : undefined
  const errId = error ? `${id}-error` : undefined

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="fg-label mb-1.5 flex items-baseline justify-between gap-2"
      >
        <span>
          {label}
          {required && (
            <span className="fg-required ml-0.5" aria-hidden>
              *
            </span>
          )}
          {required && <span className="sr-only"> (required)</span>}
        </span>
        {hint && !invalid && (
          <span id={hintId} className="fg-hint">
            {hint}
          </span>
        )}
      </label>

      <div className="relative">
        {children ?? (
          <input
            id={id}
            name={id}
            type={type}
            value={value}
            onChange={
              sanitise
                ? (e) => onChange({ ...e, target: { ...e.target, value: sanitise(e.target.value) } })
                : onChange
            }
            placeholder={placeholder}
            autoComplete={autoComplete}
            inputMode={inputMode}
            enterKeyHint={enterKeyHint}
            autoCapitalize={autoCapitalize}
            autoCorrect={type === 'email' || type === 'tel' ? 'off' : undefined}
            spellCheck={spellCheck ?? type === 'text'}
            pattern={pattern}
            maxLength={maxLength}
            required={required}
            aria-invalid={invalid || undefined}
            aria-describedby={[errId, invalid ? undefined : hintId].filter(Boolean).join(' ') || undefined}
            className={`field ${invalid ? 'input-error' : ''} ${
              valid && (type === 'email' || type === 'tel') ? 'pr-10' : ''
            }`}
          />
        )}
        {valid && (type === 'email' || type === 'tel') && (
          <Check
            className="fg-valid pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
            strokeWidth={2.6}
            aria-hidden
          />
        )}
      </div>

      {error && (
        <p
          id={errId}
          role="alert"
          className="anim-fade mt-1.5 flex items-start gap-1.5 text-[12.5px] font-medium text-red-600"
        >
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}

/* ---------- Application Form ---------- */
const AVAILABILITY = 'All 3 days (Nov 4–6)'

function ApplicationForm({
  team,
  onTeamChange,
  onSubmitted,
  count,
  enabledTeams,
  settingsPending,
}) {
  const [form, setForm] = useState(() => ({
    name: '',
    email: '',
    phone: '',
    team: team || '',
    availability: AVAILABILITY,
    note: '',
    consent: false,
  }))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const submittingRef = useRef(false)

  // Teams an admin has switched off are not offered.
  const availableTeams = TEAMS.filter((t) => enabledTeams[t.id] !== false)
  const noneAvailable = availableTeams.length === 0

  // Until the first settings read settles we cannot know which teams are
  // open, so the picker stays inert and the submit button stays disabled.
  // Without this the form is briefly fully interactive, which would let a
  // volunteer submit to a team that had just been closed.
  const teamsSettling = Boolean(settingsPending) && !noneAvailable

  // If the chosen team gets disabled while the form is open, clear it.
  useEffect(() => {
    if (form.team && !availableTeams.some((t) => t.id === form.team)) {
      setForm((f) => ({ ...f, team: '' }))
      set('team', '')
    }
  }, [enabledTeams])

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const pickTeam = (id) => {
    set('team', id)
    onTeamChange(id)
  }

  const submit = async (e) => {
    e.preventDefault()
    // Guard: ignore repeat submissions while a request is in flight
    if (saving || submittingRef.current) return
    const errs = {}
    if (form.name.trim().length < 2) errs.name = 'Please enter your full name.'
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    )
      errs.email = 'Enter a valid email address.'
    if (form.phone.trim().length < 7) errs.phone = 'Enter a reachable phone number.'
    if (noneAvailable)
      errs.team = 'Applications are closed right now. Please check back soon.'
    else if (!form.team) errs.team = 'Select one of the teams below.'
    if (!form.consent) errs.consent = 'Please confirm your availability to continue.'
    setErrors(errs)
    if (Object.keys(errs).length) {
      // Move focus to the first invalid control for keyboard + screen readers
      const firstKey = ['name', 'email', 'phone', 'team', 'consent'].find((k) => errs[k])
      const target =
        firstKey === 'team'
          ? document.querySelector('input[name="team"]')
          : firstKey === 'consent'
            ? document.getElementById('v-consent')
            : document.getElementById(`v-${firstKey}`)
      target?.focus({ preventScroll: true })
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    submittingRef.current = true
    setSaving(true)
    setSubmitError('')
    try {
      const record = await saveVolunteer({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        team: form.team,
        teamName: teamById(form.team)?.name || form.team,
        availability: form.availability,
        note: form.note.trim(),
      })
      onSubmitted(record)
    } catch (err) {
      // A rejected field (e.g. an email that has already applied) is shown
      // inline on that input; anything else uses the failure banner.
      if (err instanceof DuplicateEmailError || err?.field) {
        const field = err.field || 'email'
        setErrors((prev) => ({ ...prev, [field]: err.message }))
        setSubmitError('')
        const target = document.getElementById(`v-${field}`)
        target?.focus({ preventScroll: true })
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else {
        setSubmitError(
          err?.message || 'We could not submit your application. Please try again.',
        )
      }
      submittingRef.current = false
    } finally {
      setSaving(false)
    }
  }

  const hasError = (k) => errors[k]

  const checks = [form.name.trim().length >= 2, form.team, form.consent]
  const done = checks.filter(Boolean).length
  const pct = Math.round((done / checks.length) * 100)

  return (
    <form onSubmit={submit} className="reveal is-visible" noValidate>
      {/* header */}
      <div className="form-green">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="fg-title">Get in Touch</h2>
            <p className="fg-sub mt-2">
              {count > 0 ? (
                <>
                  <span className="font-semibold text-white">{count}</span>{' '}
                  {count === 1 ? 'person has' : 'people have'} already applied
                </>
              ) : (
                'Be among the first to apply.'
              )}
            </p>
          </div>
          <span className="fg-badge badge shrink-0 gap-1.5 whitespace-nowrap">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            Nov 4–6 · Jos
          </span>
        </div>

        {/* progress */}
        <div className="mt-5">
          <div className="fg-progress-label flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em]">
            <span className="inline-flex items-center gap-1.5">
              {pct === 100 ? (
                <>
                  <CheckCheck className="h-3.5 w-3.5 text-[var(--color-leaf-2)]" aria-hidden />
                  Ready to submit
                </>
              ) : (
                <>
                  <Rocket className="h-3.5 w-3.5" aria-hidden />
                  Application progress
                </>
              )}
            </span>
            <span className="text-white">{pct}%</span>
          </div>
          <div className="progress-track mt-2">
            <div
              className="progress-fill"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* 1 — name + contact */}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field
            id="v-name"
            label="Full name"
            type="text"
            required
            autoComplete="name"
            autoCapitalize="words"
            enterKeyHint="next"
            spellCheck={false}
            placeholder="Enter your full name"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            error={hasError('name')}
            maxLength={80}
          />
          <Field
            id="v-email"
            label="Email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            enterKeyHint="next"
            spellCheck={false}
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            error={hasError('email')}
            maxLength={120}
          />
          {!hasError('email') && (
            <p className="fg-sub mt-1.5 text-[12.5px]">
              One application per email address, so a repeat is easy to spot.
            </p>
          )}
          <Field
            id="v-phone"
            label="Phone number"
            type="tel"
            required
            autoComplete="tel"
            inputMode="tel"
            enterKeyHint="done"
            spellCheck={false}
            placeholder="08000000000"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            error={hasError('phone')}
            maxLength={20}
            pattern="[0-9]*"
            sanitise={(v) => v.replace(/\D+/g, '')}
            className="md:col-span-2"
          />
        </div>

        {/* 2 — team picker */}
        <fieldset className="mt-6">
          <legend className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="fg-label">
              Choose your team
              <span className="fg-required ml-0.5" aria-hidden>
                *
              </span>
              <span className="sr-only"> (required)</span>
            </span>
            {form.team && (
              <span className="anim-check fg-valid inline-flex items-center gap-1 text-[12px] font-medium">
                <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                {teamById(form.team)?.name}
              </span>
            )}
          </legend>
          <p id="v-team-hint" className="fg-sub mb-3 text-[13px]">
            Pick one team you can switch later if your plans change.
          </p>
          {noneAvailable && (
            <p className="mb-3 rounded-lg border border-white/20 bg-black/25 px-4 py-3 text-[13.5px] leading-relaxed text-white/90">
              Volunteer applications are currently closed. Please check back soon.
            </p>
          )}
          <div
            className="grid gap-2"
            role="radiogroup"
            aria-label="Preferred team"
            aria-describedby="v-team-hint"
            aria-invalid={hasError('team') || undefined}
            aria-busy={teamsSettling || undefined}
            data-pending={teamsSettling || undefined}
          >
            {availableTeams.map((t) => {
              const active = form.team === t.id
              return (
                <label key={t.id} className="tile" data-active={active}>
                  <input
                    id={`team-${t.id}`}
                    type="radio"
                    name="team"
                    value={t.id}
                    checked={active}
                    disabled={teamsSettling}
                    aria-disabled={teamsSettling || undefined}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={() => pickTeam(t.id)}
                  />
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-white"
                    style={{ background: t.accent }}
                  >
                    <t.icon className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="tile-name block font-display text-[14.5px] font-semibold leading-tight">
                      {t.name}
                    </span>
                    <span className="tile-desc mt-0.5 block text-[12.5px] leading-snug">
                      {t.short}
                    </span>
                  </span>
                  <span className="radio-dot">
                    <Check className="h-3 w-3" strokeWidth={4} aria-hidden />
                  </span>
                </label>
              )
            })}
          </div>
          {hasError('team') && (
            <p
              role="alert"
              className="anim-fade mt-2 flex items-start gap-1.5 text-[12.5px] font-medium text-red-600"
            >
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
              {hasError('team')}
            </p>
          )}
        </fieldset>

        {/* 3 — availability */}
        <div className="mt-7">
          <span className="fg-label mb-1.5 block">
            Availability
          </span>
          <div
            className="fg-fixed flex items-center gap-3 px-4 py-3"
            role="group"
            aria-label="Availability"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/20 text-white">
              <CalendarDays className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="fg-label block">
                {AVAILABILITY}
              </span>
              <span className="fg-sub block">
                All volunteers are needed for the full three days.
              </span>
            </span>
            <Check
              className="fg-valid ml-auto h-5 w-5 shrink-0"
              strokeWidth={3}
              aria-hidden
            />
          </div>
        </div>

        {/* 4 — note */}
        <div className="mt-7">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <label
              htmlFor="v-note"
              className="text-[13px] font-semibold text-[var(--color-ink)]"
            >
              Why this team?{' '}
              <span className="fg-hint font-normal">(optional)</span>
            </label>
            <span
              className={`text-[11.5px] tabular ${
                form.note.length > 380
                  ? 'font-medium text-amber-600'
                  : 'text-[var(--color-subtle)]'
              }`}
            >
              {form.note.length}/400
            </span>
          </div>
          <textarea
            id="v-note"
            name="why-this-team"
            rows={3}
            maxLength={400}
            enterKeyHint="enter"
            className="field resize-none"
            placeholder="Skills, experience, or why this team — a line or two is enough."
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
          />
        </div>

        {/* Consent */}
        <div
          className="fg-consent mt-6 p-4"
          data-checked={form.consent ? 'true' : 'false'}
          data-invalid={hasError('consent') ? 'true' : 'false'}
        >
          <label htmlFor="v-consent" className="flex cursor-pointer items-start gap-3">
            <input
              id="v-consent"
              name="availability-confirmed"
              type="checkbox"
              checked={form.consent}
              onChange={(e) => set('consent', e.target.checked)}
              aria-invalid={Boolean(hasError('consent')) || undefined}
              aria-describedby={hasError('consent') ? 'v-consent-error' : undefined}
              className="mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer"
            />
            <span className="fg-consent-text text-[13.5px] leading-relaxed">
              I confirm I&apos;m available for HackJos 2026 duties in Jos and happy to be
              contacted about volunteering.{' '}
              <span className="text-[var(--color-leaf-2)]" aria-hidden>
                *
              </span>
              <span className="sr-only">(required)</span>
            </span>
          </label>
          {hasError('consent') && (
            <p
              id="v-consent-error"
              role="alert"
              className="anim-fade mt-1.5 flex items-start gap-1.5 text-[12.5px] font-medium text-red-600"
            >
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
              {hasError('consent')}
            </p>
          )}
        </div>

        {/* Failure state */}
        {submitError && (
          <div
            role="alert"
            className="anim-up fg-failure mt-5 flex items-start gap-3 p-4"
          >
            <AlertCircle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-red-600" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-red-800">
                We couldn&apos;t submit your application
              </p>
              <p className="mt-0.5 text-[13px] text-red-700">{submitError}</p>
              <p className="mt-1.5 text-[12.5px] text-red-600">
                Your details are still here — press submit to try again.
              </p>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={saving || noneAvailable || teamsSettling}
          aria-busy={saving || teamsSettling || undefined}
          className="btn btn-fg btn-lg pressable mt-6 w-full"
        >
          {noneAvailable ? (
            'Applications are closed'
          ) : teamsSettling ? (
            'Checking team availability…'
          ) : saving ? (
            <>
              <Loader2 className="spin h-4 w-4" aria-hidden />
              Submitting your application…
            </>
          ) : (
            <>
              {form.team
                ? `Submit application · ${teamById(form.team)?.name}`
                : 'Submit application'}
              <ArrowRight className="nudge h-4 w-4" aria-hidden />
            </>
          )}
        </button>
      </div>
    </form>
  )
}

/* ---------- Success card ---------- */
function SuccessCard({ record, onAgain }) {
  const team = teamById(record.team)
  const firstName = record.name ? record.name.split(' ')[0] : ''
  const summary = [
    ['Team', record.teamName],
    ['Availability', record.availability],
    ['Reference', String(record.id).slice(0, 8).toUpperCase()],
    ['Submitted', new Date(record.submittedAt).toLocaleString()],
  ]
  return (
    <div className="liquid liquid-strong card fade-in overflow-hidden">
      <div className="relative bg-[var(--color-pine)] px-7 py-9 text-center">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(198,242,78,.35) 0%, transparent 45%), radial-gradient(circle at 85% 80%, rgba(34,197,94,.35) 0%, transparent 50%)',
          }}
        />
        <div className="relative">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--color-leaf)] text-[var(--color-pine)] shadow-[0_0_0_8px_rgba(198,242,78,0.15)]">
            <Check className="h-7 w-7" strokeWidth={3} aria-hidden />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-white md:text-[28px]">
            Application received
          </h2>
          {firstName && (
            <p className="mt-1 text-[15px] font-medium text-[var(--color-leaf)]">Thanks, {firstName}!</p>
          )}
        </div>
      </div>

      <div className="p-7">
        <p className="text-[14.5px] leading-relaxed text-[var(--color-muted)]">
          You&apos;re on the{' '}
          <span className="font-semibold text-[var(--color-ink)]">{record.teamName}</span> crew.
          The team lead will reach out on{' '}
          <span className="font-medium text-[var(--color-ink)]">{record.email}</span> or{' '}
          <span className="font-medium text-[var(--color-ink)]">{record.phone}</span> with your
          shift details.
        </p>

        {team && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg font-display text-[13px] font-bold text-white"
              style={{ background: team.accent }}
            >
              {team.tag}
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold text-[var(--color-ink)]">What you'll do</p>
              <p className="mt-0.5 text-[13px] leading-snug text-[var(--color-muted)]">
                {team.blurb}
              </p>
            </div>
          </div>
        )}

        <dl className="mt-5 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
          {summary.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
                {k}
              </dt>
              <dd className="truncate text-[13.5px] font-medium text-[var(--color-ink)]">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6">
          <button
            onClick={onAgain}
            className="w-full rounded-lg bg-[var(--color-pine)] py-3 text-[14px] font-semibold text-white transition hover:bg-[var(--color-pine-2)] active:scale-[.99]"
          >
            Add another application
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- Event meta ---------- */
function EventMeta() {
  const rows = [
    ['Date', 'Nov 4–6, 2026'],
    ['Venue', 'Jos, Plateau State'],
    ['Format', '48hr hackathon + conference'],
    ['Organiser', 'nHub Nigeria'],
  ]
  return (
    <div className="panel-green">
      <p className="pg-title">The event</p>
      <p className="pg-heading mt-1.5">HackJos 2026</p>
      <p className="pg-body mt-0.5">From Farm to Future</p>
      <dl className="mt-4">
        {rows.map(([k, v]) => (
          <div key={k} className="pg-row">
            <dt className="shrink-0 pg-key">{k}</dt>
            <dd className="text-right pg-value">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/* ---------- Teams reference ---------- */
function TeamsReference({ selected, enabledTeams }) {
  const open = TEAMS.filter((t) => enabledTeams[t.id] !== false)
  return (
    <div className="panel-green">
      <h3 className="pg-title">The {TEAMS.length} teams</h3>
      <p className="pg-body mt-1.5 mb-3">
        {open.length === 0
          ? 'Applications are closed at the moment.'
          : open.length < TEAMS.length
            ? `${open.length} of ${TEAMS.length} teams are accepting volunteers.`
            : selected
              ? 'Your current pick is highlighted.'
              : 'Find the crew that fits you.'}
      </p>
      <ul className="space-y-0.5">
        {TEAMS.map((t) => {
          const active = selected === t.id
          const isOpen = enabledTeams[t.id] !== false
          return (
            <li
              key={t.id}
              className="pg-team"
              data-active={active}
              style={isOpen ? undefined : { opacity: 0.42 }}
            >
              <span className="pg-chip">
                <t.icon className="h-4 w-4" strokeWidth={2.2} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate pg-name">{t.name}</span>
                <span className="block truncate pg-desc">
                  {isOpen ? t.short : 'Applications closed'}
                </span>
              </span>
              {active && <span className="pg-pill">Pick</span>}
              {!isOpen && <span className="pg-closed">Closed</span>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ---------- Next steps ---------- */
function NextSteps() {
  const steps = [
    ['Submit', 'Takes ~2 minutes. Pick one team and go.'],
    ['Confirmation', 'Crew leads review and reach out by email.'],
    ['Show up', 'Check in at the Jos venue, Nov 4–6.'],
  ]
  return (
    <div className="panel-green">
      <h3 className="pg-title mb-4">What happens next</h3>
      <ol className="space-y-4">
        {steps.map(([t, d], i) => (
          <li key={t} className="pg-step">
            {i < steps.length - 1 && (
              <span
                className="absolute left-[11px] top-7 h-[calc(100%-8px)] w-px"
                style={{ background: 'rgb(255 255 255 / 0.22)' }}
              />
            )}
            <span className="pg-step-num">{i + 1}</span>
            <span className="min-w-0">
              <span className="block pg-name">{t}</span>
              <span className="block pg-body">{d}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="pg-note">
        <strong className="text-white">Questions?</strong>
        <br />
        <a href="mailto:info@hackjos.com.ng">info@hackjos.com.ng</a>
        {' · '}
        <a href="tel:+2348068897177">+234 806 889 7177</a>
      </p>
    </div>
  )
}

/* ---------- Site (form-first) ---------- */
function Site() {
  const [team, setTeam] = useState('')
  const [lastRecord, setLastRecord] = useState(null)
  const [count, setCount] = useState(0)
  const [enabledTeams, setEnabledTeams] = useState({})
  const [teamsPending, setTeamsPending] = useState(true)

  useReveal([team, lastRecord])

  const reloadCount = () => {
    getVolunteers()
      .then((rows) => setCount(rows.length))
      .catch(() => {})
  }

  useEffect(() => {
    reloadCount()
  }, [lastRecord])

  // Which teams are open. Admins can close teams; the form follows.
  useEffect(() => {
    let alive = true
    const load = () => {
      getTeamSettings()
        .then((s) => {
          if (alive) setEnabledTeams(s)
        })
        .catch(() => {})
        .finally(() => {
          // Never leave the form stuck behind the pending state.
          if (alive) setTeamsPending(false)
        })
    }
    load()
    const unsub = subscribeTeamSettings(load)
    return () => {
      alive = false
      unsub()
    }
  }, [])

  const scrollToForm = () =>
    requestAnimationFrame(() =>
      document
        .getElementById('apply')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )

  return (
    <main className="min-h-screen">
      <div className="shell pb-16" style={{ paddingTop: 'calc(4rem + 3.75rem)' }}>
        <div className="reveal max-w-2xl">
          <span className="badge badge-pine">HackJos 2026 · Powered by nHub</span>
          <h1 className="mt-4 text-3xl font-bold leading-[1.12] tracking-tight text-[var(--color-ink)] md:text-[42px]">
            Volunteer application
          </h1>
          <p className="mt-3 max-w-xl text-[15.5px] leading-relaxed text-[var(--color-muted)] md:text-base">
            Join the crew behind Nigeria&apos;s agritech hackathon —{' '}
            <span className="font-medium text-[var(--color-ink)]">Nov 4–6, Jos</span>. Fill the
            form once, pick one of the {TEAMS.length} teams, and we&apos;ll take it from there.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[var(--color-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-[var(--color-leaf-2)]" aria-hidden />
              Takes ~2 minutes
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-[var(--color-leaf-2)]" aria-hidden />
              No experience needed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <UtensilsCrossed className="h-4 w-4 text-[var(--color-leaf-2)]" aria-hidden />
              Meals provided
            </span>
          </div>
        </div>

        <div id="apply" className="mt-6 grid scroll-mt-24 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            {lastRecord ? (
              <SuccessCard record={lastRecord} onAgain={() => {
                setLastRecord(null)
                reloadCount()
                scrollToForm()
              }} />
            ) : (
              <ApplicationForm
                team={team}
                onTeamChange={setTeam}
                count={count}
                enabledTeams={enabledTeams}
                settingsPending={teamsPending}
                onSubmitted={(rec) => {
                  setLastRecord(rec)
                  reloadCount()
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              />
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20">
            <EventMeta />
            <TeamsReference selected={team} enabledTeams={enabledTeams} />
            <NextSteps />
          </aside>
        </div>
      </div>
    </main>
  )
}

/* ---------- Admin ---------- */
function Admin() {
  const [unlocked, setUnlocked] = useState(() => isAdminUnlocked())

  // Re-check on every mount: if the session was cleared while this
  // view was unmounted, fall back to the passcode screen.
  useEffect(() => {
    setUnlocked(isAdminUnlocked())
  }, [])
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [teamFilter, setTeamFilter] = useState('all')
  const [enabledTeams, setEnabledTeams] = useState({})
  const [savingTeam, setSavingTeam] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')

  const refresh = async () => {
    setLoading(true)
    setLoadError('')
    try {
      setRows(await getVolunteers())
    } catch (err) {
      setLoadError(err.message || 'Could not load volunteers.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let alive = true
    // Initial load + live updates (Supabase Realtime).
    // setState runs inside async callbacks only, to avoid cascading renders.
    getVolunteers()
      .then((fresh) => {
        if (alive) setRows(fresh)
      })
      .catch((err) => {
        if (alive) setLoadError(err.message || 'Could not load volunteers.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    const unsub = subscribeVolunteers(() => {
      getVolunteers()
        .then((fresh) => {
          if (alive) setRows(fresh)
        })
        .catch(() => {})
    })

    const loadTeams = () => {
      getTeamSettings()
        .then((s) => {
          if (alive) setEnabledTeams(s)
        })
        .catch(() => {})
    }
    loadTeams()
    const unsubTeams = subscribeTeamSettings(loadTeams)

    return () => {
      alive = false
      unsub()
      unsubTeams()
    }
  }, [])

  const openTeamCount = TEAMS.filter((t) => enabledTeams[t.id] !== false).length

  const stats = useMemo(() => {
    const byTeam = {}
    TEAMS.forEach((t) => { byTeam[t.id] = 0 })
    rows.forEach((r) => { byTeam[r.team] = (byTeam[r.team] || 0) + 1 })
    return { total: rows.length, byTeam }
  }, [rows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (teamFilter !== 'all' && r.team !== teamFilter) return false
      if (!q) return true
      return [r.name, r.email, r.phone, r.teamName, r.note, r.availability]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [rows, query, teamFilter])

  const exportCsv = () => {
    const csv = toCsv(filtered)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hackjos2026-volunteers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleTeam = async (teamId, enabled) => {
    setSavingTeam(teamId)
    setActionError('')
    // Optimistic: reflect the change immediately, roll back on failure.
    setEnabledTeams((prev) => ({ ...prev, [teamId]: enabled }))
    try {
      const next = await setTeamEnabled(teamId, enabled)
      setEnabledTeams(next)
    } catch (err) {
      setEnabledTeams((prev) => ({ ...prev, [teamId]: !enabled }))
      setActionError(err.message || 'Could not update the team.')
    } finally {
      setSavingTeam('')
    }
  }

  const handleRemove = async (r) => {
    if (!window.confirm(`Remove ${r.name}?`)) return
    setActionError('')
    try {
      setRows(await removeVolunteer(r.id))
    } catch (err) {
      setActionError(err.message || 'Could not remove volunteer.')
    }
  }

  const handleClear = async () => {
    if (!window.confirm('Remove ALL volunteers from the database?')) return
    setActionError('')
    try {
      await clearVolunteers()
      await refresh()
    } catch (err) {
      setActionError(err.message || 'Could not clear volunteers.')
    }
  }

  if (!unlocked) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 pt-16">
        <div className="admin-green max-w-md text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-white/20 text-white">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </span>
          <span className="ag-title mt-4 block">
            Admin only
          </span>
          <h1 className="ag-heading mt-2">Volunteer dashboard</h1>
          <p className="ag-body mt-3">
            This area is restricted. Enter the crew passcode to view volunteer applications.
          </p>
          <form
            className="mt-5 max-w-md"
            onSubmit={(e) => {
              e.preventDefault()
              if (unlockAdmin(code)) {
                setUnlocked(true)
                setCodeError('')
              } else {
                setCodeError('Incorrect passcode. Please try again.')
              }
            }}
          >
            <input
              id="admin-passcode"
              name="passcode"
              type="password"
              enterKeyHint="go"
              autoComplete="off"
              spellCheck={false}
              className="field w-full text-center text-lg font-semibold tracking-[0.2em]"
              placeholder="•••••••"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            {codeError && (
              <p className="ag-error mt-3">{codeError}</p>
            )}
            <button type="submit" className="btn btn-ag-primary btn-lg mt-4 w-full">
              Unlock dashboard →
            </button>
          </form>
          <button
              onClick={() => go('#/')}
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-[#bbf7d0] hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Back to application
            </button>
        </div>
      </main>
    )
  }

  return (
    <main
      className="shell pb-20"
      style={{ paddingTop: 'calc(4rem + 3.75rem)' }}
    >
      {/* header stats */}
      <div className="pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-2">
              <span className="ag-metric text-[34px] leading-none">
                {stats.total}
              </span>
              <span className="label">{stats.total === 1 ? 'volunteer' : 'volunteers'}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={refresh} className="btn btn-ag btn-sm">
              <RefreshCw className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Refresh
            </button>
            <button
              onClick={exportCsv}
              disabled={!filtered.length}
              className="btn btn-ag btn-sm"
            >
              <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
              CSV ({filtered.length})
            </button>
            <button
              onClick={handleClear}
              disabled={!rows.length}
              className="btn btn-ag-danger btn-sm"
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Clear all
            </button>
            <button
              onClick={() => {
                lockAdmin()
                setUnlocked(false)
                setCode('')
              }}
              className="btn btn-ag-primary btn-sm"
            >
              <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Lock
            </button>
          </div>
        </div>
      </div>

      {/* Team availability — controls what the public form offers */}
      <div className="admin-green mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="ag-chip">
              <Users className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="ag-heading text-[15px]">Team availability</h2>
              <p className="ag-muted">
                Switch a team off to hide it from the application form.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                openTeamCount === 0
                  ? 'bg-red-400/20 text-red-200 border border-red-300/40'
                  : openTeamCount < TEAMS.length
                    ? 'bg-amber-300/20 text-amber-100 border border-amber-200/40'
                    : 'bg-green-300/20 text-green-100 border border-green-200/40'
              }`}
            >
              {openTeamCount === 0
                ? 'Applications closed'
                : `${openTeamCount}/${TEAMS.length} open`}
            </span>
          </div>
        </div>

        {openTeamCount === 0 && (
          <p className="ag-card mt-3 flex items-start gap-2 text-[13px] text-red-100">
            <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden />
            Every team is switched off. The public form shows a closed notice and its
            submit button is disabled.
          </p>
        )}

        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {TEAMS.map((t) => {
            const on = enabledTeams[t.id] !== false
            const busy = savingTeam === t.id
            return (
              <li key={t.id} className="ag-card flex items-center gap-3">
                <span
                  className="ag-avatar"
                  style={{ background: on ? t.accent : 'rgba(255,255,255,0.12)' }}
                >
                  <t.icon className="h-4 w-4" strokeWidth={2.2} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate ag-cell-strong text-[13.5px]">
                    {t.name}
                  </span>
                  <span className="block truncate ag-cell-muted">
                    {on ? 'Open on the form' : 'Hidden from volunteers'}
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`${on ? 'Disable' : 'Enable'} ${t.name}`}
                  disabled={busy}
                  onClick={() => toggleTeam(t.id, !on)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${
                    on ? 'bg-leaf' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                      on ? 'left-[22px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Search + results live in one continuous green panel */}
      <div className="admin-green">
        <div className="flex flex-col gap-2">
          <div className="relative min-w-0 flex-1">
            <span
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/70"
              aria-hidden
            >
              <Search className="h-4 w-4" />
            </span>
            <input
              id="admin-search"
              name="search"
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              spellCheck={false}
              className="field pl-10 [&::-webkit-search-cancel-button]:hidden"
              placeholder="Search name, email, phone, note…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search volunteers"
            />
          </div>
          <select
              className="field shrink-0 sm:w-52"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
            >
              <option value="all">All teams ({stats.total})</option>
              {TEAMS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({stats.byTeam[t.id] || 0})
                </option>
              ))}
            </select>
        </div>

        {(loadError || actionError) && (
          <p className="ag-error mb-4">
            {loadError || actionError}{' '}
            <button onClick={refresh} className="underline">Retry</button>
          </p>
        )}
        {loading && rows.length === 0 && !loadError ? (
          <div className="ag-empty">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-white" />
            <p className="ag-body mt-4">Loading volunteers…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="ag-empty">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-white">
              <ClipboardList className="h-6 w-6" aria-hidden />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">
              {rows.length === 0 ? 'No volunteers yet' : 'No matches'}
            </h3>
            <p className="ag-body mx-auto mt-2 max-w-sm">
              {rows.length === 0
                ? 'Share the application link — new submissions appear here the moment they are sent.'
                : 'Try a different search or team filter.'}
            </p>
            <div className="mt-4 flex flex-wrap justify-center">
              <button onClick={() => go('#/')} className="btn btn-ag-primary btn-sm">
                Open application form →
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* desktop table — hidden on mobile where the card list takes over */}
            <div className="ag-table-wrap hidden md:block">
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Team</th>
                    <th>Contact</th>
                    <th>Availability</th>
                    <th>Note</th>
                    <th>Submitted</th>
                    <th className="text-right">⋯</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const team = teamById(r.team)
                    return (
                      <tr key={r.id}>
                        <td>
                          <span className="flex items-center gap-2.5">
                            <span className="ag-avatar">
                              {r.name
                                .split(' ')
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((w) => w[0]?.toUpperCase())
                                .join('') || '?'}
                            </span>
                            <span className="ag-cell-strong">{r.name}</span>
                          </span>
                        </td>
                        <td>
                          <span
                            className="ag-tag"
                            style={{
                              background: `${team?.accentLight || '#a7f3d0'}26`,
                          color: team?.accentLight || '#a7f3d0',
                          borderColor: `${team?.accentLight || '#a7f3d0'}59`,
                            }}
                          >
                            {r.teamName || team?.name}
                          </span>
                        </td>
                        <td>
                          <span className="block ag-cell-strong">{r.email}</span>
                          <span className="ag-cell-muted">{r.phone}</span>
                        </td>
                        <td className="ag-cell-muted">{r.availability}</td>
                        <td className="ag-cell-muted max-w-[220px] truncate" title={r.note}>
                          {r.note || '—'}
                        </td>
                        <td className="ag-cell-muted whitespace-nowrap">
                          {new Date(r.submittedAt).toLocaleString()}
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => handleRemove(r)}
                            className="ag-remove"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* mobile cards */}
            <div className="mt-2 space-y-2.5 md:hidden">
              {filtered.map((r) => {
                const team = teamById(r.team)
                return (
                  <div key={r.id} className="ag-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="ag-avatar">
                          {r.name
                            .split(' ')
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((w) => w[0]?.toUpperCase())
                            .join('') || '?'}
                        </span>
                        <div className="min-w-0">
                          <div className="ag-cell-strong truncate">{r.name}</div>
                          <div className="ag-cell-muted truncate">{r.email}</div>
                          <div className="ag-cell-muted">{r.phone}</div>
                        </div>
                      </div>
                      <span
                        className="ag-tag shrink-0"
                        style={{
                          background: `${team?.accentLight || '#a7f3d0'}26`,
                          color: team?.accentLight || '#a7f3d0',
                          borderColor: `${team?.accentLight || '#a7f3d0'}59`,
                        }}
                      >
                        {r.teamName}
                      </span>
                    </div>
                    <div className="ag-card-meta">
                      {r.availability} · {new Date(r.submittedAt).toLocaleDateString()}
                    </div>
                    {r.note && <div className="ag-card-note">“{r.note}”</div>}
                    <button onClick={() => handleRemove(r)} className="ag-remove mt-3">
                      Remove
                    </button>
                  </div>
                )
              })}
            </div>

            <p className="ag-muted mt-4">
              Showing {filtered.length} of {stats.total} · CSV export respects the current search + filter.
            </p>
          </>
        )}
      </div>
    </main>
  )
}

/* ---------- Footer ---------- */
function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-white">
      <div className="shell py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-[var(--color-muted)]">
        <span>© 2026 HackJos · Powered by nHub · Nov 4–6, Jos</span>
        <span>
          <a href="mailto:info@hackjos.com.ng" className="font-medium text-[var(--color-pine)] hover:underline">
            info@hackjos.com.ng
          </a>
          {' · '}
          <a href="https://www.hackjos.com.ng" target="_blank" rel="noreferrer" className="font-medium text-[var(--color-pine)] hover:underline">
            hackjos.com.ng ↗
          </a>
        </span>
      </div>
    </footer>
  )
}

/* ================= APP ================= */
export default function App() {
  const route = useHashRoute()
  const [count, setCount] = useState(0)

  // Protected route: the admin session ends as soon as the user
  // navigates away from #/admin, so the passcode is required
  // every time the dashboard is opened.
  useEffect(() => {
    if (route !== 'admin') lockAdmin()
  }, [route])

  useEffect(() => {
    let alive = true
    const load = () => {
      getVolunteers()
        .then((rows) => {
          if (alive) setCount(rows.length)
        })
        .catch(() => {})
    }
    load()
    const unsub = subscribeVolunteers(load)
    return () => {
      alive = false
      unsub()
    }
  }, [route])

  return (
    <div className="min-h-screen bg-[var(--color-bg)] font-sans text-[var(--color-ink)]">
      <Navbar route={route} count={count} />
      {route === 'admin' ? <Admin /> : <Site key="site" />}
      <Footer />
    </div>
  )
}