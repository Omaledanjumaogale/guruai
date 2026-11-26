#!/usr/bin/env node
/**
 * Derives every shipped image from the reviewed WebP masters in assets/source.
 * Outputs: static/images/generated (1536w), static/images/responsive (640/1024w),
 * an asset manifest with checksums, and the audit inventory CSV.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const SOURCE = path.join(root, "assets/source");
const GENERATED = path.join(root, "static/images/generated");
const RESPONSIVE = path.join(root, "static/images/responsive");
const REPORTS = path.join(root, "reports");
const prompts = JSON.parse(fs.readFileSync(path.join(root, "scripts/artwork-prompts.json"), "utf8"));

const SECTION = {
	"promo-slide-01": { section: "Landing — promotional slider (slide 1)", route: "/" },
	"promo-slide-02": { section: "Landing — promotional slider (slide 2)", route: "/" },
	"promo-slide-03": { section: "Landing — promotional slider (slide 3)", route: "/" },
	"story-customer": { section: "Landing — story: the scattered morning", route: "/" },
	"story-discovery": { section: "Landing — story: discovery", route: "/" },
	"story-guide": { section: "Landing — story: the guided path", route: "/" },
	"feature-learning": { section: "Landing — feature: human voice", route: "/" },
	"feature-workflow": { section: "Landing — feature: workflow automation", route: "/" },
	"feature-community": { section: "Landing — feature: community", route: "/" },
	"dashboard-ecosystem": { section: "Landing — story outcome: the ecosystem", route: "/" }
};

const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

async function assertWebp(file) {
	const head = fs.readFileSync(file).subarray(0, 12);
	if (head.subarray(0, 4).toString("ascii") !== "RIFF" || head.subarray(8, 12).toString("ascii") !== "WEBP") {
		throw new Error(`${path.relative(root, file)} is not a WebP container`);
	}
}

fs.mkdirSync(GENERATED, { recursive: true });
fs.mkdirSync(RESPONSIVE, { recursive: true });
fs.mkdirSync(REPORTS, { recursive: true });

const masters = fs
	.readdirSync(SOURCE)
	.filter((f) => f.endsWith(".webp"))
	.sort();
const missing = prompts.map((p) => p.name).filter((name) => !masters.includes(`${name}.webp`));
if (missing.length) throw new Error(`Missing artwork masters: ${missing.join(", ")}`);

const manifest = { app: "Guru AI", model: "agnes-image-2.1-flash", generatedAt: new Date().toISOString(), requiredWebp: [], assets: [] };
const inventory = ["Name,Section,Route,Final path,Width,Height,Format,Bytes,SHA-256,Alt text"];

for (const file of masters) {
	const name = file.replace(/\.webp$/, "");
	const src = path.join(SOURCE, file);
	await assertWebp(src);
	const main = path.join(GENERATED, file);
	await sharp(src).resize({ width: 1536, withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toFile(main);
	const meta = await sharp(main).metadata();
	const derivatives = [];
	for (const width of [1024, 640]) {
		const out = path.join(RESPONSIVE, `${name}-${width}.webp`);
		await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality: 80, effort: 5 }).toFile(out);
		const dMeta = await sharp(out).metadata();
		derivatives.push({ path: `/images/responsive/${name}-${width}.webp`, width: dMeta.width, height: dMeta.height, bytes: fs.statSync(out).size });
	}
	const prompt = prompts.find((p) => p.name === name);
	const entry = {
		name,
		alt: prompt?.alt ?? name,
		prompt: prompt?.prompt ?? "",
		section: SECTION[name]?.section ?? "Unassigned",
		route: SECTION[name]?.route ?? "/",
		path: `/images/generated/${file}`,
		width: meta.width,
		height: meta.height,
		format: "image/webp",
		bytes: fs.statSync(main).size,
		sha256: sha256(main),
		derivatives: derivatives.sort((a, b) => b.width - a.width)
	};
	manifest.requiredWebp.push(entry.path);
	manifest.assets.push(entry);
	inventory.push(`${name},"${entry.section}","${entry.route}",${entry.path},${entry.width},${entry.height},webp,${entry.bytes},${entry.sha256},"${entry.alt.replace(/"/g, '')}"`);
	console.log(`built ${entry.path} (${meta.width}x${meta.height}, ${(entry.bytes / 1024).toFixed(0)}KB)`);
}

const heroes = JSON.parse(fs.readFileSync(path.join(root, "reports/hero-image-preservation.json"), "utf8"));
manifest.heroPreservation = heroes;
fs.writeFileSync(path.join(REPORTS, "asset-manifest.json"), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(REPORTS, "asset-inventory.csv"), `${inventory.join("\n")}\n`);
console.log(`
${manifest.assets.length} principal assets, ${manifest.assets.reduce((n, a) => n + a.derivatives.length, 0)} responsive derivatives.`);