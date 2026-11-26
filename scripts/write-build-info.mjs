#!/usr/bin/env node
/** Writes non-sensitive build identity so production can prove which commit is live. */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const git = (args) => {
	try {
		return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
	} catch {
		return "unknown";
	}
};

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const branch = process.env.GITHUB_REF_NAME || process.env.CF_PAGES_BRANCH || git(["rev-parse", "--abbrev-ref", "HEAD"]);
const info = {
	app: "Guru AI",
	version: pkg.version,
	commitSha: process.env.GITHUB_SHA || process.env.CF_PAGES_COMMIT_SHA || git(["rev-parse", "HEAD"]),
	branch,
	environment: branch === "main" || branch === "master" ? "production" : "candidate",
	builtAt: new Date().toISOString(),
	source: "scripts/write-build-info.mjs"
};
fs.mkdirSync(path.join(root, "static"), { recursive: true });
fs.writeFileSync(path.join(root, "static/build-info.json"), `${JSON.stringify(info, null, 2)}\n`);
console.log(`build-info.json → ${info.commitSha.slice(0, 7)} (${info.branch})`);