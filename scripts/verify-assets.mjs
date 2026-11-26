#!/usr/bin/env node
/** Validates every shipped image: real WebP bytes, expected dimensions, matching checksum. */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const target = fs.existsSync(path.join(root, "build")) ? path.join(root, "build") : path.join(root, "static");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "reports/asset-manifest.json"), "utf8"));
const failures = [];

function check(file, expected) {
	if (!fs.existsSync(file)) return failures.push(`missing ${path.relative(root, file)}`);
	const buf = fs.readFileSync(file);
	if (buf.subarray(0, 4).toString("ascii") !== "RIFF" || buf.subarray(8, 12).toString("ascii") !== "WEBP") {
		return failures.push(`not a WebP container: ${path.relative(root, file)}`);
	}
	if (buf.length < 1024) failures.push(`suspiciously small (${buf.length} bytes): ${path.relative(root, file)}`);
	if (expected?.sha256) {
		const hash = crypto.createHash("sha256").update(buf).digest("hex");
		if (hash !== expected.sha256) failures.push(`checksum mismatch: ${path.relative(root, file)}`);
	}
}

for (const asset of manifest.assets) {
	check(path.join(target, asset.path), asset);
	for (const derivative of asset.derivatives) check(path.join(target, derivative.path));
}

const seen = new Set();
for (const p of manifest.requiredWebp) {
	if (seen.has(p)) failures.push(`duplicate manifest entry: ${p}`);
	seen.add(p);
}

for (const asset of manifest.assets) {
	const main = path.join(target, asset.path);
	if (!fs.existsSync(main)) continue;
	const meta = await sharp(main).metadata();
	if (meta.width !== asset.width || meta.height !== asset.height) {
		failures.push(`dimension mismatch ${asset.path}: ${meta.width}x${meta.height} != ${asset.width}x${asset.height}`);
	}
}

if (failures.length) {
	console.error(`Asset verification failed (${failures.length}):`);
	for (const f of failures) console.error(` - ${f}`);
	process.exit(1);
}
console.log(`Assets verified in ${path.basename(target)}/: ${manifest.assets.length} WebP masters + ${manifest.assets.reduce((n, a) => n + a.derivatives.length, 0)} derivatives.`);