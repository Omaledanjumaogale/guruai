import { ALL_PERMISSIONS } from "./authz";

/** Role catalogue. Roles are data, not code: the console edits assignments, and
 * this seed keeps the initial policy reviewable in version control. */
export const ROLE_DEFS = [
	{
		key: "admin",
		name: "Super Admin",
		description: "Full control of the deployment: accounts, roles, plans, broadcasts, audit and every workspace module.",
		rank: 100,
		selfSelectable: false,
		requiresApproval: false,
		permissions: [...ALL_PERMISSIONS],
		active: true
	},
	{
		key: "manager",
		name: "Workspace Manager",
		description: "Leads a team workspace: reviews member requests, drafts announcements for approval and handles member conversations.",
		rank: 60,
		selfSelectable: true,
		requiresApproval: true,
		permissions: [
			"profile.read.self", "profile.update.self", "workspace.read", "workspace.manage",
			"role.request", "role.manage", "subscription.read.self",
			"admin.users.read", "admin.roles.read",
			"admin.broadcasts.read", "admin.broadcasts.create", "admin.broadcasts.review",
			"admin.audit.read", "messages.create", "messages.read.participant", "messages.manage",
			"notifications.read.self", "notifications.manage_preferences", "notifications.broadcast"
		],
		active: true
	},
	{
		key: "member",
		name: "Member",
		description: "The standard Guru AI workspace: chat, studios, research, notes, agents and private support messaging.",
		rank: 10,
		selfSelectable: true,
		requiresApproval: false,
		permissions: [
			"profile.read.self", "profile.update.self", "workspace.read", "workspace.manage",
			"role.request", "subscription.read.self", "messages.create",
			"messages.read.participant", "notifications.read.self", "notifications.manage_preferences"
		],
		active: true
	}
];

/** Entitlements are capability keys checked by the UI and by account-level APIs. */
export const PLAN_DEFS = [
	{
		key: "starter",
		name: "Starter",
		description: "The full research and writing core, powered by your own engine keys.",
		priceLabel: "Included with every account",
		entitlements: ["chat", "images", "humanizer", "notes", "convert", "keywords", "transcript", "tools"],
		active: true
	},
	{
		key: "pro",
		name: "Pro Studio",
		description: "Everything in Starter plus video, music, visual diagrams and multi-step agents.",
		priceLabel: "Provisioned by your workspace lead",
		entitlements: ["chat", "images", "humanizer", "notes", "convert", "keywords", "transcript", "tools", "video", "music", "visuals", "agents", "reverse-api", "priority-support"],
		active: true
	},
	{
		key: "enterprise",
		name: "Enterprise",
		description: "Pro Studio plus governance: admin console, broadcasts, audit trail and managed onboarding.",
		priceLabel: "Custom agreement",
		entitlements: ["chat", "images", "humanizer", "notes", "convert", "keywords", "transcript", "tools", "video", "music", "visuals", "agents", "reverse-api", "priority-support", "admin", "broadcasts", "audit", "messaging"],
		active: true
	}
];

export type EffectivePlan = {
	key: string;
	name: string;
	priceLabel: string;
	entitlements: string[];
	status: string;
	startedAt: number | null;
	renewsAt: number | null;
};

export async function effectivePlan(ctx: any, userId: any): Promise<EffectivePlan> {
	const sub = await ctx.db
		.query("subscriptions")
		.withIndex("by_user", (q: any) => q.eq("userId", userId).eq("status", "active"))
		.first();
	const key = sub?.planKey ?? "starter";
	let plan = await ctx.db.query("plans").withIndex("by_key", (q: any) => q.eq("key", key)).first();
	if (!plan) plan = await ctx.db.query("plans").withIndex("by_key", (q: any) => q.eq("key", "starter")).first();
	return {
		key: plan?.key ?? "starter",
		name: plan?.name ?? "Starter",
		priceLabel: plan?.priceLabel ?? "Included",
		entitlements: plan?.entitlements ?? ["chat"],
		status: sub?.status ?? "active",
		startedAt: sub?.startedAt ?? null,
		renewsAt: sub?.renewsAt ?? null
	};
}

export function hasEntitlement(plan: EffectivePlan, feature: string): boolean {
	return plan.entitlements.includes(feature);
}