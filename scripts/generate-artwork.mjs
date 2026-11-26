#!/usr/bin/env node
/**
 * One-off authoring pipeline for the promotional artwork.
 *
 * The deployment's image engine (Agnes AI, OpenAI-compatible endpoint) is invoked
 * through the private Convex action `media:draftArtwork`, so the API key never
 * leaves the backend. Output PNGs land in tmp/artwork, and sharp produces the
 * canonical WebP masters in assets/source. `npm run assets:build` then derives the
 * responsive set that ships in static/images.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const prompts = JSON.parse(fs.readFileSync(path.join(root, "scripts/artwork-prompts.json"), "utf8"));
const outDir = path.join(root, "tmp/artwork");
const masterDir = path.join(root, "assets/source");
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(masterDir, { recursive: true });

const only = process.argv.slice(2);
const targets = only.length ? prompts.filter((p) => only.includes(p.name)) : prompts;

function draft(prompt, tries = 3) {
	for (let attempt = 1; attempt <= tries; attempt++) {
		const res = spawnSync(
			process.execPath,
			[path.join(root, "node_modules/convex/bin/main.js"), "run", "media:draftArtwork", JSON.stringify({ prompt, size: "1536x1024" })],
			{ cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
		);
		const text = `${res.stdout ?? ""}`;
		const start = text.indexOf("{");
		if (res.status === 0 && start >= 0) {
			try {
				const payload = JSON.parse(text.slice(start));
				if (payload?.b64) return payload.b64;
			} catch {
				/* fall through to retry */
			}
		}
		console.error(`attempt ${attempt} failed for "${prompt.slice(0, 48)}…": ${(res.stderr || text).slice(-300)}`);
	}
	return null;
}

let failed = 0;
for (const item of targets) {
	const png = path.join(outDir, `${item.name}.png`);
	const master = path.join(masterDir, `${item.name}.webp`);
	if (fs.existsSync(master) && !process.env.FORCE) {
		console.log(`skip ${item.name} (master exists)`);
		continue;
	}
	console.log(`drafting ${item.name}…`);
	const b64 = draft(item.prompt);
	if (!b64) {
		failed++;
		continue;
	}
	fs.writeFileSync(png, Buffer.from(b64, "base64"));
	// 16:9 promotional crop, 1536px wide, quality 90 master.
	await sharp(png)
		.resize({ width: 1536, height: 864, fit: "cover", position: "attention" })
		.webp({ quality: 90, effort: 5 })
		.toFile(master);
	const meta = await sharp(master).metadata();
	console.log(`  → ${path.relative(root, master)} ${meta.width}x${meta.height} ${(fs.statSync(master).size / 1024).toFixed(0)}KB`);
}
if (failed) {
	console.error(`${failed} artwork draft(s) failed.`);
	process.exit(1);
}
console.log("Artwork masters ready.");