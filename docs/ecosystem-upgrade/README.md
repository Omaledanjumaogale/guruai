# Guru AI ecosystem upgrade — baseline, access matrix and integration record

Date: 27 November 2026  
Scope: existing Guru AI application in this repository, deployed at `https://guruai.ewinproject.org`  
Production backend: Convex `brave-bullfrog-719`  
Central hub: `https://ewinproject.org` / Better Auth on `affable-dragon-883`

This record separates **implemented and verified** work from **contracts that are blocked**. It must be updated when a blocked contract is actually provisioned. A manifest, an SDK import or a reachable health endpoint is not evidence that money can move.

## 1. Baseline audit

| Area | Baseline |
|---|---|
| Frontend | SvelteKit 2, Svelte 5 runes, TypeScript, Tailwind v4, static SPA (`ssr = false`) |
| Hosting | Cloudflare Pages project `guruai`, custom domain `guruai.ewinproject.org` |
| Backend | Convex queries, mutations, actions and HTTP actions; WebSocket query bridge in `src/lib/convex.ts` |
| Auth | Local opaque sessions; optional E-WIN Hub credential verification with server-to-server Better Auth calls |
| Identity fields | `users.hubId`, `hubEmail`, `hubLinkedAt`; no central session token is persisted |
| Roles | Super admin, manager and member; granular permissions in `convex/rbac.ts` + `src/lib/access.ts` |
| Billing | Local plan records in Convex (`subscriptions.*`); no central wallet or gateway settlement |
| AI providers | User-owned provider keys in the Connector Vault; GuruRoute local routing rules |
| PWA | Installable manifest, service worker, offline shell and update prompt |
| Demo data | Removed on 27 Nov 2026: synthetic client fallback (`src/lib/mock.ts`) and production account `ada.demo@guru.ai` |

## 2. Route and access matrix

All application routes are reachable in the static shell; authorization is enforced by Convex functions, not by hiding links. The table records the intended audience and the primary control.

| Route | Audience | Primary control |
|---|---|---|
| `/` | Public | Marketing content only |
| `/login` | Public | Local + hub credential verification; opaque session issuance |
| `/home` | Signed-in | Workspace queries scoped by token |
| `/chat` | Signed-in | Conversation ownership checks in Convex |
| `/notes` | Signed-in | Note ownership checks |
| `/agents` | Signed-in | Agent ownership and run limits |
| `/inbox` | permission `messages.read.participant` | Conversation participant checks |
| `/notifications` | Signed-in | Per-user notification queries |
| `/images`, `/video`, `/music` | Signed-in | Provider key lookup; per-user generation records |
| `/visuals`, `/humanizer`, `/tools` | Signed-in | Provider-backed actions |
| `/keywords`, `/transcript`, `/convert` | Signed-in | Provider/action rate limits |
| `/reverse-api`, `/connectors` | Signed-in | Server-side key storage; masked reads |
| `/models` | Signed-in | Local GuruRoute configuration |
| `/analytics` | Signed-in | Workspace-scoped aggregates |
| `/hub` | Signed-in | Session-bound link/unlink; live hub probe |
| `/team` | permission `admin.users.read` | RBAC check inside `admin.accounts` |
| `/activity` | Signed-in | Actor-scoped audit query |
| `/security` | Signed-in | Own sessions and security events |
| `/admin` | permission `admin.users.read` | Token + RBAC check in every admin query/mutation |
| `/profile` | Signed-in | Own profile mutation |
| `/roles` | Signed-in | Own effective permissions; role management gated separately |
| `/subscription` | Signed-in | Own plan; `subscription.manage` for grant/cancel |
| `/settings` | Signed-in | Workspace/install settings |

Admin console tabs: overview, accounts, roles, broadcasts, messages, audit and deployment. Each tab loads data only after the session and permission checks pass; the page renders a sign-in/denied state otherwise.

## 3. Delivered in this upgrade

1. **Global header controls** — visible Home, theme toggle, notifications, profile and a single protected mode switch. The switch is rendered only for `$account.role === "admin"`, which is populated from the server-verified session. The console itself still honours granular RBAC for managers.
2. **Admin/User view switch** — `/admin` changes to `User view` and returns to `/home`; no admin links are injected into the user DOM for non-admins.
3. **Subscription page theme repair** — replaced hard-coded dark Tailwind colours with semantic theme tokens so the light theme works.
4. **Live hub probe** — authenticated `hub.probe` action performs a real HTTP `/health` check with a six-second timeout. The UI reports the actual status code and latency; it does not claim synchronization.
5. **Production data cleanup** — removed the synthetic demo fallback from the Convex bridge and deleted the demo production account. Empty states now remain empty instead of showing fake records.
6. **Platform manifest** — `ewin.platform.json` records the canonical identity contract and explicitly marks billing as not cut over.

## 4. Integration gap report (central hub)

| Contract | Status | Evidence and blocker |
|---|---|---|
| E-WIN credential verification | Implemented | Better Auth `/api/auth/sign-in/email`, then `/api/auth/get-session`; hub password is never stored |
| Canonical identity link | Implemented | `users.hubId` + `hubEmail`, unique hub index; explicit unlink |
| E-WIN ticket SSO | Not enabled | Guru AI is absent from the central `ecosystemApplications` registry, so central `/sso/start` rejects `platform=guruai`. Do not enable the button until the central registry is deployed |
| Versioned profile sync | Blocked | No central profile version endpoint or signed profile contract is available to this deployment; no last-sync field is fabricated |
| Central wallet / PAYG | Blocked | Central `convex/http.ts` `/wallet/v1` exists, but `payg.bridge` requires a verified `payg_platform_status` and an active `platform_account_links` row. Guru AI has neither, no `EWIN_WALLET_KEY_GURUAI`, and central policy keeps native wallets disabled until harmonization, backups and reconciliation are verified |
| Platform registry | Partial | Local manifest created; central registry and `config/application-repositories.json` do not contain Guru AI |
| Signed event stream / heartbeat | Blocked | No central service key or event endpoint is provisioned; `ewin.platform.json` deliberately has no heartbeat URL |
| Central AI model registry | Blocked | The central repository exposes no model-registry or gateway API. GuruRoute remains a local, provider-key-based router |
| GuruBot | Not implemented | No official GuruBot interface, credentials or contract was supplied; no speculative integration was added |
| Marketplace/escrow | Not applicable | Guru AI has no gig, bounty, squad or escrow workflow in this repository |
| Cloudflare Code Mode | Evaluated, no-go | See [ADR-001](ADR-001-cloudflare-code-mode.md) |

No local plan, entitlement, API key or account was deleted to simulate central migration. Local plan records remain readable and are labelled in this document as local records.

## 5. Migration and rollback

**Forward path**

1. Central owner registers `guruai` in the ecosystem catalogue and creates a verified platform/account-link record.
2. Central owner issues `EWIN_WALLET_KEY_GURUAI` (server-only Convex secret) only after harmonization acceptance.
3. Guru AI adds the signed wallet client and a quote → approval → hold → release/refund workflow, with stable idempotency keys.
4. Reconcile read-only for a full settlement cycle before enabling any debit.
5. Enable ticket SSO only after the central registry is deployed; keep password fallback during the transition.

**Rollback**

- UI/header changes: revert the commit and redeploy the previous Cloudflare Pages build; no schema migration is involved.
- Hub probe: remove the action/page call; it creates no records.
- Demo cleanup: the account deletion is irreversible; restore a test account only in a non-production environment.
- Platform manifest: delete `ewin.platform.json`; it is not read at runtime.
- Convex functions: `npx convex deploy` is additive for the new action; no destructive table change was made.

**Verification commands**

```bash
npm run check
npm run build
npm run verify:build
npm run verify:platform
PRODUCTION_URL=https://guruai.ewinproject.org npm run production:verify
```

Accepted evidence for this change: type check with zero errors, production build, build verifier, desktop authentication and admin switch in an isolated browser, and a production smoke test after deployment.
