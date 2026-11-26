import { v, ConvexError } from "convex/values";
import { internalAction } from "./_generated/server";

/**
 * Artwork pipeline — the deployment engine (Agnes AI) renders the promotional
 * imagery used across the landing page. Assets are generated once, exported to
 * WebP in the repository, and served statically from Cloudflare (never at runtime).
 */
export const draftArtwork = internalAction({
	args: { prompt: v.string(), size: v.optional(v.string()), model: v.optional(v.string()) },
	handler: async (_ctx, { prompt, size, model }) => {
		const key = process.env.AGNES_AI_KEY;
		if (!key) throw new ConvexError("AGNES_AI_KEY is not configured on this deployment.");
		const base = (process.env.AGNES_BASE_URL || "https://apihub.agnes-ai.com/v1").replace(/\/$/, "");
		const res = await fetch(`${base}/images/generations`, {
			method: "POST",
			headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
			body: JSON.stringify({
				model: model || "agnes-image-2.1-flash",
				prompt,
				n: 1,
				size: size || "1536x1024",
				response_format: "b64_json"
			})
		});
		const text = await res.text();
		if (!res.ok) throw new ConvexError(`Artwork engine returned ${res.status}: ${text.slice(0, 400)}`);
		let data: any;
		try {
			data = JSON.parse(text);
		} catch {
			throw new ConvexError(`Artwork engine returned unreadable JSON: ${text.slice(0, 200)}`);
		}
		const item = data?.data?.[0] ?? data?.[0] ?? {};
		return { b64: item.b64_json ?? null, url: item.url ?? null, model: model || "agnes-image-2.1-flash", revised: item.revised_prompt ?? null };
	}
});