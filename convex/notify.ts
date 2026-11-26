import { isSuperAdmin } from "./authz";

/** In-app notification fan-out. Preferences are honoured per category; security
 * alerts are always delivered because silence would hide account risk. */
export type NotifyInput = {
	userId: any;
	kind: "product" | "security" | "broadcast" | "message" | "role" | "subscription";
	title: string;
	body: string;
	href?: string;
};

export async function pushNotification(ctx: any, input: NotifyInput) {
	const prefs = await ctx.db
		.query("notificationPrefs")
		.withIndex("by_user", (q: any) => q.eq("userId", input.userId))
		.first();
	const enabled =
		input.kind === "security"
			? true
			: input.kind === "broadcast"
				? prefs?.broadcast ?? true
				: input.kind === "message"
					? prefs?.message ?? true
					: prefs?.product ?? true;
	if (!enabled) return null;
	return await ctx.db.insert("notifications", {
		userId: input.userId,
		kind: input.kind,
		title: input.title,
		body: input.body,
		href: input.href,
		createdAt: Date.now()
	});
}

/** Notify every administrator (bounded scan — the directory is small). */
export async function notifyAdmins(ctx: any, input: Omit<NotifyInput, "userId">) {
	const users = await ctx.db.query("users").take(200);
	for (const user of users) {
		if (user.role !== "admin" && !isSuperAdmin(user.email)) continue;
		await pushNotification(ctx, { ...input, userId: user._id });
	}
}