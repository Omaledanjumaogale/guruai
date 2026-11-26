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
	// ---------------------------------------------------------- identity ----
	// One profile per account. Credentials stay in `users`; profiles hold only
	// the fields a person is allowed to edit about themselves.
	profiles: defineTable({
		userId: v.id("users"),
		displayName: v.string(),
		headline: v.optional(v.string()),
		company: v.optional(v.string()),
		location: v.optional(v.string()),
		website: v.optional(v.string()),
		bio: v.optional(v.string()),
		avatarUrl: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number()
	}).index("by_user", ["userId"]),

	// ------------------------------------------------------ authorisation ----
	roles: defineTable({
		key: v.string(),
		name: v.string(),
		description: v.string(),
		rank: v.number(),
		selfSelectable: v.boolean(),
		requiresApproval: v.boolean(),
		planKey: v.optional(v.string()),
		permissions: v.array(v.string()),
		active: v.boolean()
	}).index("by_key", ["key"]),

	roleAssignments: defineTable({
		userId: v.id("users"),
		roleKey: v.string(),
		status: v.string(), // "requested" | "active" | "rejected" | "suspended"
		requestedAt: v.number(),
		decidedAt: v.optional(v.number()),
		decidedBy: v.optional(v.string()),
		reason: v.optional(v.string())
	})
		.index("by_user", ["userId", "status"])
		.index("by_status", ["status", "requestedAt"])
		.index("by_user_role", ["userId", "roleKey"]),

	plans: defineTable({
		key: v.string(),
		name: v.string(),
		description: v.string(),
		priceLabel: v.string(),
		entitlements: v.array(v.string()),
		active: v.boolean()
	}).index("by_key", ["key"]),

	subscriptions: defineTable({
		userId: v.id("users"),
		planKey: v.string(),
		status: v.string(), // "active" | "past_due" | "cancelled" | "expired"
		startedAt: v.number(),
		renewsAt: v.optional(v.number()),
		grantedBy: v.optional(v.string()),
		note: v.optional(v.string())
	})
		.index("by_user", ["userId", "status"])
		.index("by_status", ["status"]),

	// --------------------------------------------------------- messaging ----
	conversations: defineTable({
		subject: v.string(),
		createdBy: v.id("users"),
		status: v.string(), // "open" | "pending" | "closed"
		assignedTo: v.optional(v.id("users")),
		participantIds: v.array(v.id("users")),
		messageCount: v.number(),
		lastMessageAt: v.number(),
		createdAt: v.number()
	}).index("by_last_message", ["lastMessageAt"]),

	conversationParticipants: defineTable({
		conversationId: v.id("conversations"),
		userId: v.id("users"),
		role: v.string(), // "owner" | "staff"
		lastReadAt: v.number()
	})
		.index("by_conversation", ["conversationId"])
		.index("by_user", ["userId"]),

	dmMessages: defineTable({
		conversationId: v.id("conversations"),
		senderId: v.id("users"),
		senderLabel: v.string(),
		body: v.string(),
		createdAt: v.number()
	}).index("by_conversation", ["conversationId", "createdAt"]),

	// ----------------------------------------------------- notifications ----
	notifications: defineTable({
		userId: v.id("users"),
		kind: v.string(), // "product" | "security" | "broadcast" | "message" | "role" | "subscription"
		title: v.string(),
		body: v.string(),
		href: v.optional(v.string()),
		readAt: v.optional(v.number()),
		createdAt: v.number()
	})
		.index("by_user", ["userId", "createdAt"])
		.index("by_user_read", ["userId", "readAt"]),

	notificationPrefs: defineTable({
		userId: v.id("users"),
		product: v.boolean(),
		security: v.boolean(),
		broadcast: v.boolean(),
		message: v.boolean(),
		emailDigest: v.boolean(),
		updatedAt: v.number()
	}).index("by_user", ["userId"]),

	broadcasts: defineTable({
		title: v.string(),
		body: v.string(),
		audience: v.string(), // "everyone" | "members" | "admins" | "plan:<key>"
		status: v.string(), // "draft" | "pending_review" | "sent" | "rejected"
		createdBy: v.id("users"),
		createdByEmail: v.string(),
		reviewedBy: v.optional(v.string()),
		createdAt: v.number(),
		reviewedAt: v.optional(v.number()),
		sentAt: v.optional(v.number()),
		recipientCount: v.optional(v.number()),
		reason: v.optional(v.string())
	}).index("by_status", ["status", "createdAt"]),

	broadcastDeliveries: defineTable({
		broadcastId: v.id("broadcasts"),
		userId: v.id("users"),
		channel: v.string(), // "in_app" | "email"
		status: v.string(), // "delivered" | "suppressed"
		at: v.number()
	}).index("by_broadcast", ["broadcastId"]),

	// --------------------------------------------------- audit & limits ----
	auditEvents: defineTable({
		actorEmail: v.string(),
		actorUserId: v.optional(v.id("users")),
		action: v.string(),
		targetType: v.string(),
		targetId: v.string(),
		outcome: v.string(), // "success" | "denied" | "error"
		detail: v.optional(v.string()),
		at: v.number()
	})
		.index("by_at", ["at"])
		.index("by_actor", ["actorEmail", "at"]),

	rateLimits: defineTable({
		key: v.string(),
		windowStart: v.number(),
		count: v.number()
	}).index("by_key", ["key"]),

	users: defineTable({
		provider: v.string(), // "google" | "github" | "password"
		email: v.string(),
		name: v.optional(v.string()),
		avatarUrl: v.optional(v.string()),
		role: v.string(), // "admin" | "member"
		externalId: v.optional(v.string()),
		passwordHash: v.optional(v.string()), // "salt$sha256" for email accounts
		status: v.optional(v.string()), // "active" | "suspended"
		/** E-WIN central-hub identity. The hub is the source of truth for SSO. */
		hubId: v.optional(v.string()),
		hubEmail: v.optional(v.string()),
		hubLinkedAt: v.optional(v.number()),
		createdAt: v.number(),
		lastLoginAt: v.number()
	})
		.index("by_email", ["email"])
		.index("by_external", ["provider", "externalId"])
		.index("by_hub", ["hubId"]),

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