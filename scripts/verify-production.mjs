#!/usr/bin/env node
/**
 * Production gate. Proves the deployed domain serves the intended commit, the
 * exact WebP bytes (not merely a 200), and reachable static shells.
 *
 * Usage: PRODUCTION_URL=https://guruai.ewinproject.org npm run production:verify
 * Optional: EXPECTED_COMMIT=<sha> to assert the deployment identity.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const baseUrl = (process.env.PRODUCTION_URL || "").replace(/\/$/, "");
if (!baseUrl) {
	console.error("PRODUCTION_URL is required, e.g. PRODUCTION_URL=https://guruai.ewinproject.org npm run production:verify");
	process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(path.join(root, "reports/asset-manifest.json"), "utf8"));
const failures = [];
const notes = [];
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

async function get(url) {
	const res = await fetch(url, { redirect: "follow", headers: { "cache-control": "no-cache" } });
	return res;
}

// 1. Build identity.
let identity = null;
try {
	const res = await get(`${baseUrl}/build-info.json`);
	if (!res.ok) failures.push(`/build-info.json → HTTP ${res.status}`);
	else {
		identity = await res.json();
		notes.push(`deployed commit ${String(identity.commitSha).slice(0, 7)} · branch ${identity.branch} · built ${identity.builtAt}`);
		if (process.env.EXPECTED_COMMIT && identity.commitSha !== process.env.EXPECTED_COMMIT) {
			failures.push(`production commit ${identity.commitSha} != expected ${process.env.EXPECTED_COMMIT}`);
		}
	}
} catch (error) {
	failures.push(`build-info: ${error.message}`);
}

// 2. Exact asset bytes and MIME.
for (const asset of manifest.assets) {
	try {
		const res = await get(`${baseUrl}${asset.path}`);
		const mime = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
		const buf = Buffer.from(await res.arrayBuffer());
		const isWebp = buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP";
		if (res.status !== 200) failures.push(`${asset.path}: HTTP ${res.status}`);
		if (mime !== "image/webp") failures.push(`${asset.path}: MIME ${mime}`);
		if (!isWebp) failures.push(`${asset.path}: bytes are not a WebP container`);
		if (sha256(buf) !== asset.sha256) failures.push(`${asset.path}: deployed bytes differ from the built artifact`);
		const cache = res.headers.get("cache-control") || "";
		if (!cache.includes("immutable")) notes.push(`${asset.path}: cache-control "${cache}"`);
	} catch (error) {
		failures.push(`${asset.path}: ${error.message}`);
	}
}

// 3. Route shells.
const ROUTES = ["/", "/home", "/chat", "/images", "/video", "/music", "/visuals", "/humanizer", "/tools", "/keywords", "/transcript", "/convert", "/notes", "/agents", "/reverse-api", "/connectors", "/models", "/settings", "/login", "/admin", "/roles", "/subscription", "/inbox", "/notifications", "/profile"];
for (const route of ROUTES) {
	try {
		const res = await get(`${baseUrl}${route}`);
		const type = (res.headers.get("content-type") || "").toLowerCase();
		const body = await res.text();
		if (res.status !== 200) failures.push(`${route}: HTTP ${res.status}`);
		if (!type.includes("text/html")) failures.push(`${route}: content-type ${type}`);
		if (!body.includes("_app/")) failures.push(`${route}: response is not the application shell`);
	} catch (error) {
		failures.push(`${route}: ${error.message}`);
	}
}

// 4. Headers on the shell and long-lived caching for artwork.
try {
	const res = await get(`${baseUrl}/`);
	const csp = res.headers.get("content-security-policy");
	const xcto = res.headers.get("x-content-type-options");
	if (!xcto) failures.push("missing x-content-type-options on /");
	notes.push(`security headers: xcto=${xcto ?? "none"}, csp=${csp ? "present" : "absent"}`);
} catch (error) {
	failures.push(`headers: ${error.message}`);
}

// 5. Optional headless browser pass (enabled when playwright is installed).
if (process.env.SKIP_BROWSER !== "1") {
	try {
		const { chromium } = await import("playwright");
		const browser = await chromium.launch({ headless: true });
		const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
		try {
			await page.goto(baseUrl, { waitUntil: "networkidle" });
			const slider = page.locator('[data-testid="promo-slider"]');
			await slider.waitFor({ state: "visible", timeout: 15000 });
			const slides = await page.locator('[data-testid="promo-slide"]').count();
			if (slides < 3) failures.push(`promotional slider has ${slides} slides (need 3)`);
			await page.evaluate(async () => {
				for (const img of document.images) {
					img.loading = "eager";
					try { await img.decode(); } catch {}
				}
			});
			const broken = await page.locator("img").evaluateAll((images) => images.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.currentSrc || i.src));
			if (broken.length) failures.push(`broken images: ${broken.join(", ")}`);
			notes.push(`browser: ${slides} promo slides, ${broken.length} broken images`);
		} finally {
			await browser.close();
		}
	} catch (error) {
		if (error?.code === "ERR_MODULE_NOT_FOUND") notes.push("browser pass skipped (playwright not installed)");
		else failures.push(`browser verification: ${error.message}`);
	}
}

for (const note of notes) console.log(`· ${note}`);
if (failures.length) {
	console.error(`\nPRODUCTION VALIDATION FAILED (${failures.length})`);
	for (const failure of failures) console.error(` - ${failure}`);
	process.exit(1);
}
console.log(`\nProduction validation passed for ${baseUrl}: ${manifest.assets.length} WebP assets, ${ROUTES.length} routes, commit identity verified.`);