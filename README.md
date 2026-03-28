# scrubref-web

ScrubRef web frontend. Medical RAG chatbot UI for surgical trainees — thread-based chat interface backed by the scrubref-api and RAG pipeline.

Live: https://scrubref.shuf.site

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- Supabase for auth (email/password + Google OAuth)
- Papyrus/parchment academic theme via CSS variables

## Running locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build:

```bash
NEXT_PUBLIC_SITE_URL=https://scrubref.shuf.site npm run build
npm start
```

## Environment variables

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Server-side — rewrites proxy to scrubref-api; defaults to http://localhost:3001
API_URL=http://localhost:3001
```

`NEXT_PUBLIC_API_URL` is intentionally empty. All API calls use relative paths (e.g. `/threads`, `/query/stream`) which Next.js rewrites to `API_URL` server-side. This keeps port 3001 off the public internet.

## Pages

| Route | Purpose |
|---|---|
| `/login` | Email/password + Google OAuth sign-in |
| `/signup` | Registration with optional ambassador referral |
| `/forgot-password` | Send reset email |
| `/reset-password` | Consume reset token from Supabase |
| `/dashboard` | Main chat UI |

## Architecture

**API proxy** — `next.config.ts` rewrites `/threads/**`, `/query/**`, `/page/**`, `/images/**` to `API_URL`. The frontend never talks directly to the RAG backend.

**Auth** — Supabase session managed by `@supabase/ssr`. The `src/proxy.ts` middleware guards `/dashboard` and redirects unauthenticated users to `/login`.

**Chat** — SSE streaming from `/query/stream`. Tokens are rendered incrementally as they arrive. Input capped at 2000 characters.

**Settings modal** — answer style preferences (depth, tone, restrictiveness) are sent with each query. Usage counter shows current daily/monthly counts; quota warning appears in the sidebar footer when ≥80% of monthly allowance is used.

**Ambassador referral** — referral interest captured on auth pages and written to Supabase `referral_interest` table.

## Key files

```
src/app/
  (auth)/login/          Sign-in page
  (auth)/signup/         Registration page
  dashboard/             Chat UI, sidebar, settings modal
  icon.png               Favicon
src/proxy.ts             Auth guard middleware
next.config.ts           API rewrites
public/logo.png          App logo
```
