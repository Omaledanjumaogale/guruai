import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";
import { resolveSession } from "./authz";

/** Bounded workspace analytics: one scan of at most 1,200 usage events. */
export const overview = query({
	args: { token: v.string(), workspaceId: v.id("workspaces") },
	handler: async (ctx, { token, workspaceId }) => {
		const caller = await resolveSession(ctx, token);
		if (!caller) throw new ConvexError("Sign in to view analytics.");
		const workspace = await ctx.db.get(workspaceId);
		if (!workspace) throw new ConvexError("That workspace no longer exists.");
		const events = await ctx.db
			.query("usageEvents")
			.withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
			.order("desc")
			.take(1200);

		const byModule: Record<string, { count: number; failed: number; totalMs: number }> = {};
		const dayCounts = new Map<string, number>();
		let ok = 0;
		let failed = 0;
		let totalMs = 0;
		let timed = 0;
		const dayMs = 24 * 60 * 60 * 1000;
		const start = new Date();
		start.setHours(0, 0, 0, 0);
		const days = Array.from({ length: 14 }, (_, i) => {
			const d = new Date(start.getTime() - (13 - i) * dayMs);
			return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString(undefined, { weekday: "short" }), count: 0 };
		});
		const dayMap = new Map(days.map((d) => [d.key, d]));

		for (const event of events) {
			const bucket = byModule[event.module] ?? { count: 0, failed: 0, totalMs: 0 };
			bucket.count++;
			if (event.ok) ok++;
			else {
				failed++;
				bucket.failed++;
			}
			if (typeof event.ms === "number") {
				bucket.totalMs += event.ms;
				totalMs += event.ms;
				timed++;
			}
			byModule[event.module] = bucket;
			const key = new Date(event.createdAt).toISOString().slice(0, 10);
			dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
			const day = dayMap.get(key);
			if (day) day.count = dayCounts.get(key) ?? 0;
		}

		return {
			workspace: { name: workspace.name, createdAt: workspace.createdAt },
			caller: { email: caller.user.email },
			total: events.length,
			ok,
			failed,
			successRate: events.length ? Math.round((ok / events.length) * 100) : 100,
			avgMs: timed ? Math.round(totalMs / timed) : null,
			byModule: Object.entries(byModule)
				.map(([module, data]) => ({ module, count: data.count, failed: data.failed, avgMs: data.count ? Math.round(data.totalMs / data.count) : 0 }))
				.sort((a, b) => b.count - a.count)
				.slice(0, 10),
			timeline: days,
			recent: events.slice(0, 8).map((e) => ({ module: e.module, action: e.action, ok: e.ok, ms: e.ms ?? null, createdAt: e.createdAt }))
		};
	}
});
