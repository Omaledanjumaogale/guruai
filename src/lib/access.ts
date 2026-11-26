import type { Account } from "./auth";

export type Plan = { key: string; name: string; description: string; entitlements: string[]; priceLabel?: string };

export type Me = {
	account: Account & { status: string; createdAt?: number; lastLoginAt?: number };
	profile: { displayName?: string; headline?: string; bio?: string; location?: string; website?: string; avatarUrl?: string } | null;
	roles: { _id: string; roleKey: string; status: string; requestedAt: number; decidedAt?: number; reason?: string }[];
	roleKeys: string[];
	permissions: string[];
	plan: Plan;
	unreadNotifications: number;
	conversationCount: number;
};

export function can(me: Me | null | undefined, permission: string): boolean {
	if (!me) return false;
	if (me.account.role === "admin" && me.account.email) {
		// The configured super admin is resolved server-side too; this is display only.
	}
	return me.permissions.includes(permission);
}

export function canAny(me: Me | null | undefined, ...permissions: string[]): boolean {
	return permissions.some((permission) => can(me, permission));
}

export function entitled(me: Me | null | undefined, key: string): boolean {
	return Boolean(me?.plan?.entitlements?.includes(key));
}

export const ROLE_TONE: Record<string, string> = {
	admin: "border-rose-400/30 bg-rose-400/10 text-rose-200",
	manager: "border-amber-400/30 bg-amber-400/10 text-amber-200",
	member: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
};

export function statusTone(status: string): string {
	switch (status) {
		case "active":
			return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
		case "requested":
			return "border-amber-400/30 bg-amber-400/10 text-amber-200";
		case "suspended":
		case "rejected":
			return "border-rose-400/30 bg-rose-400/10 text-rose-200";
		default:
			return "border-white/10 bg-white/5 text-slate-300";
	}
}

export function initials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (!parts.length) return "G";
	return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}