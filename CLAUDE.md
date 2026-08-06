# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lassen Music Academy — a React SPA for a Danish music education platform built with React 19, TypeScript, Vite, and Tailwind CSS 4.

## Commands

- `npm run dev` — Start Vite dev server (default: http://localhost:5173)
- `npm run build` — TypeScript check + Vite production build (`tsc -b && vite build`)
- `npm run lint` — ESLint across the project
- `npm run preview` — Preview production build locally
- `npm test` — Run Vitest unit/component tests (`vitest run`)
- `npm run test:watch` — Run Vitest in watch mode

## Architecture

**Routing:** React Router v7 with `BrowserRouter` in `main.tsx`. Two routes:
- `/` — Landing page composed of section components in `App.tsx`
- `/teacher/:teacherSlug` — Individual instructor page (`pages/TeacherDetail.tsx`)

**State:** React Context API for language (DA/EN toggle). Component-level `useState` for UI state (modals, menus). No external state library.

**i18n:** `src/translations.ts` holds all UI strings keyed by `da`/`en`. Components access translations via `useLanguage()` hook from `src/context/LanguageContext.tsx` — pattern: `const { t } = useLanguage()`.

**Supabase:** Client initialized in `src/supabase/client.ts` using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars. Currently a scaffold — not yet used for data fetching or auth.

**Supabase MCP access:** You may freely use the Supabase MCP to **read** anything (e.g. `list_tables`, `execute_sql` SELECTs, `get_logs`, `get_advisors`, `list_migrations`) without asking. But **always ask for the user's permission before writing anything** — any `apply_migration`, `execute_sql` that mutates data/schema (INSERT/UPDATE/DELETE/DDL), `deploy_edge_function`, branch operations, or other state-changing call.

**Database migrations:** `supabase/migrations/` holds the full schema history so the project can be rebuilt from Git alone. The 28 files up to `20260728124914` are **verbatim** extracts of what was actually applied, pulled out of `supabase_migrations.schema_migrations` and byte-for-byte checksum-verified against it — don't reformat or "tidy" them, or they stop matching the remote history. `supabase/config.toml` carries `project_id` and the per-function `verify_jwt` flags.

`20260804090000_reconcile_dashboard_storage_changes.sql` is the one exception: it covers four storage changes (the `news-images` and `course-thumbnails` buckets, the two admin news-image policies, and the raised `avatars` size limit) that were made in the Dashboard and so never entered the migration history. It has **not** been applied to the live project — it is a no-op there — so `supabase migration list` correctly shows it as local only. It is idempotent.

**Rule going forward:** after any `apply_migration` via MCP, extract the new migration into `supabase/migrations/` with the same version and name, so the repo does not drift again:

```sql
select array_to_string(statements, E'\n') from supabase_migrations.schema_migrations where version = '<version>';
```

**Mux:** Video hosting for course content. Assets are managed via the Mux MCP (configured in local scope `~/.claude.json` as HTTP transport, **not** in `.mcp.json`). **Paid lessons use `signed` playback**; only the free-preview lesson is `public`. Each asset carries exactly one playback ID — the old public IDs were deleted, so streaming a paid lesson requires a token from `get-mux-token`. `MUX_TOKEN_ID` and `MUX_TOKEN_SECRET` env vars store API credentials for direct API calls (e.g. track deletion, which the MCP's delete track tool doesn't handle reliably).

Posters do **not** come from `image.mux.com`: a signed playback ID refuses unsigned image requests, and Mux requires thumbnail options (`width`, `time`, `fit_mode`) to be JWT claims rather than query parameters. Since anonymous catalogue visitors and non-owners can't hold a token, posters live in the `course-thumbnails` Storage bucket via `courses.image_url` and `lessons.thumbnail_url` (see `src/utils/courseImage.ts`).

**Data:** Teachers, courses, and testimonials are hardcoded arrays inside their respective components (`TeacherDetail.tsx`, `FeaturedSection.tsx`, `SocialProof.tsx`).

## Styling

- Tailwind CSS 4 with PostCSS (utility-first, all inline classes)
- Dark theme with CSS custom properties (HSL) defined in `src/index.css`
- Primary color: vibrant orange; Accent: purple; Background: dark blue-grey
- Custom CSS classes in `index.css`: `.glass` / `.glass-strong` (glassmorphism), custom keyframe animations (`gradient-x`, `shimmer`, `float`, `pulse-glow`, `scroll`)
- Tailwind config extends with custom colors, Inter font, and 0.75rem border radius

## Edge Functions

Supabase Edge Functions live in `supabase/functions/<function-name>/index.ts`. These are Deno runtime files (not compiled by the project's TypeScript config). Local copies mirror what is deployed to Supabase.

**Community forum functions** (all require JWT auth, sanitize input, detect spam, enforce rate limits):
- `create-forum-post` — Creates a new post (max 5/hour)
- `update-forum-post` — Updates a post with ownership check (max 20 edits/hour)
- `delete-forum-post` — Deletes a post + comments + notifications with ownership check (max 10/hour)
- `create-forum-comment` — Creates a comment + notifies post author (max 15/hour)
- `update-forum-comment` — Updates a comment with ownership check (max 20 edits/hour)
- `delete-forum-comment` — Deletes a comment + notifications with ownership check (max 15/hour)

Database safety net: `forum_rate_limits` table tracks actions, `CHECK` constraints enforce text limits, RLS policies enforce ownership.

> **`create-forum-comment` is the only writer to `forum_notifications`.** An `on_forum_comment_created` trigger on `forum_comments` used to insert an identical row as well, so every reply produced **two** entries in the notification bell. The trigger and its `notify_post_owner_on_comment()` function were dropped in `20260805072417_fix_duplicate_forum_notifications.sql`, which also deduplicated the existing rows and added `UNIQUE (comment_id, user_id)` so a second write path can never silently reintroduce duplicates. Don't add a DB trigger back — put notification logic in the Edge Function where it is greppable.

**Contact form** (`send-contact-message`): **public** Edge Function (no JWT — deploy with JWT verification OFF, like `fetch-podcast-feed`). Relays a contact-form submission to `CONTACT_TO_EMAIL` over **Gmail SMTP** (`denomailer`), reusing the same Gmail account configured in Supabase Auth → SMTP. Abuse protection: hidden honeypot field, spam-pattern detection, best-effort in-memory per-IP throttle. Secrets: `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `CONTACT_TO_EMAIL`. Consumed by `src/pages/Contact.tsx` (POST with `apikey` header, no `Authorization`).

**Signed video playback** (`get-mux-token`): **public** Edge Function (deploy with `--no-verify-jwt` — free-preview lessons must play for logged-out visitors, so the function does its own optional-auth handling). Mints short-lived Mux JWTs (`playback` = `aud: 'v'`, `storyboard` = `aud: 's'`, 1 h TTL) only for viewers who own the lesson's parent course. Returns `{ tokens: null, reason: "public" }` for unmigrated assets, `401 AUTH_REQUIRED` for anonymous callers, `403 NOT_OWNED` otherwise. This is the **server-side** paywall — the `canPlay` check in `LessonPlayer.tsx` only gates the UI. Secrets: `MUX_SIGNING_KEY_ID`, `MUX_SIGNING_KEY_PRIVATE`.

> **Gotcha:** Mux issues signing keys **base64-encoded**, and they decode to **PKCS#1** (`BEGIN RSA PRIVATE KEY`), while `jose.importPKCS8` only accepts PKCS#8. `normalisePrivateKey()` handles base64, literal `\n`, and the PKCS#1 → PKCS#8 conversion. Don't "simplify" it away.

**Course material download** (`get-course-material`): JWT **required** (no `config.toml` entry — functions not listed there default to `verify_jwt = true`). Mints a 120 s Supabase Storage signed URL for a course's PDF, but only after re-checking `user_course_purchases` — the same ownership query `get-mux-token` uses. Error codes mirror it: `401 AUTH_REQUIRED`, `403 NOT_OWNED`, `404 NOT_FOUND`, `400 INVALID_INPUT`. A missing course, an unpublished one and one without a PDF all answer the same 404 so callers can't probe. The `download` option on `createSignedUrl` sets `Content-Disposition: attachment` and names the file after the course slug. Consumed by `src/components/CourseMaterialButton.tsx` (via `callEdgeFunction`), rendered in `LessonPlayer.tsx` only when `ownsCourse && course.pdf_path` — a UI gate only.

> **`course-materials` is the project's only PRIVATE bucket.** `avatars`, `news-images` and `course-thumbnails` are all public and read with `getPublicUrl`; public buckets are served through `/storage/v1/object/public/...`, which **bypasses RLS entirely**. That is fine for posters but would hand paid material to anyone holding the URL. `course-materials` therefore has `public = false`, `application/pdf` only, a 20 MB cap, and — like `course-thumbnails` — **no storage policies at all**: the service role bypasses RLS and the Edge Function is the only reader. Don't add a SELECT policy, and don't flip the bucket public. Bruno steps 38-39 exist to catch exactly that.
>
> `courses.pdf_path` holds an opaque path, not a URL. It is world-readable via the `"Anyone can read published courses"` policy, which is harmless: without a signed URL the path grants no access.

**Uploading course material:** there is no admin UI for courses — like lessons and thumbnails, PDFs are managed outside the app. Either upload in the Dashboard (Storage → `course-materials` → `<course-id>/materiale.pdf`) and set `courses.pdf_path` in Studio, or use the CLI: `supabase storage cp --experimental <file> "ss:///course-materials/<course-id>/materiale.pdf"` (the `--experimental` flag is mandatory, and `storage` takes no `--project-ref` — it uses the linked project).

Consumed by `src/hooks/useMuxToken.ts`, which skips the request entirely for `public` lessons and refreshes tokens 60 s before expiry.

**Stripe payments** — one-time course purchases:
- `create-checkout-session` — JWT **on**. Creates a Stripe Checkout Session and returns `{ url, session_id }`; the SPA just does `window.location = url` (no Stripe.js, no publishable key in the frontend). Price is computed server-side from `courses.price_dkk` + the 2026 promo, so a client can never dictate what it pays. Returns `409 ALREADY_OWNED` if the user already has the course. Rate limited 10/h.
  - **Withdrawal-right consent.** Requires `terms_accepted: true` in the body, else `400 TERMS_NOT_ACCEPTED`. Danish consumer law only lets the 14-day withdrawal right lapse for digital content when the customer expressly consents to immediate delivery *and* acknowledges the consequence, so `BuyCourseModal` renders its own checkbox (never pre-checked, resets when the modal reopens) rather than using Stripe's `consent_collection` — Stripe's generic "I agree to the terms" says nothing about the withdrawal right, and it depends on a ToS URL configured in the Dashboard. The check sits with the **input validations, before the ownership lookup**, so it can't be skipped and stays reachable for a test user who already owns the course. The consent time is stamped into the Checkout Session *and* PaymentIntent metadata as `terms_accepted_at`, which is the durable audit trail — `user_course_purchases` is `ON DELETE CASCADE` on the user, so a deleted account takes any DB-side record with it.
- `stripe-webhook` — JWT **off** (`--no-verify-jwt`; Stripe can't present a Supabase JWT — the signature is the authentication). The **only** place that writes to `user_course_purchases`. Handles `checkout.session.completed` (fulfils only when `payment_status === 'paid'`), `.async_payment_succeeded` and `.async_payment_failed`. Idempotent via the existing `UNIQUE (user_id, course_id)` constraint.

> **Deno specifics:** use `Stripe.createFetchHttpClient()` and `constructEventAsync` + `Stripe.createSubtleCryptoProvider()` — the synchronous `constructEvent` relies on Node crypto and throws in this runtime.

**Purchase emails.** After a successful fulfilment `stripe-webhook` sends two mails over the same Gmail SMTP account as the contact form: a welcome mail to the buyer (course title, payment summary, button to `/courses/:slug`, `Reply-To: CONTACT_TO_EMAIL`) and a Danish "new sale" notification to `CONTACT_TO_EMAIL`.

- They run inside **`EdgeRuntime.waitUntil()`**, i.e. *after* the 2xx. Stripe waits for our response before redirecting the customer and gives up after ~10 s, and a cold start already costs >5 s — an SMTP handshake must not sit in that budget.
- Gated on `fulfilPurchase` returning a `purchase` object, which only happens on a **fresh insert**. A Stripe redelivery hits the unique constraint and sends nothing.
- A mail failure **never** affects fulfilment: the whole background task is wrapped in try/catch → Sentry. The purchase row is already written and access already granted.
- Language comes from `profiles.preferred_language` (fallback `da`), not from the Stripe session locale. The mail is transactional, so it is deliberately **not** gated on `profiles.notify_email`.
- Templates live in `supabase/functions/_shared/purchaseEmail.ts`, which is deliberately **pure** — no imports, no `Deno.*` — so Vitest can import it (see Testing). Sending lives in `_shared/email.ts` (`sendMail()`), a denomailer wrapper. `send-contact-message` predates that helper and still builds its own `SMTPClient`.

Secrets: `STRIPE_SECRET_KEY` (restricted key, `Checkout Sessions: Write` only), `STRIPE_WEBHOOK_SECRET`, plus `GMAIL_USER` / `GMAIL_APP_PASSWORD` / `CONTACT_TO_EMAIL` (already set for `send-contact-message`; Supabase secrets are project-wide). Optional `SITE_URL` — the webhook has no `Origin` header to derive links from, so it falls back to the production URL; only set it to test links against localhost with `stripe listen`.

**Deploy note:** after `supabase functions deploy`, warm isolates keep serving the previous bundle for up to ~60 s. A stack trace whose line numbers don't match the file means you're looking at the old version, not a failed deploy — check `version` via `list_edge_functions`.

## Testing

**Unit/Component tests:** Vitest + React Testing Library. Test files live in `tests/` with `.test.tsx` extension. Config in `tsconfig.test.json`.
- `tests/auth.test.tsx` — RegisterModal and LoginModal (validation, sign-up, sign-in, forgot password)
- `tests/community.test.tsx` — Community page (rendering, search/filter, post/comment CRUD, ownership checks)
- `tests/muxToken.test.tsx` — `useMuxToken` hook (no request for public lessons or a closed gate, token fetch + headers, NOT_OWNED / AUTH_REQUIRED / NETWORK_ERROR handling, stale-token invalidation on lesson switch, refresh before expiry)
- `tests/purchase.test.tsx` — BuyCourseModal (checkout session + handoff to Stripe, 409 owned panel, error paths, withdrawal-right consent gating), LessonPlayer ownership gating, and the `?purchase=success|cancelled` return banner
- `tests/courseMaterial.test.tsx` — the PDF download button (hidden from logged-out visitors, non-owners, and owners of a course with no `pdf_path`; signed-URL request + headers + anchor-with-`download` handoff; `NOT_OWNED` and malformed-response error paths)
- `tests/purchaseEmail.test.ts` — the purchase-email templates in `supabase/functions/_shared/purchaseEmail.ts` (DA/EN copy, price + date formatting, course URL in both bodies, HTML escaping of course titles and names, neutral greeting when `full_name` is null, sale notification always Danish). This is the **only** automated coverage of any edge-function code: the repo has no Deno test runner, so the module is kept free of imports and `Deno.*` purely so Vitest can load it. Don't add runtime globals to it.

Mutations in the Community page go through Edge Functions via `fetch()` + `callEdgeFunction()`, **not** through `supabase.from().insert()`. Tests mock `fetch` and `supabase.auth.getSession` for mutation assertions.

**E2E API tests:** Bruno collection in `bruno/`. Run locally via Bruno GUI or CLI (`bru run e2e-flow --env production`).
- `bruno/e2e-flow/` — 40-step sequential flow. Steps 1–13: Login → forum post/comment CRUD, each mutation followed by a GET verify. Steps 14–19: news CRUD. Step 20: asserts the test user still owns the test course — a **precondition**, not a mutation. `user_course_purchases` exposes SELECT only through RLS, so nothing but the service role (i.e. `stripe-webhook`) can create a purchase; the row is a durable fixture from the 27 July sandbox checkout. Steps 26, 28, 32 and 37 all depend on it. Steps 23–30: signed Mux playback — resolve lesson IDs, public lesson needs no token, anonymous denied (401), owner granted (JWT claims asserted: RS256, `kid`, `aud` `v`/`s`, matching `sub`, future `exp`), then two calls straight to `stream.mux.com` proving it returns **403 without a token and 200 with ours**, plus 400/404 input handling. Steps 31–35: `create-checkout-session` — anonymous 401, already-owned 409, 400/404 input handling, and missing withdrawal-right consent → 400 `TERMS_NOT_ACCEPTED` (step 35). Steps 32 and 34 must send `terms_accepted: true`, or the consent check fires first and they get a 400 instead of the 409/404 they assert. Steps 36–41: `get-course-material` — anonymous 401, owner granted a signed URL (step 37, which stores it as `material_signed_url`), the storage pair 38/39, and 400/404 input handling.
  - Steps 38–39 are the course-material equivalent of the Mux pair 27–28: 38 requests the object over the **public** storage path and asserts it is refused, 39 fetches step 37's signed URL and asserts `200` + `content-type: application/pdf` + an `attachment` disposition. Together they prove the paywall holds in Storage itself, not just in our code — 38 is what would catch the bucket being flipped public.
  - **Step 37 needs a durable fixture:** a PDF at `course-materials/<test_course_id>/materiale.pdf` with `courses.pdf_path` pointing at it. Without the file the function correctly answers 404 and steps 37+39 fail. Unlike `create-checkout-session`, the happy path here **is** covered in CI — the test user owning the course is exactly what step 37 needs, not an obstacle.
  - The happy path of `create-checkout-session` (a session URL is returned) is **not** in CI: the test user owns the only course, so every authenticated request correctly answers 409. Verified manually with a real sandbox checkout on 27 July.
  - Steps 27–28 hit Mux directly, so CI depends on Mux being reachable. They are the only checks that prove the paywall holds at the CDN rather than just in our code.
  - `user_course_purchases.payment_provider` is constrained to `'stripe'` only. The legacy `'mock'` value was dropped along with the `create-course-purchase` function and its five rows (28 July).
  - **`stripe-webhook` has no Bruno coverage at all** — without a valid Stripe signature it answers 400, and a `.bru` file can't produce one. Step 20 asserting the durable purchase row is the closest proxy. The purchase emails inherit that limitation *and* would dispatch real mail (same reason `bruno/contact-flow/4-valid-send.bru` is manual-only), so they are verified by hand with a sandbox checkout, not in CI.
- `bruno/contact-flow/` — Contact form (`send-contact-message`) checks. **Manual-only, NOT in CI** (like `delete-account-flow`) because a valid send dispatches a real email. Covers: missing-fields → 400, spam → 400, honeypot → 200 (no send), and a manual-only valid-send.
- `bruno/environments/production.bru` — Contains test user credentials (gitignored)
- `bruno/environments/ci.bru` — Empty placeholders for CI (committed, secrets injected via GitHub Actions)

**CI/CD:** GitHub Actions workflow in `.github/workflows/e2e-tests.yml`. Runs on push to `main` and PRs targeting `main`:
1. Lint (`npm run lint`)
2. Unit tests (`npm test`)
3. Build (`npm run build`)
4. Bruno E2E tests (uses GitHub Secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `TEST_EMAIL`, `TEST_PASSWORD`)

**IMPORTANT — When creating new APIs or Edge Functions:**
1. Add a corresponding Bruno `.bru` request file in `bruno/e2e-flow/` with the correct `seq` number
2. Add a GET verification step after each mutation to confirm data persistence
3. Update unit tests in `tests/` if the new API is consumed by a frontend component
4. Remind the user to add the new E2E steps and unit tests before considering the feature complete

## Key Conventions

- All components are functional with typed props interfaces
- File names match component names in PascalCase
- `clsx` + `tailwind-merge` available for conditional/merged class names
- ES modules throughout (`"type": "module"`)
- Strict TypeScript (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`)
- **Always add clear, concise English comments** to all code — functions, logic blocks, constants, and non-obvious sections should have comments explaining their purpose. This keeps the codebase clean and easy to navigate.
