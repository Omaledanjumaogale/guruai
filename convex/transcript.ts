import { v, ConvexError } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { chatWithConnector, loadConnector, connectorOrEnv } from "./ai";
import type { Id } from "./_generated/dataModel";

/** Transcript — harmonized with youtubetotranscript.com: fetch YouTube captions and summarize. */

function extractVideoId(input: string): string | null {
	try {
		const url = new URL(input.startsWith("http") ? input : `https://${input}`);
		if (url.hostname.includes("youtu.be")) return url.pathname.slice(1).split("/")[0] || null;
		const v = url.searchParams.get("v");
		if (v) return v;
		const m = url.pathname.match(/\/(?:shorts|embed|live)\/([\w-]{6,})/);
		return m ? m[1] : null;
	} catch {
		const bare = input.match(/^[\w-]{11}$/);
		return bare ? bare[0] : null;
	}
}

function decodeEntities(s: string): string {
	return s
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, " ")
		.replace(/\n/g, " ");
}

function parseTimedtext(xml: string): { segments: { start: number; text: string }[]; text: string } {
	const segments: { start: number; text: string }[] = [];
	for (const m of xml.matchAll(/<text start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g)) {
		const raw = decodeEntities(m[2]).replace(/<[^>]+>/g, "").trim();
		if (raw) segments.push({ start: parseFloat(m[1]), text: raw });
	}
	return { segments, text: segments.map((s) => s.text).join(" ").replace(/\s+/g, " ") };
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

type Seg = { start: number; text: string };

/** Read caption tracks from the watch page and pull YouTube's own json3 captions. */
async function fromPlayerResponse(videoId: string, lang: string): Promise<{ segments: Seg[]; text: string } | null> {
	try {
		const res = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=${lang}&gl=US&has_verified=1&bpctr=9999999999`, {
			headers: {
				"User-Agent": UA,
				"Accept-Language": `${lang},en;q=0.8`,
				// Consent + age gates otherwise redirect datacenter IPs to an interstitial page.
				Cookie: "CONSENT=YES+cb.20240101-00-p0.en+FX+000; SOCS=CAI; PREF=hl=en&gl=US"
			}
		});
		if (!res.ok) return null;
		const html = await res.text();
		if (!html.includes("timedtext")) return null;
		// YouTube embeds its player JSON inside a JS string, so quotes/ampersands arrive escaped.
		const decoded = html.replace(/\\"/g, '"').replace(/\\u0026/g, "&").replace(/&amp;/g, "&");
		const urls = [...decoded.matchAll(/"baseUrl":"(https:\/\/www\.youtube\.com\/api\/timedtext[^"]+)"/g)].map((m) => m[1]);
		if (urls.length === 0) return null;
		const pick = urls.find((u) => /[?&]lang=en/.test(u)) ?? urls[0];
		const jr = await fetch(`${pick}&fmt=json3`, { headers: { "User-Agent": UA } });
		if (!jr.ok) return null;
		const data: any = await jr.json();
		const segments: Seg[] = (data.events ?? [])
			.filter((e: any) => Array.isArray(e.segs))
			.map((e: any) => ({
				start: (e.tStartMs ?? 0) / 1000,
				text: e.segs.map((s: any) => s.utf8 ?? "").join("").replace(/\s+/g, " ").trim()
			}))
			.filter((s: Seg) => s.text.length > 0);
		if (segments.length === 0) return null;
		return { segments, text: segments.map((s) => s.text).join(" ").replace(/\s+/g, " ") };
	} catch {
		return null;
	}
}

export const fetchTranscript = action({
	args: { workspaceId: v.id("workspaces"), url: v.string(), language: v.optional(v.string()) },
	handler: async (ctx, { workspaceId, url, language }) => {
		const videoId = extractVideoId(url);
		if (!videoId) throw new ConvexError("Could not read a YouTube video id from that input. Paste a full youtube.com/youtu.be URL or an 11-character video id.");
		const lang = language || "en";

		let parsed = await fromPlayerResponse(videoId, lang);
		let used = parsed ? "player-response/json3" : "";

		// Fallback: the public timedtext endpoints (some videos serve captions there directly).
		if (!parsed) {
			const candidates = [
				`https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=vtt`,
				`https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}`,
				`https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
				`https://video.google.com/timedtext?lang=${lang}&v=${videoId}`
			];
			for (const endpoint of candidates) {
				try {
					const res = await fetch(endpoint, { headers: { "User-Agent": UA } });
					if (!res.ok) continue;
					const body = await res.text();
					if (!body || body.length < 40) continue;
					if (body.trimStart().startsWith("{")) {
						const data: any = JSON.parse(body);
						const segments: Seg[] = (data.events ?? [])
							.filter((e: any) => Array.isArray(e.segs))
							.map((e: any) => ({ start: (e.tStartMs ?? 0) / 1000, text: e.segs.map((s: any) => s.utf8 ?? "").join("").trim() }))
							.filter((s: Seg) => s.text);
						if (segments.length > 0) {
							parsed = { segments, text: segments.map((s) => s.text).join(" ").replace(/\s+/g, " ") };
							used = endpoint;
							break;
						}
						continue;
					}
					const p = parseTimedtext(body.includes("<transcript") || body.includes("<text") ? body : vttToXml(body));
					if (p.text.length > 60) {
						parsed = p;
						used = endpoint;
						break;
					}
				} catch {
					continue;
				}
			}
		}
		if (!parsed) {
			throw new ConvexError("YouTube returned no captions for this video. Captions may be disabled, or YouTube is blocking the fetch from our servers — paste the transcript text instead; this module also stores, searches and summarizes pasted transcripts.");
		}
		const titleRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`).catch(() => null);
		const title = titleRes && titleRes.ok ? ((await titleRes.json()).title ?? videoId) : videoId;
		await ctx.runMutation(internal.usage.record, { workspaceId, module: "transcript", action: "fetch", ok: true });
		return { videoId, url: `https://www.youtube.com/watch?v=${videoId}`, title, language: lang, content: parsed.text, segments: parsed.segments, via: used };
	}
});

/** Simple VTT → pseudo-XML conversion so one parser handles both. */
function vttToXml(vtt: string): string {
	const lines = vtt.split("\n");
	const out: string[] = ["<transcript>"];
	for (let i = 0; i < lines.length; i++) {
		const m = lines[i].match(/(\d+):(\d+):(\d+)\.\d+ -->/);
		if (m) {
			const start = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
			const text = (lines[i + 1] ?? "").trim();
			if (text) out.push(`<text start="${start}">${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`);
		}
	}
	out.push("</transcript>");
	return out.join("\n");
}

/** Summarize any transcript via the chat engine. */
export const summarizeTranscript = action({
	args: { workspaceId: v.id("workspaces"), content: v.string(), provider: v.optional(v.string()), model: v.optional(v.string()) },
	handler: async (ctx, { workspaceId, content, provider, model }) => {
		const conn = await loadConnector(ctx, workspaceId, provider ?? "openai");
		const out = await chatWithConnector(conn as any, [
			{ role: "system", content: "Summarize the transcript into: 1) a 3-sentence abstract, 2) five key takeaways as bullet points, 3) action items if any. Plain markdown." },
			{ role: "user", content: content.slice(0, 14000) }
		], model ?? "");
		return out.text;
	}
});