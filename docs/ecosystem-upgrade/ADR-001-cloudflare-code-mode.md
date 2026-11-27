# ADR-001: Cloudflare Code Mode is a conditional no-go for the current Guru AI release

- Status: Accepted — conditional no-go
- Date: 27 November 2026
- Decision owner: Guru AI platform maintainers
- Related: [baseline and integration record](README.md)

## Context

Cloudflare describes Code Mode as a model writing JavaScript to compose tools, executed through an isolated executor with connectors and an optional durable runtime. The official documentation labels it **experimental**, warns of breaking changes, and distinguishes three parts:

- `DynamicWorkerExecutor` runs one block of generated code in an isolated Dynamic Worker; the sandbox does not retain execution history.
- Connectors expose selected methods as sandbox globals; credentials are held host-side and calls cross the sandbox by Workers RPC.
- A durable runtime stores execution history, approvals, pending actions, replay and rollback state in Durable Object SQLite.

Sources: [How Code Mode works](https://developers.cloudflare.com/agents/tools/codemode/how-it-works/) and [Create a durable Code Mode runtime](https://developers.cloudflare.com/agents/tools/codemode/durable-runtime/).

Guru AI is currently a static SvelteKit SPA on Cloudflare Pages. AI work is performed by Convex actions using user-owned provider keys. There is no Cloudflare Worker runtime, Dynamic Worker Loader binding, Durable Object, tool-approval store, egress policy or sandbox budget in this repository.

## Decision

**Do not adopt Cloudflare Code Mode in the current release and do not replace the Convex AI path with it.** The feature remains unevaluated for production until the prerequisites below are met. No Code Mode worker, dependency or deployment was added.

This is not a rejection of the pattern. It avoids adding an experimental execution layer to an application that has no isolated runtime, no approval ledger and no central model contract to compose.

## Reasons

1. **No execution substrate.** The project has no Worker entry point or `LOADER` binding. Adding one would change the hosting model, PWA/static routing and deployment pipeline rather than upgrade the current app.
2. **Approval and replay are product features, not defaults.** A durable runtime must persist pending actions, approvals and rollback state. Guru AI has no such store or reviewer UI; generating code that can call connectors without them would violate least privilege.
3. **Secret boundary.** Code Mode connectors are designed to keep credentials outside the sandbox. Today provider keys live in Convex and are resolved server-side. Moving that boundary requires a reviewed broker and per-tool scopes.
4. **No central tool catalogue.** The hub exposes no model registry or approved tool catalogue. Composing arbitrary tools would create an unowned capability surface.
5. **Experimental status.** The upstream documentation explicitly warns about breaking changes. A production upgrade should not depend on an experimental runtime for core chat and generation flows.
6. **Cost and observability.** Isolated Workers, Durable Objects and per-execution logging add operational controls the current deployment does not monitor or budget.

## Prerequisites for reconsideration

- A separate, least-privilege **Agent Runtime Worker** with its own deployment and rollback plan.
- An explicit list of read-only and write tools, each with owner, schema, scope and approval policy.
- A durable approval/replay store and an operator UI; no automatic execution of money-moving or account-changing tools.
- Egress restricted to allow-listed origins; no host credentials, `process`, `require` or unrestricted `fetch`.
- Per-execution time, CPU and spend budgets; structured audit logs correlated to the signed-in member.
- Contract tests for success, denial, timeout, replay, rollback and prompt-injection attempts.
- A central tool/model catalogue and a signed integration agreement.
- Pilot only for non-sensitive, read-only tools, behind a feature flag and a named rollback owner.

## Consequences

- The current app keeps its existing Convex action path and user-owned keys.
- GuruBot and central model routing remain blocked until an official interface exists; they are not simulated.
- If a future pilot is approved, it will be a separate Worker with its own ADR update, not an in-place dependency added to this SPA.

## Rollback

No runtime change was made, so rollback is simply: do not add the Worker binding and do not merge a future Code Mode pilot. If a pilot is later deployed, disabling its route and removing its Worker binding must restore the current Convex path without data migration.
