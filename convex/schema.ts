import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Guru AI — harmonized schema.
 * A workspace is identified by a device/workspace key held by the client, which
 * keeps the app usable without a third-party auth provider while still scoping
 * every row to its owner. All connectors hold keys the workspace owner supplied.
 */
export default defineSchema({
	workspaces: defineTable({
		deviceKey: v.string(), // opaque client-generated identifier
		name: v.string(),
		createdAt: v.number()
	}).index("by_device", ["deviceKey"]),

	settings: defineTable({
		workspaceId: v.id("workspaces"),
		key: v.string(), // e.g. "routing.rules", "clientLanguage", "defaultModel"
		value: v.any()
	})
		.index("by_workspace", ["workspaceId"])
		.index("by_workspace_key", ["workspaceId", "key"]),

	// Connector Vault — keys the user owns, masked in every client response.
	connectors: defineTable({
		workspaceId: v.id("workspaces"),
		provider: v.string(), // "deepai" | "openai" | "anthropic" | "openrouter" | "gemini" | "groq" | "custom"
		label: v.string(),
		baseUrl: v.optional(v.string()),
		token: v.string(), // stored server-side only
		masked: v.string(),
		status: v.string(), // "untested" | "ok" | "error"
		lastCheckedAt: v.optional(v.number()),
		lastError: v.optional(v.string()),
		origin: v.string(), // "manual" | "reverse-api-extractor"
		createdAt: v.number(),
		updatedAt: v.number()
	})
		.index("by_workspace", ["workspaceId"])
		.index("by_workspace_provider", ["workspaceId", "provider"]),

	chats: defineTable({
		workspaceId: v.id("workspaces"),
		title: v.string(),
		model: v.string(),
		provider: v.string(),
		routedBy: v.optional(v.string()), // "manual" | "gururoute"
		pinned: v.boolean(),
		archived: v.boolean(),
		createdAt: v.number(),
		updatedAt: v.number()
	})
		.index("by_workspace", ["workspaceId"])
		.index("by_workspace_updated", ["workspaceId", "updatedAt"]),

	messages: defineTable({
		chatId: v.id("chats"),
		workspaceId: v.id("workspaces"),
		role: v.string(), // "user" | "assistant" | "system"
		content: v.string(),
		model: v.optional(v.string()),
		tokens: v.optional(v.number()),
		createdAt: v.number()
	}).index("by_chat", ["chatId", "createdAt"]),

	generations: defineTable({
		workspaceId: v.id("workspaces"),
		kind: v.string(), // "image" | "video" | "music" | "visual"
		prompt: v.string(),
		params: v.any(),
		status: v.string(), // "pending" | "done" | "error"
		resultUrl: v.optional(v.string()),
		resultData: v.optional(v.any()), // e.g. visual JSON spec
		error: v.optional(v.string()),
		createdAt: v.number()
	})
		.index("by_workspace", ["workspaceId"])
		.index("by_workspace_kind", ["workspaceId", "kind"]),

	notes: defineTable({
		workspaceId: v.id("workspaces"),
		title: v.string(),
		body: v.string(),
		color: v.string(),
		pinned: v.boolean(),
		archived: v.boolean(),
		tags: v.array(v.string()),
		updatedAt: v.number(),
		createdAt: v.number()
	}).index("by_workspace", ["workspaceId", "updatedAt"]),

	transcripts: defineTable({
		workspaceId: v.id("workspaces"),
		videoId: v.string(),
		url: v.string(),
		title: v.string(),
		language: v.string(),
		content: v.string(),
		segments: v.optional(v.any()),
		summary: v.optional(v.string()),
		createdAt: v.number()
	}).index("by_workspace", ["workspaceId", "createdAt"]),

	keywordProjects: defineTable({
		workspaceId: v.id("workspaces"),
		seed: v.string(),
		country: v.string(),
		questions: v.any(), // grouped buckets
		prepositions: v.optional(v.any()),
		comparisons: v.optional(v.any()),
		createdAt: v.number()
	}).index("by_workspace", ["workspaceId", "createdAt"]),

	agents: defineTable({
		workspaceId: v.id("workspaces"),
		name: v.string(),
		description: v.string(),
		steps: v.array(
			v.object({
				id: v.string(),
				type: v.string(), // "prompt" | "humanize" | "keywords" | "image" | "note" | "http" | "visual"
				name: v.string(),
				config: v.any()
			})
		),
		enabled: v.boolean(),
		createdAt: v.number(),
		updatedAt: v.number()
	}).index("by_workspace", ["workspaceId", "updatedAt"]),

	agentRuns: defineTable({
		agentId: v.id("agents"),
		workspaceId: v.id("workspaces"),
		status: v.string(), // "running" | "done" | "error"
		log: v.array(
			v.object({
				stepId: v.string(),
				stepName: v.string(),
				status: v.string(),
				output: v.optional(v.string()),
				error: v.optional(v.string()),
				at: v.number()
			})
		),
		startedAt: v.number(),
		finishedAt: v.optional(v.number())
	}).index("by_agent", ["agentId", "startedAt"]).index("by_workspace", ["workspaceId", "startedAt"]),

	harSessions: defineTable({
		workspaceId: v.id("workspaces"),
		name: v.string(),
		targetUrl: v.string(),
		endpoints: v.any(), // normalized endpoint list
		entryCount: v.number(),
		createdAt: v.number()
	}).index("by_workspace", ["workspaceId", "createdAt"]),

	generatedClients: defineTable({
		sessionId: v.id("harSessions"),
		workspaceId: v.id("workspaces"),
		language: v.string(),
		code: v.string(),
		generatedBy: v.string(), // "template" | "llm"
		createdAt: v.number()
	}).index("by_session", ["sessionId", "createdAt"]),

	// Candidate keys/endpoints discovered by the Reverse API key extractor.
	connectorCandidates: defineTable({
		workspaceId: v.id("workspaces"),
		sourceLabel: v.string(), // repo url or pasted source label
		provider: v.string(),
		providerGuess: v.string(),
		keyEnvName: v.string(),
		baseUrl: v.optional(v.string()),
		snippet: v.string(), // redacted context line
		confidence: v.number(), // 0..1
		status: v.string(), // "pending" | "approved" | "rejected"
		createdAt: v.number()
	}).index("by_workspace", ["workspaceId", "status"]),

	usageEvents: defineTable({
		workspaceId: v.id("workspaces"),
		module: v.string(), // "chat" | "images" | "humanizer" | ...
		action: v.string(),
		provider: v.optional(v.string()),
		model: v.optional(v.string()),
		ok: v.boolean(),
		ms: v.optional(v.number()),
		createdAt: v.number()
	}).index("by_workspace", ["workspaceId", "createdAt"]),

	// Accounts — OAuth (Google/GitHub) or the super-admin password login.
	users: defineTable({
		provider: v.string(), // "google" | "github" | "password"
		email: v.string(),
		name: v.optional(v.string()),
		avatarUrl: v.optional(v.string()),
		role: v.string(), // "admin" | "member"
		externalId: v.optional(v.string()),
		passwordHash: v.optional(v.string()), // "salt$sha256" for email accounts
		createdAt: v.number(),
		lastLoginAt: v.number()
	})
		.index("by_email", ["email"])
		.index("by_external", ["provider", "externalId"]),

	// Opaque server sessions; the browser holds only the raw token.
	sessions: defineTable({
		tokenHash: v.string(),
		userId: v.id("users"),
		role: v.string(),
		createdAt: v.number(),
		expiresAt: v.number()
	})
		.index("by_token", ["tokenHash"])
		.index("by_user", ["userId"])
});
