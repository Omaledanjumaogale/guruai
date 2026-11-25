import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Reverse API key extractor — harmonized with reverse-api-engineer.
 * Scans source the workspace owner provides (their own repos) for connector
 * material: API endpoint base URLs and API-key identifiers. Values are kept
 * server-side; the client only ever sees redacted snippets.
 */

type Candidate = {
	provider: string;
	providerGuess: string;
	keyEnvName: string;
	baseUrl?: string;
	snippet: string;
	confidence: number;
	token?: string;
};

const PROVIDER_MAP: Record<string, string> = {
	DEEPAI: "deepai",
	OPENAI: "openai",
	OPENAI_API_KEY: "openai",
	ANTHROPIC: "anthropic",
	CLAUDE: "anthropic",
	OPENROUTER: "openrouter",
	GEMINI: "gemini",
	GOOGLE_AI: "gemini",
	GROQ: "groq",
	TOGETHER: "openai", // OpenAI-compatible
	FIREWORKS: "openai",
	MISTRAL: "openai",
	XAI: "openai"
};

const KEY_PATTERNS: { re: RegExp; provider?: string; confidence: number }[] = [
	// .env style: KEY=value
	{ re: /^\s*(?:export\s+)?([A-Z0-9_]*(?:API_KEY|APIKEY|API_TOKEN|ACCESS_TOKEN|SECRET_KEY|AUTH_TOKEN|APIKEY)[A-Z0-9_]*)\s*[:=]\s*["']?([A-Za-z0-9_\-\.~+=/]{8,})["']?\s*$/gm, confidence: 0.9 },
	// JSON config: "apiKey": "..."
	{ re: /"(api[_-]?key|api[_-]?token|access[_-]?token|secret[_-]?key)"\s*:\s*"([A-Za-z0-9_\-\.~+=/]{8,})"/gi, confidence: 0.75 },
	// YAML: api_key: ...
	{ re: /^\s*(api[_-]?key|api[_-]?token|access[_-]?token)\s*:\s*["']?([A-Za-z0-9_\-\.~+=/]{8,})["']?\s*$/gim, confidence: 0.7 },
	// Known vendor key shapes even without the env name
	{ re: /\b(sk-[A-Za-z0-9]{20,})\b/g, provider: "openai", confidence: 0.95 },
	{ re: /\b(sk-ant-[A-Za-z0-9\-]{20,})\b/g, provider: "anthropic", confidence: 0.98 },
	{ re: /\b(AIza[A-Za-z0-9\-_]{30,})\b/g, provider: "gemini", confidence: 0.95 },
	{ re: /\b(gsk_[A-Za-z0-9]{20,})\b/g, provider: "groq", confidence: 0.95 },
	{ re: /\b(sk-or-[A-Za-z0-9\-]{20,})\b/g, provider: "openrouter", confidence: 0.95 },
	{ re: /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/g, provider: "deepai", confidence: 0.3 }
];

const URL_PATTERN = /https?:\/\/[a-zA-Z0-9\.\-]+(?:\.[a-z]{2,})(?:\/[^\s"'`,)\]]*)?/g;
const API_HOST_HINT = /(api\.|\.api|gateway|openai|anthropic|deepai|gemini|groq|openrouter|generativelanguage|api\.deepai)/i;

function mask(v: string): string {
	if (v.length <= 8) return "••••••••";
	return `${v.slice(0, 3)}…${v.slice(-4)}`;
}

function providerForName(name: string): string {
	const upper = name.toUpperCase();
	for (const k of Object.keys(PROVIDER_MAP)) {
		if (upper.includes(k)) return PROVIDER_MAP[k];
	}
	return "custom";
}

function redactContext(line: string, value: string): string {
	return line.replace(value, mask(value)).trim().slice(0, 160);
}

function scanText(text: string, sourceLabel: string): Candidate[] {
	const out: Candidate[] = [];
	// Base URLs of API hosts first (context for candidates).
	const apiUrls = new Set<string>();
	for (const m of text.matchAll(URL_PATTERN)) {
		if (API_HOST_HINT.test(m[0]) && m[0].length < 120) apiUrls.add(m[0].replace(/\/$/, ""));
	}
	const defaultBase = [...apiUrls][0];

	for (const p of KEY_PATTERNS) {
		p.re.lastIndex = 0;
		let m: RegExpExecArray | null;
		while ((m = p.re.exec(text)) !== null) {
			const name = p.provider ? `${(p.provider ?? "custom").toUpperCase()}_KEY` : m[1];
			const value = p.provider ? m[1] : m[2];
			if (!value || value.length < 8) continue;
			const lineStart = text.lastIndexOf("\n", m.index) + 1;
			const lineEnd = text.indexOf("\n", m.index);
			const line = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
			out.push({
				provider: p.provider ?? providerForName(name),
				providerGuess: p.provider ?? providerForName(name),
				keyEnvName: name,
				baseUrl: defaultBase,
				snippet: `${sourceLabel}: ${redactContext(line, value)}`,
				confidence: p.confidence,
				token: value
			});
			if (out.length >= 40) return dedupe(out);
		}
	}
	return dedupe(out);
}

function dedupe(list: Candidate[]): Candidate[] {
	const seen = new Set<string>();
	return list.filter((c) => {
		const k = `${c.provider}:${c.token?.slice(-8)}`;
		if (seen.has(k)) return false;
		seen.add(k);
		return true;
	});
}

const GITHUB_FILE_HINTS = [
	".env",
	".env.local",
	".env.example",
	"config.js",
	"config.ts",
	"config.json",
	"settings.py",
	"docker-compose.yml",
	"README.md",
	"app.py",
	"main.py",
	"index.js",
	"index.ts",
	"client.py",
	"api.py"
];

export const scanRepo = action({
	args: { workspaceId: v.id("workspaces"), source: v.string() },
	handler: async (ctx, { workspaceId, source }) => {
		let label = source.slice(0, 80);
		const texts: { label: string; content: string }[] = [];

		const ghMatch = source.match(/github\.com\/([\w\.\-]+)\/([\w\.\-]+)/);
		if (ghMatch) {
			const [, owner, repoRaw] = ghMatch;
			const repo = repoRaw.replace(/\.git$/, "");
			label = `${owner}/${repo}`;
			// List the default branch tree, pick likely config files (public repos only).
			const branchRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: { accept: "application/vnd.github+json" } });
			if (!branchRes.ok) throw new Error(`Could not read ${label} (HTTP ${branchRes.status}). Public repos only, or paste the files manually.`);
			const repoMeta = await branchRes.json();
			const branch = repoMeta.default_branch ?? "main";
			const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { headers: { accept: "application/vnd.github+json" } });
			if (treeRes.ok) {
				const tree = (await treeRes.json()).tree as { path: string }[];
				const picked = tree
					.map((t) => t.path)
					.filter((p) => GITHUB_FILE_HINTS.some((h) => p.endsWith(h)) || p.endsWith(".env"))
					.slice(0, 20);
				for (const path of picked) {
					const raw = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`);
					if (raw.ok) {
						const content = (await raw.text()).slice(0, 64000);
						texts.push({ label: `${owner}/${repo}/${path}`, content });
					}
				}
			}
			if (texts.length === 0) {
				// Fall back to scanning the README for endpoint documentation.
				const readme = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`);
				if (readme.ok) texts.push({ label: `${owner}/${repo}/README.md`, content: (await readme.text()).slice(0, 64000) });
			}
		} else if (source.length > 40 || source.includes("\n")) {
			texts.push({ label: label || "pasted source", content: source });
		} else {
			throw new Error("Provide a github.com repo URL, or paste the source/config files to scan.");
		}

		const all: Candidate[] = [];
		for (const t of texts) all.push(...scanText(t.content, t.label));
		if (all.length === 0) {
			return { scannedFiles: texts.length, candidates: [] as Omit<Candidate, "token">[] };
		}
		const stored = await ctx.runMutation(internal.extractor.storeCandidates, { workspaceId, sourceLabel: label, candidates: all });
		return { scannedFiles: texts.length, candidates: stored };
	}
});

export const savePastedScan = action({
	args: { workspaceId: v.id("workspaces"), sourceLabel: v.string(), content: v.string() },
	handler: async (ctx, { workspaceId, sourceLabel, content }) => {
		const all = scanText(content, sourceLabel || "pasted source");
		if (all.length === 0) return { candidates: [] };
		const stored = await ctx.runMutation(internal.extractor.storeCandidates, { workspaceId, sourceLabel, candidates: all });
		return { candidates: stored };
	}
});

export const listCandidates = query({
	args: { workspaceId: v.id("workspaces") },
	handler: async (ctx, { workspaceId }) => {
		const rows = await ctx.db
			.query("connectorCandidates")
			.withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
			.order("desc")
			.collect();
		// Redact: strip token, keep masked preview.
		return rows.map((r) => ({ ...r, token: undefined }));
	}
});

export const approveCandidate = mutation({
	args: { candidateId: v.id("connectorCandidates"), label: v.optional(v.string()) },
	handler: async (ctx, { candidateId, label }) => {
		const cand = await ctx.db.get(candidateId);
		if (!cand || !cand.token) throw new Error("Candidate has no stored key material.");
		const now = Date.now();
		const connectorId = await ctx.db.insert("connectors", {
			workspaceId: cand.workspaceId,
			provider: cand.provider,
			label: label ?? `${cand.provider} (from ${cand.sourceLabel})`,
			baseUrl: cand.baseUrl,
			token: cand.token,
			masked: `${cand.token.slice(0, 3)}…${cand.token.slice(-4)}`,
			status: "untested",
			origin: "reverse-api-extractor",
			createdAt: now,
			updatedAt: now
		});
		await ctx.db.patch(candidateId, { status: "approved" });
		// Key material has been promoted to the vault; clear it from the candidate.
		await ctx.db.patch(candidateId, { token: undefined });
		return connectorId;
	}
});

export const rejectCandidate = mutation({
	args: { candidateId: v.id("connectorCandidates") },
	handler: async (ctx, { candidateId }) => {
		await ctx.db.patch(candidateId, { status: "rejected", token: undefined });
	}
});

export const clearCandidates = mutation({
	args: { workspaceId: v.id("workspaces") },
	handler: async (ctx, { workspaceId }) => {
		const rows = await ctx.db
			.query("connectorCandidates")
			.withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
			.collect();
		for (const r of rows) await ctx.db.delete(r._id);
	}
});
