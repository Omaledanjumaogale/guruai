import { writable } from "svelte/store";

/** Guru AI identity: OAuth (Google/GitHub) or super-admin login. */
export type Account = { email: string; name: string; role: string; provider: string; avatarUrl?: string };

const TOKEN_KEY = "guru.auth.token";

export const account = writable<Account | null>(null);
/** Reactive copy of the bearer token so live queries re-subscribe on sign-in. */
export const session = writable<string>(typeof localStorage === "undefined" ? "" : (localStorage.getItem("guru.auth.token") ?? ""));
export const authLoading = writable(true);
/** Surfaced on the sign-in screen so failures are never silent. */
export const authError = writable<string>("");

export const httpSite = ((import.meta.env.VITE_CONVEX_URL as string) ?? "").replace(".convex.cloud", ".convex.site");

export function storedToken(): string {
	if (typeof localStorage === "undefined") return "";
	return localStorage.getItem(TOKEN_KEY) ?? "";
}

export const sessionToken = storedToken();

/** Human-readable message for anything thrown by the backend. */
export function describeError(e: unknown): string {
	// ConvexError carries the useful message in `data`; `message` is only "Server Error".
	const data = (e as { data?: unknown } | null)?.data;
	if (typeof data === "string" && data.trim()) return data.trim();
	if (data && typeof data === "object" && typeof (data as { message?: unknown }).message === "string") {
		return (data as { message: string }).message;
	}
	const raw = e instanceof Error ? e.message : String(e);
	const clean = raw
		.replace(/^ConvexError:\s*/i, "")
		.replace(/^\[Request ID:[^\]]*\]\s*/i, "")
		.replace(/\s*Called by client\.?/i, "")
		.replace(/Server Error\s*/i, "")
		.trim();
	return clean || "Something went wrong. Please try again.";
}

/** Parse #auth=<token> returned by the OAuth callback, then clean the URL. */
export function captureOAuthToken(): string | null {
	if (typeof window === "undefined") return null;
	const m = window.location.hash.match(/#auth=(gst_[a-f0-9]+)/);
	if (m) {
		localStorage.setItem(TOKEN_KEY, m[1]);
		session.set(m[1]);
		history.replaceState(null, "", window.location.pathname + window.location.search);
		return m[1];
	}
	return null;
}

export async function initAuth(): Promise<void> {
	captureOAuthToken();
	const token = localStorage.getItem(TOKEN_KEY);
	if (!token) {
		authLoading.set(false);
		return;
	}
	try {
		const { qq } = await import("./convex");
		const acc = await qq<Account | null>("auth.verify", { token });
		if (acc) {
			account.set(acc);
			session.set(token);
		} else {
			localStorage.removeItem(TOKEN_KEY);
			session.set("");
		}
	} catch {
		/* offline — keep token, retry later */
	}
	authLoading.set(false);
}

async function storeSession(res: { token: string; account?: Account; email?: string; role?: string }): Promise<Account> {
	localStorage.setItem(TOKEN_KEY, res.token);
	session.set(res.token);
	const acc: Account =
		res.account ?? { email: res.email ?? "", name: "Super Admin", role: res.role ?? "admin", provider: "password" };
	account.set(acc);
	authError.set("");
	return acc;
}

/** Email + password sign-in (members and super admin). */
export async function passwordLogin(email: string, password: string): Promise<Account> {
	authError.set("");
	const { ax } = await import("./convex");
	const res = await ax<{ token: string; account: Account }>("auth.passwordLogin", { email: email.trim(), password });
	return storeSession(res);
}

/** Create an email + password account. */
export async function registerAccount(email: string, password: string, name?: string): Promise<Account> {
	authError.set("");
	const { ax } = await import("./convex");
	const res = await ax<{ token: string; account: Account }>("auth.register", { email: email.trim(), password, name });
	return storeSession(res);
}

/** Super-admin sign-in (requires the configured admin account). */
export async function adminLogin(email: string, password: string): Promise<Account> {
	authError.set("");
	const { ax } = await import("./convex");
	const res = await ax<{ token: string; role: string; email: string }>("auth.adminLogin", { email: email.trim(), password });
	return storeSession(res);
}

export async function logout(): Promise<void> {
	const token = localStorage.getItem(TOKEN_KEY);
	if (token) {
		try {
			const { mx } = await import("./convex");
			await mx("auth.logout", { token });
		} catch {
			/* ignore */
		}
	}
	localStorage.removeItem(TOKEN_KEY);
	account.set(null);
	session.set("");
}

export function startOAuth(provider: "google" | "github") {
	if (!httpSite) return;
	window.location.href = `${httpSite}/oauth/${provider}/start`;
}
