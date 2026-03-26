# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lassen Music Academy — a React SPA for a Danish music education platform built with React 19, TypeScript, Vite, and Tailwind CSS 4.

## Commands

- `npm run dev` — Start Vite dev server (default: http://localhost:5173)
- `npm run build` — TypeScript check + Vite production build (`tsc -b && vite build`)
- `npm run lint` — ESLint across the project
- `npm run preview` — Preview production build locally

No test runner is configured.

## Architecture

**Routing:** React Router v7 with `BrowserRouter` in `main.tsx`. Two routes:
- `/` — Landing page composed of section components in `App.tsx`
- `/teacher/:teacherSlug` — Individual instructor page (`pages/TeacherDetail.tsx`)

**State:** React Context API for language (DA/EN toggle). Component-level `useState` for UI state (modals, menus). No external state library.

**i18n:** `src/translations.ts` holds all UI strings keyed by `da`/`en`. Components access translations via `useLanguage()` hook from `src/context/LanguageContext.tsx` — pattern: `const { t } = useLanguage()`.

**Supabase:** Client initialized in `src/supabase/client.ts` using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars. Currently a scaffold — not yet used for data fetching or auth.

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

## Key Conventions

- All components are functional with typed props interfaces
- File names match component names in PascalCase
- `clsx` + `tailwind-merge` available for conditional/merged class names
- ES modules throughout (`"type": "module"`)
- Strict TypeScript (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`)
- **Always add clear, concise English comments** to all code — functions, logic blocks, constants, and non-obvious sections should have comments explaining their purpose. This keeps the codebase clean and easy to navigate.
