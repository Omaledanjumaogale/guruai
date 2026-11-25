import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { chatWithConnector } from "./ai";
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

export const fetchTranscript = action({
	args: { workspaceId: v.id("workspaces"), url: v.string(), language: v.optional(v.string()) },
	handler: async (ctx, { workspaceId, url, language }) => {
		const videoId = extractVideoId(url);
		if (!videoId) throw new Error("Could not read a YouTube video id from that input. Paste a full youtube.com/youtu.be URL or an 11-character video id.");
		const lang = language || "en";

		// Attempt the timedtext endpoints (several shapes; some videos restrict captions).
		const candidates = [
			`https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=vtt`,
			`https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}`,
			`https://video.google.com/timedtext?lang=${lang}&v=${videoId}`
		];
		let parsed: { segments: { start: number; text: string }[]; text: string } | null = null;
		let used = "";
		for (const endpoint of candidates) {
			try {
				const res = await fetch(endpoint, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } });
				if (!res.ok) continue;
				const body = await res.text();
				if (!body || body.length < 40) continue;
				const p = parseTimedtext(body.includes("<transcript") || body.includes("<text") ? body : body.replace(/WEBVTT[\s\S]*?\n\n/, "").replace(/-->[\s\S]*?\n/g, "").includes("<") ? body : vttToXml(body));
				if (p.text.length > 60) {
					parsed = p;
					used = endpoint;
					break;
				}
			} catch {
				continue;
			}
		}
		if (!parsed) {
			throw new Error("No captions available for this video through the public timedtext endpoints. You can paste the transcript manually — the module stores, formats and summarizes pasted transcripts too.");
		}
		const titleRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`).catch(() => null);
		const title = titleRes && titleRes.ok ? (await titleRes.json()).title ?? videoId : videoId;
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
		const conn = await ctx.runQuery(internal.connectors.findForProvider, { workspaceId, provider: provider ?? "openai" });
		if (!conn) throw new Error("Add a chat connector first to summarize.");
		const out = await chatWithConnector(conn as any, [
			{ role: "system", content: "Summarize the transcript into: 1) a 3-sentence abstract, 2) five key takeaways as bullet points, 3) action items if any. Plain markdown." },
			{ role: "user", content: content.slice(0, 14000) }
		], model ?? "");
		return out.text;
	}
});
