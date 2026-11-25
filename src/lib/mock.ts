/**
 * Offline demo data — shown only while the Convex backend is unreachable.
 * It is replaced automatically by live workspace data as soon as the
 * backend connects (every module switches to real queries).
 */

export const MOCKS: Record<string, any> = {
	"usage.counts": { total: 12, ok: 11, failed: 1, byModule: { chat: 5, images: 3, keywords: 2, agents: 2 } },
	"usage.recent": [
		{ _id: "m1", module: "chat", action: "send", ok: true, createdAt: Date.now() - 1000 * 60 * 3 },
		{ _id: "m2", module: "images", action: "text2img", ok: true, createdAt: Date.now() - 1000 * 60 * 18 },
		{ _id: "m3", module: "keywords", action: "research", ok: true, createdAt: Date.now() - 1000 * 60 * 44 },
		{ _id: "m4", module: "agents", action: "run", ok: false, createdAt: Date.now() - 1000 * 60 * 90 }
	],
	"connectors.list": [
		{ _id: "mk1", provider: "agnes", label: "Agnes AI (deployment engine)", masked: "sk-…xhx", status: "ok", origin: "deployment", baseUrl: "" },
		{ _id: "mk2", provider: "deepai", label: "DeepAI studio engine", masked: "demo-…key", status: "untested", origin: "demo", baseUrl: "" }
	],
	"chats.list": [{ _id: "mc1", title: "Welcome to Guru AI", provider: "agnes", model: "gpt-4o-mini", pinned: true, updatedAt: Date.now() }],
	"agents.list": [{ _id: "ma1", name: "Content pipeline (demo)", description: "Research → draft → humanize → save", steps: [], enabled: false }],
	"notes.list": [
		{ _id: "mn1", title: "Guru AI quickstart", body: "Connect keys in the Connector Vault, then chat, generate, research, convert and automate — all modules share one engine layer.", color: "indigo", pinned: true, tags: ["demo"], updatedAt: Date.now() }
	]
};
