import { v, ConvexError } from "convex/values";
import { action, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { resolveSession } from "./authz";
import { hubAppUrl, hubConfigured, hubSignIn, HubError } from "./hubClient";

const normalise = (value: string) => value.trim().toLowerCase();

function hubMessage(error: unknown): string {
	if (error instanceof HubError) return error.message;
	return "E-WIN Hub verification failed. Please try again.";
}

/** Local connection status. Deliberately does not call the hub (keeps queries cheap). */
export const status = query({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		const caller = await resolveSession(ctx, token);
		if (!caller) return null;
		const user = caller.user;
		return {
			configured: hubConfigured(),
			connected: Boolean(user.hubId),
			hubId: user.hubId ?? null,
			hubEmail: user.hubEmail ?? null,
			linkedAt: user.hubLinkedAt ?? null,
			hubAppUrl: hubAppUrl(),
			appUrl: process.env.APP_URL ?? "https://guruai.ewinproject.org",
			account: {
				email: user.email,
				name: user.name ?? user.email,
				provider: user.provider,
				role: user.role,
				createdAt: user.createdAt,
				lastLoginAt: user.lastLoginAt
			},
			session: {
				createdAt: caller.session.createdAt,
				expiresAt: caller.session.expiresAt,
				role: caller.session.role
			}
		};
	}
});

/** Connect (or reconnect) the signed-in account to the central E-WIN identity. */
export const link = action({
	args: { token: v.string(), email: v.string(), password: v.string() },
	handler: async (ctx, { token, email, password }) => {
		if (!hubConfigured()) throw new ConvexError("E-WIN Hub is not configured on this deployment.");
		const me = await ctx.runQuery(api.auth.verify, { token });
		if (!me) throw new ConvexError("Sign in again to connect your E-WIN identity.");
		if (!normalise(email)) throw new ConvexError("Enter your E-WIN email address.");

		let hub;
		try {
			hub = await hubSignIn(email, password);
		} catch (error) {
			throw new ConvexError(hubMessage(error));
		}
		if (normalise(hub.email) !== normalise(me.email)) {
			throw new ConvexError("This E-WIN identity uses a different email. Sign in with the email on your Guru AI account.");
		}
		try {
			await ctx.runMutation(internal.authInternal.linkHubIdentity, {
				email: me.email,
				hubId: hub.id,
				hubEmail: hub.email
			});
		} catch {
			throw new ConvexError("This E-WIN identity is already linked to another Guru AI account.");
		}
		await ctx.runMutation(internal.audit.logInternal, {
			actorEmail: me.email,
			action: "identity.hub_linked",
			targetType: "user",
			targetId: me.email,
			outcome: "success",
			detail: "Connected to the E-WIN central hub identity."
		});
		return { connected: true, hubEmail: hub.email, hubId: hub.id, linkedAt: Date.now() };
	}
});

/** Disconnect the hub link. Local password sign-in remains available. */
export const unlink = action({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		const me = await ctx.runQuery(api.auth.verify, { token });
		if (!me) throw new ConvexError("Sign in again to change your identity link.");
		await ctx.runMutation(internal.authInternal.clearHubIdentity, { email: me.email });
		await ctx.runMutation(internal.audit.logInternal, {
			actorEmail: me.email,
			action: "identity.hub_unlinked",
			targetType: "user",
			targetId: me.email,
			outcome: "success",
			detail: "Disconnected from the E-WIN central hub identity; local credentials retained."
		});
		return { connected: false };
	}
});
