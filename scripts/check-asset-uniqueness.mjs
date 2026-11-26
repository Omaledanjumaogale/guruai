#!/usr/bin/env node
/**
 * Guards the visual system: no duplicate bytes, no visually near-identical artwork,
 * no asset reused across two sections, and no repeated banner inscription.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const manifestPath = path.join(root, "reports/asset-manifest.json");
if (!fs.existsSync(manifestPath)) {
	console.error("Run npm run assets:build first.");
	process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const failures = [];

const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const byHash = new Map();
for (const asset of manifest.assets) {
	const sha256 = sha(path.join(root, "static", asset.path));
	if (byHash.has(sha256)) failures.push(`Identical bytes: ${asset.name} duplicates ${byHash.get(sha256)}`);
	byHash.set(sha256, asset.name);
}

async function dhash(file) {
	const raw = await sharp(file).greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
	let bits = "";
	for (let y = 0; y < 8; y++) {
		for (let x = 0; x < 8; x++) {
			bits += raw[y * 9 + x] < raw[y * 9 + x + 1] ? "1" : "0";
		}
	}
	return bits;
}

const hashes = [];
for (const asset of manifest.assets) {
	hashes.push({ name: asset.name, bits: await dhash(path.join(root, "static", asset.path)) });
}
for (let i = 0; i < hashes.length; i++) {
	for (let j = i + 1; j < hashes.length; j++) {
		let distance = 0;
		for (let k = 0; k < hashes[i].bits.length; k++) if (hashes[i].bits[k] !== hashes[j].bits[k]) distance++;
		if (distance <= 5) failures.push(`Visually near-identical: ${hashes[i].name} ≈ ${hashes[j].name} (distance ${distance})`);
	}
}

const sections = new Map();
for (const asset of manifest.assets) {
	if (sections.has(asset.section)) failures.push(`Section reused: ${asset.name} and ${sections.get(asset.section)} both claim "${asset.section}"`);
	sections.set(asset.section, asset.name);
}

const brandFile = fs.readFileSync(path.join(root, "src/lib/brand.ts"), "utf8");
const inscriptions = [...brandFile.matchAll(/inscription:\s*"([^"]+)"/g)].map((m) => m[1]);
if (new Set(inscriptions).size !== inscriptions.length) failures.push("A banner inscription is repeated.");
const bannerCount = [...brandFile.matchAll(/id:\s*"banner-/g)].length;
if (bannerCount !== inscriptions.length) failures.push(`Banner/inscription count mismatch (${bannerCount} banners, ${inscriptions.length} inscriptions)`);
if (brandFile.includes("SLIDES") && (brandFile.match(/src:\s*"\/images\/generated\//g) ?? []).length < 3) {
	failures.push("The promotional slider needs at least three unique slides.");
}

if (failures.length) {
	console.error(`Asset uniqueness check failed (${failures.length}):`);
	for (const failure of failures) console.error(` - ${failure}`);
	process.exit(1);
}
console.log(`Asset uniqueness verified: ${manifest.assets.length} assets, ${inscriptions.length} unique banner inscriptions, no duplicate sections.`);