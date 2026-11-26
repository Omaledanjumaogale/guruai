#!/usr/bin/env node
/** Build-time gate: every route has a static shell, every required asset shipped. */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const build = path.join(root, "build");
const failures = [];
const ROUTES = ["/", "/home", "/chat", "/images", "/video", "/music", "/visuals", "/humanizer", "/tools", "/keywords", "/transcript", "/convert", "/notes", "/agents", "/reverse-api", "/connectors", "/models", "/settings", "/login", "/admin", "/roles", "/subscription", "/inbox", "/notifications", "/profile"];

const fileFor = (route) => (route === "/" ? path.join(build, "index.html") : path.join(build, `${route.slice(1)}.html`));
for (const route of ROUTES) {
	const file = fileFor(route);
	if (!fs.existsSync(file)) {
		failures.push(`missing static shell for ${route} (${path.relative(root, file)})`);
		continue;
	}
	const html = fs.readFileSync(file, "utf8");
	if (!html.includes("_app/")) failures.push(`shell for ${route} has no app bundle reference`);
}

for (const file of ["build-info.json", "_headers", "_routes.json", "404.html", "manifest.webmanifest", "sw.js", "icons/icon.svg"]) {
	if (!fs.existsSync(path.join(build, file))) failures.push(`missing build/${file}`);
}

if (fs.existsSync(path.join(build, "build-info.json"))) {
	const info = JSON.parse(fs.readFileSync(path.join(build, "build-info.json"), "utf8"));
	if (!info.commitSha || !info.builtAt) failures.push("build-info.json is missing commitSha/builtAt");
}

if (fs.existsSync(path.join(build, "_routes.json"))) {
	const routes = JSON.parse(fs.readFileSync(path.join(build, "_routes.json"), "utf8"));
	if (!Array.isArray(routes.include) || routes.include.length !== 0) failures.push("_routes.json must include no Functions (pure static shell)");
	if (!routes.exclude?.includes("/*")) failures.push("_routes.json must exclude /* from Functions");
}

const manifestPath = path.join(root, "reports/asset-manifest.json");
if (!fs.existsSync(manifestPath)) failures.push("reports/asset-manifest.json missing — run npm run assets:build");
else {
	const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
	for (const p of manifest.requiredWebp) {
		if (!fs.existsSync(path.join(build, p))) failures.push(`asset not copied into build: ${p}`);
	}
}

if (failures.length) {
	console.error(`Build verification failed (${failures.length}):`);
	for (const f of failures) console.error(` - ${f}`);
	process.exit(1);
}
console.log(`Build verified: ${ROUTES.length} static shells, build identity, assets and route config present.`);