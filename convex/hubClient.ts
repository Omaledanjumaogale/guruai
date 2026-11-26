/** E-WIN central hub client.
 *
 * The hub runs Better Auth on a Convex site deployment. Guru AI verifies
 * credentials server-to-server and never stores the hub session token.
 */
export type HubIdentity = {
	id: string;
	email: string;
	name?: string;
	image?: string;
};

export class HubError extends Error {
	status: number;
	code: string;
	kind: "credentials" | "unverified" | "unreachable" | "response";
	constructor(message: string, opts: { status?: number; code?: string; kind?: HubError["kind"] }) {
		super(message);
		this.name = "HubError";
		this.status = opts.status ?? 0;
		this.code = opts.code ?? "HUB_ERROR";
		this.kind = opts.kind;
	}
}

const DEFAULT_HUB_SITE = "https://affable-dragon-883.eu-west-1.convex.site";
const DEFAULT_HUB_APP = "https://ewinproject.org";

export function hubSiteUrl(): string {
	return (process.env.EWIN_HUB_SITE_URL ?? DEFAULT_HUB_SITE).replace(/\/$/, "");
}

export function hubAppUrl(): string {
	return (process.env.EWIN_HUB_APP_URL ?? DEFAULT_HUB_APP).replace(/\/$/, "");
}

/** The hub can be switched off without changing code (e.g. local-only setups). */
export function hubConfigured(): boolean {
	return process.env.EWIN_HUB_DISABLED !== "1" && Boolean(hubSiteUrl());
}

type HubResponse = { data: any; headers: Headers };

async function hubRequest(path: string, init: RequestInit, timeoutMs = 9000): Promise<HubResponse> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const response = await fetch(hubSiteUrl() + path, {
			...init,
			headers: { Accept: "application/json", ...(init.headers ?? {}) },
			signal: controller.signal
		});
		const text = await response.text();
		let data: any = null;
		if (text) {
			try {
				data = JSON.parse(text);
			} catch {
				data = { message: text.slice(0, 240) };
			}
		}
		if (!response.ok) {
			const code = String(data?.code ?? data?.error?.code ?? "HUB_" + response.status);
			const raw = String(data?.message ?? data?.error?.message ?? "").trim();
			if (response.status === 401 || code === "INVALID_EMAIL_OR_PASSWORD" || code === "INVALID_PASSWORD") {
				throw new HubError("That email and password do not match your E-WIN Hub account.", {
					status: response.status,
					code,
					kind: "credentials"
				});
			}
			if (code === "EMAIL_NOT_VERIFIED" || response.status === 403) {
				throw new HubError("Verify your E-WIN email address, then sign in again.", {
					status: response.status,
					code,
					kind: "unverified"
				});
			}
			throw new HubError(raw || "E-WIN Hub could not complete the request.", {
				status: response.status,
				code,
				kind: "response"
			});
		}
		return { data, headers: response.headers };
	} catch (error) {
		if (error instanceof HubError) throw error;
		throw new HubError("E-WIN Hub could not be reached. Check your connection and try again.", {
			code: "HUB_UNREACHABLE",
			kind: "unreachable"
		});
	} finally {
		clearTimeout(timer);
	}
}

function identityFrom(payload: any): HubIdentity | null {
	const user = payload?.user ?? payload?.session?.user ?? payload;
	if (!user || typeof user !== "object" || typeof user.email !== "string") return null;
	const email = user.email.trim().toLowerCase();
	return {
		id: String(user.id ?? user._id ?? email),
		email,
		name: typeof user.name === "string" && user.name.trim() ? user.name.trim() : undefined,
		image: typeof user.image === "string" ? user.image : undefined
	};
}

export async function hubVerifySession(token: string): Promise<HubIdentity | null> {
	const { data } = await hubRequest("/api/auth/get-session", {
		method: "GET",
		headers: { Authorization: "Bearer " + token }
	});
	return identityFrom(data);
}

/** Verify credentials with the central hub and return the verified identity. */
export async function hubSignIn(email: string, password: string): Promise<HubIdentity> {
	const { data, headers } = await hubRequest("/api/auth/sign-in/email", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: email.trim().toLowerCase(), password })
	});
	const token = data?.token ?? data?.session?.token ?? headers.get("set-auth-token") ?? "";
	if (!token) {
		// Some Better Auth configurations return only the user for a cookie session.
		const direct = identityFrom(data);
		if (direct) return direct;
		throw new HubError("E-WIN Hub did not return a verifiable session. Try again.", {
			code: "HUB_NO_SESSION",
			kind: "response"
		});
	}
	const verified = await hubVerifySession(token);
	if (!verified) {
		throw new HubError("E-WIN Hub could not verify the session. Try again.", {
			code: "HUB_SESSION_INVALID",
			kind: "response"
		});
	}
	return verified;
}
