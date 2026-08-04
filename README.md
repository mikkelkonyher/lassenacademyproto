# Lassen Music Academy

A Danish online music education platform where students can browse courses, meet instructors, and buy individual courses for lifetime access to their video lessons.

## Tech Stack

React 19, TypeScript, Vite, Tailwind CSS 4, Supabase (auth, database, edge functions), React Router v7.

## Getting Started

```bash
npm install
npm run dev
```

## Recreating the project from scratch

The full database schema lives in `supabase/migrations/` and the CLI configuration
in `supabase/config.toml`, so a new Supabase project can be built from this
repository alone:

```bash
supabase link --project-ref <new-project-ref>
supabase db push          # applies every migration in order
supabase functions deploy # verify_jwt flags come from config.toml
npm install && npm run build
```

The migration files up to `20260728124914` are verbatim copies of what was
applied to the current project. The final one,
`20260804090000_reconcile_dashboard_storage_changes.sql`, covers storage buckets
and policies that were created through the Supabase Dashboard and therefore never
entered the migration history; it is idempotent and has not been applied to the
existing project.

### What cannot live in Git

`db push` and `functions deploy` reproduce the schema and the code. The following
must be configured by hand, because they are credentials or live outside Supabase:

- **Supabase secrets** (`supabase secrets set`) — `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `MUX_SIGNING_KEY_ID`, `MUX_SIGNING_KEY_PRIVATE`,
  `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `CONTACT_TO_EMAIL`, `SENTRY_DSN`,
  `SENTRY_ENVIRONMENT`, and optionally `SITE_URL`.
- **Supabase Auth** — SMTP settings (the same Gmail account as the contact form)
  and the site URL plus redirect URLs.
- **Stripe** — products are not used; prices come from `courses.price_dkk`. A
  webhook endpoint pointing at `stripe-webhook` must be created, and its signing
  secret stored as `STRIPE_WEBHOOK_SECRET`.
- **Mux** — video assets and their playback IDs. `lessons.mux_playback_id` values
  refer to assets in a specific Mux account.
- **Content** — courses, lessons and news rows are data, not schema, and are not
  seeded by the migrations.
- **Local `.env`** — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `VITE_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`.
