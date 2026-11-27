import { readFileSync } from "node:fs";

const file = new URL("../ewin.platform.json", import.meta.url);
const manifest = JSON.parse(readFileSync(file, "utf8"));
const problems = [];
const expect = (ok, message) => { if (!ok) problems.push(message); };

expect(manifest.platformId === "guruai", "platformId must be guruai");
expect(manifest.domainUrl === "https://guruai.ewinproject.org", "domainUrl must be the production domain");
expect(manifest.defaultBranch === "master", "defaultBranch must match the deployed branch");
expect(manifest.repoUrl === "https://github.com/Omaledanjumaogale/guru-ai", "repoUrl must be the canonical repository");
expect(manifest.identity?.canonicalSubjectField === "users.hubId", "identity must bind to users.hubId");
expect(!/sessionToken|accessToken|refreshToken|serviceKey|secret/i.test(JSON.stringify(manifest)), "manifest must not contain credentials or token fields");

if (manifest.billing?.status !== "cut-over") {
  expect(Array.isArray(manifest.billableActions) && manifest.billableActions.length === 0, "a non-cut-over platform must not declare active billable actions");
  const enabled = (manifest.candidateBillableActions ?? []).filter((action) => action.enabled);
  expect(enabled.length === 0, "candidate actions must stay disabled until central cutover");
}

if (manifest.sync?.eventEndpoint || manifest.sync?.inboundWebhook || manifest.sync?.heartbeatUrl) {
  expect(manifest.sync?.status !== "heartbeat-and-identity-only", "declared sync endpoints need a matching sync status");
}

if (problems.length) {
  console.error("Platform manifest invalid:");
  for (const problem of problems) console.error(" - " + problem);
  process.exit(1);
}

console.log(`Platform manifest verified: ${manifest.status}; billing ${manifest.billing.status}; ${manifest.billableActions.length} active billable actions.`);
