import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authorize, resolveSession } from "./authz";
import { record } from "./audit";

const clean = (value: string | undefined, max: number) => (value ?? "").trim().slice(0, max);
const safeUrl = (value: string | undefined) => {
	const url = clean(value, 300);
	return /^https?:\/\/[^\s]+$/i.test(url) ? url : undefined;
};

/** Profile of the signed-in account. */
export const get = query({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		const caller = await resolveSession(ctx, token);
		if (!caller) return null;
		return await ctx.db.query("profiles").withIndex("by_user", (q) => q.eq("userId", caller.user._id)).first();
	}
});

/** Idempotent profile creation, called once after sign-in. */
export const ensureMine = mutation({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		const caller = await authorize(ctx, token, "profile.read.self");
		const existing = await ctx.db.query("profiles").withIndex("by_user", (q) => q.eq("userId", caller.user._id)).first();
		if (existing) return existing;
		const now = Date.now();
		const id = await ctx.db.insert("profiles", {
			userId: caller.user._id,
			displayName: caller.user.name?.trim() || caller.user.email.split("@")[0],
			avatarUrl: caller.user.avatarUrl,
			createdAt: now,
			updatedAt: now
		});
		return await ctx.db.get(id);
	}
});

/** Update only the fields a member owns. */
export const update = mutation({
	args: {
		token: v.string(),
		displayName: v.optional(v.string()),
		headline: v.optional(v.string()),
		company: v.optional(v.string()),
		location: v.optional(v.string()),
		website: v.optional(v.string()),
		bio: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const caller = await authorize(ctx, args.token, "profile.update.self");
		const existing = await ctx.db.query("profiles").withIndex("by_user", (q) => q.eq("userId", caller.user._id)).first();
		const displayName = clean(args.displayName, 80);
		if (!displayName) throw new ConvexError("A display name is required.");
		const patch = {
			displayName,
			headline: clean(args.headline, 120) || undefined,
			company: clean(args.company, 120) || undefined,
			location: clean(args.location, 120) || undefined,
			website: safeUrl(args.website),
			bio: clean(args.bio, 600) || undefined,
			updatedAt: Date.now()
		};
		if (existing) await ctx.db.patch(existing._id, patch);
		else
			await ctx.db.insert("profiles", {
				userId: caller.user._id,
				...patch,
				createdAt: Date.now()
			});
		await record(ctx, {
			actorEmail: caller.user.email,
			actorUserId: caller.user._id,
			action: "profile.updated",
			targetType: "profile",
			targetId: String(caller.user._id)
		});
		return { ok: true };
	}
});