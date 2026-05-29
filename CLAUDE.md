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

**Mux:** Video hosting for course content. Assets are managed via the Mux MCP (configured in local scope `~/.claude.json` as HTTP transport, **not** in `.mcp.json`). Playback IDs are currently public. `MUX_TOKEN_ID` and `MUX_TOKEN_SECRET` env vars store API credentials for direct API calls (e.g. track deletion, which the MCP's delete track tool doesn't handle reliably).

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

**Contact form** (`send-contact-message`): **public** Edge Function (no JWT — deploy with JWT verification OFF, like `fetch-podcast-feed`). Relays a contact-form submission to `CONTACT_TO_EMAIL` over **Gmail SMTP** (`denomailer`), reusing the same Gmail account configured in Supabase Auth → SMTP. Abuse protection: hidden honeypot field, spam-pattern detection, best-effort in-memory per-IP throttle. Secrets: `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `CONTACT_TO_EMAIL`. Consumed by `src/pages/Contact.tsx` (POST with `apikey` header, no `Authorization`).

## Testing

**Unit/Component tests:** Vitest + React Testing Library. Test files live in `tests/` with `.test.tsx` extension. Config in `tsconfig.test.json`.
- `tests/auth.test.tsx` — RegisterModal and LoginModal (validation, sign-up, sign-in, forgot password)
- `tests/community.test.tsx` — Community page (rendering, search/filter, post/comment CRUD, ownership checks)

Mutations in the Community page go through Edge Functions via `fetch()` + `callEdgeFunction()`, **not** through `supabase.from().insert()`. Tests mock `fetch` and `supabase.auth.getSession` for mutation assertions.

**E2E API tests:** Bruno collection in `bruno/`. Run locally via Bruno GUI or CLI (`bru run e2e-flow --env production`).
- `bruno/e2e-flow/` — 13-step sequential flow: Login → Create Post → GET verify → Update Post → GET verify → Create Comment → GET verify → Update Comment → GET verify → Delete Comment → GET verify → Delete Post → GET verify
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
