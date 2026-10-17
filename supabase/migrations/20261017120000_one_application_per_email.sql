-- HackJos 2026 · one application per email address
--
-- Volunteers were able to submit more than once. Two real pairs existed
-- (same email both times), so this migration removes the later of each
-- pair and then enforces the rule going forward.
--
-- Email is the identity key, not name: one of the duplicate pairs spelled
-- the name differently ("Mgbe Miracle Ekorosowo" / "Miracle Mgbe") while
-- reusing the same address. Two different people can legitimately share a
-- name, so a name constraint would reject real applicants.
--
-- Compared case-insensitively and ignoring surrounding whitespace, so
-- "A@b.com" and " a@b.com " count as the same address.

-- 1. Keep the earliest application per email, delete the re-submissions.
--    created_at breaks ties, with id as a deterministic fallback.
delete from public.volunteers a
using public.volunteers b
where lower(btrim(a.email)) = lower(btrim(b.email))
  and (a.created_at, a.id) > (b.created_at, b.id);

-- 2. Enforce one row per email address.
create unique index if not exists volunteers_email_unique_idx
  on public.volunteers (lower(btrim(email)));
