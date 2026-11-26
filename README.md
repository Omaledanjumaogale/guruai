# Guru AI — Enterprise AI Workspace

Guru AI harmonizes the capabilities of a dozen reference products into one enterprise workspace:
multi-model chat, image/video/music studios, a humanizer, keyword intelligence, transcripts,
converters, notes, multi-step agents, a Connector Vault and a Reverse API Lab — all on one
SvelteKit + Convex + Cloudflare Pages stack, installable as a PWA on desktop and mobile.

**Live:** https://guruai.ewinproject.org

## What is inside

| Area | Modules |
| --- | --- |
| Workspace | Dashboard, Notes (Keep-style pins, colors, tags), Agents (multi-step runs with logs) |
| Intelligence | Chat (GuruRoute auto-routing), Image / Video / Music studios, Visuals, Humanizer, AI Toolbox |
| Research | Keywords (questions, prepositions, comparisons), Transcripts (YouTube to text), Convert |
| Developer | Reverse API Lab (HAR to typed client, repo key extractor), Connector Vault, GuruRoute |
| Governance | Profile, Roles & Access (least-privilege RBAC with approval queue), Plan & entitlements, Messages (private support threads), Notifications |
| Control | Settings (install/deploy, build identity, offline shell), Super Admin console (accounts, role approvals, announcements, support inbox, audit trail, deployment) |

## Stack

- **Frontend** — SvelteKit 2 + Svelte 5 runes, `adapter-static`, Tailwind CSS v4, PWA (manifest + service worker)
- **Backend** — Convex (queries, mutations, actions, HTTP router for OAuth)
- **Hosting** — Cloudflare Pages with a custom domain
- **Engines** — DeepAI, OpenAI-compatible (Agnes AI), Google/GitHub OAuth, Resend email

## Accounts and access

Browsers never see provider keys or password hashes; they hold an opaque `gst_...` session token.

- **Email + password** — `auth.register` / `auth.passwordLogin` (salted SHA-256, 14-day sessions)
- **Google / GitHub OAuth** — `/oauth/{provider}/start` and `/oauth/{provider}/callback` HTTP actions
- **Super admin** — the account matching `SUPER_ADMIN_EMAIL` is promoted to admin; `/admin` exposes the
  deployment console and can remove member accounts (admins are protected)
- **Roles** — `admin`, `manager` and `member` ship with explicit permission bundles (22 capabilities).
  Members can self-enable `member`; manager requests go to an approval queue. Direct assignment is
  available to admins and every decision is written to the audit trail.
- **Plans** — Starter, Pro Studio and Enterprise define entitlements (studios, agents, Reverse API,
  admin, broadcasts). Granting a new plan closes the previous subscription and notifies the member.
- **Messaging & announcements** — members open private support threads; staff reply from the admin
  console. Announcements are drafted, then approved by a second administrator before delivery.
- **Workspaces** — every row is scoped to a workspace key, so data stays isolated per install/account

## Local development

```bash
npm install
cp .env.example .env          # set VITE_CONVEX_URL
npx convex dev                # terminal 1: functions + generated types
npm run dev                   # terminal 2: http://localhost:5173
```

Production build: `npm run build` produces `build/` (static, SPA fallback).

## Deploying

```bash
export CONVEX_DEPLOY_KEY=...            # Convex production deployment
npx convex deploy

export CLOUDFLARE_API_TOKEN=...         # Cloudflare Pages
export CLOUDFLARE_ACCOUNT_ID=...
npx wrangler pages deploy build --project-name guruai --branch main
```

Backend environment (`npx convex env set KEY value`): `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`,
`APP_URL`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`,
`RESEND_API_KEY`, `AGNES_AI_KEY`, `ADMIN_SESSION_SECRET`.

## Quality gates

```bash
npm run check            # svelte-check: 0 errors, 0 warnings
npm run build            # static build + build-info.json
npm run assets:unique    # master art uniqueness and distinct banner copy
npm run assets:check     # 10 WebP masters + 20 responsive derivatives in build/
npm run verify:build     # 25 route shells, _routes.json, build identity, assets
PRODUCTION_URL=https://guruai.ewinproject.org npm run production:verify
```

## Reliability notes

- The service worker intercepts **navigations only**; build assets stay on the edge cache, so a
  deploy can never leave a page pointing at purged chunks.
- `static/_headers` marks `/_app/immutable/*` immutable and `sw.js` uncached.
- Convex user-facing failures are thrown as `ConvexError`, so the UI shows the real message
  instead of "Server Error".
