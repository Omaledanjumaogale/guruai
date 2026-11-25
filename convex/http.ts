import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";


/**
 * OAuth 2.0 flows for Google and GitHub, plus a health endpoint.
 * Register these callback URLs in each provider console:
 *   https://brave-bullfrog-719.eu-west-1.convex.site/oauth/google/callback
 *   https://brave-bullfrog-719.eu-west-1.convex.site/oauth/github/callback
 */

const SITE = process.env.CONVEX_HTTP_ACTIONS_URL ?? "https://brave-bullfrog-719.eu-west-1.convex.site";
const APP = process.env.APP_URL ?? "https://guru-ai.pages.dev";

const PROVIDERS: Record<string, any> = {
	google: {
		authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
		tokenUrl: "https://oauth2.googleapis.com/token",
		userUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
		scope: "openid email profile",
		clientIdEnv: "GOOGLE_CLIENT_ID",
		clientSecretEnv: "GOOGLE_CLIENT_SECRET"
	},
	github: {
		authUrl: "https://github.com/login/oauth/authorize",
		tokenUrl: "https://github.com/login/oauth/access_token",
		userUrl: "https://api.github.com/user",
		scope: "read:user user:email",
		clientIdEnv: "GITHUB_CLIENT_ID",
		clientSecretEnv: "GITHUB_CLIENT_SECRET"
	}
};

async function sha256Hex(s: string): Promise<string> {
	const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
	return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function redirect(to: string): Response {
	return new Response(null, { status: 302, headers: { Location: to } });
}

function startFor(providerKey: string): Response {
	const p = PROVIDERS[providerKey];
	if (!p) return new Response("Unknown provider", { status: 404 });
	const clientId = process.env[p.clientIdEnv];
	if (!clientId) return new Response(`${providerKey} OAuth is not configured on this deployment.`, { status: 500 });
	const url = new URL(p.authUrl);
	url.searchParams.set("client_id", clientId);
	url.searchParams.set("redirect_uri", `${SITE}/oauth/${providerKey}/callback`);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("scope", p.scope);
	url.searchParams.set("state", `gst-${providerKey}-${Date.now()}`);
	return redirect(url.toString());
}

const http = httpRouter();

http.route({
	path: "/health",
	method: "GET",
	handler: httpAction(async () => new Response(JSON.stringify({ ok: true, app: "guru-ai" }), { headers: { "content-type": "application/json" } }))
});

http.route({ path: "/oauth/google/start", method: "GET", handler: httpAction(async () => startFor("google")) });
http.route({ path: "/oauth/github/start", method: "GET", handler: httpAction(async () => startFor("github")) });
http.route({ path: "/oauth/google/callback", method: "GET", handler: httpAction(async (ctx, request) => oauthCallback("google", request, ctx)) });
http.route({ path: "/oauth/github/callback", method: "GET", handler: httpAction(async (ctx, request) => oauthCallback("github", request, ctx)) });


/** Full callback including DB session issuance. */
async function oauthCallback(providerKey: string, request: Request, ctx: any): Promise<Response> {
	const p = PROVIDERS[providerKey];
	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	if (!code) return new Response("Missing ?code — restart the sign-in.", { status: 400 });
	const clientId = process.env[p.clientIdEnv];
	const clientSecret = process.env[p.clientSecretEnv];
	if (!clientId || !clientSecret) return new Response(`${providerKey} OAuth is not configured.`, { status: 500 });

	const tokenRes = await fetch(p.tokenUrl, {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			code,
			grant_type: "authorization_code",
			redirect_uri: `${SITE}/oauth/${providerKey}/callback`
		})
	});
	if (!tokenRes.ok) return new Response(`Token exchange failed (${tokenRes.status}).`, { status: 500 });
	const tokenData = await tokenRes.json();
	const accessToken = tokenData.access_token;
	if (!accessToken) return new Response("No access token returned.", { status: 500 });

	const profileRes = await fetch(p.userUrl, {
		headers: { authorization: `Bearer ${accessToken}`, accept: "application/json", "user-agent": "guru-ai" }
	});
	if (!profileRes.ok) return new Response(`Profile fetch failed (${profileRes.status}).`, { status: 500 });
	const profile = await profileRes.json();

	let email: string = profile.email ?? "";
	let name: string = profile.name ?? profile.login ?? email;
	let avatar: string | undefined = profile.picture ?? profile.avatar_url ?? undefined;
	let externalId: string = String(profile.id ?? profile.sub ?? "");

	if (providerKey === "github" && !email) {
		try {
			const emailsRes = await fetch("https://api.github.com/user/emails", {
				headers: { authorization: `Bearer ${accessToken}`, accept: "application/json", "user-agent": "guru-ai" }
			});
			const emails = emailsRes.ok ? await emailsRes.json() : [];
			const primary = (Array.isArray(emails) ? emails : []).find((e: any) => e.primary && e.verified);
			email = primary?.email ?? `${profile.login}@users.noreply.github.com`;
		} catch {
			email = `${profile.login}@users.noreply.github.com`;
		}
	}
	if (!email) email = `${externalId || "user"}@${providerKey}.local`;

	const role =
		process.env.SUPER_ADMIN_EMAIL && email.toLowerCase() === process.env.SUPER_ADMIN_EMAIL.toLowerCase() ? "admin" : "member";

	const userId = (await ctx.runMutation(internal.authInternal.upsertUser, {
		provider: providerKey,
		email,
		name,
		role,
		externalId,
		avatarUrl: avatar
	})) as any;

	const bytes = new Uint8Array(24);
	crypto.getRandomValues(bytes);
	const sessionToken = `gst_${[...bytes].map((b: number) => b.toString(16).padStart(2, "0")).join("")}`;
	await ctx.runMutation(internal.authInternal.insertSession, {
		tokenHash: await sha256Hex(sessionToken),
		userId,
		role,
		expiresAt: Date.now() + 14 * 24 * 3600 * 1000
	});

	return redirect(`${APP}/#auth=${sessionToken}`);
}

export default http;
