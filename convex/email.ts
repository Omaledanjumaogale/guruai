import { v } from "convex/values";
import { action } from "./_generated/server";

/**
 * Email engine — Resend. Used for the super-admin test email and future
 * workflow notifications (agents, alerts).
 */

export const sendEmail = action({
	args: { to: v.string(), subject: v.string(), html: v.string(), from: v.optional(v.string()) },
	handler: async (ctx, { to, subject, html, from }) => {
		const key = process.env.RESEND_API_KEY;
		if (!key) throw new Error("RESEND_API_KEY is not configured on this deployment.");
		const res = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
			body: JSON.stringify({
				from: from ?? "Guru AI <onboarding@resend.dev>",
				to: [to],
				subject,
				html
			})
		});
		if (!res.ok) throw new Error(`Resend failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
		const data = await res.json();
		return { id: data.id ?? null, ok: true };
	}
});

export const sendTestEmail = action({
	args: { to: v.optional(v.string()) },
	handler: async (ctx, { to }) => {
		const target = to ?? process.env.SUPER_ADMIN_EMAIL;
		if (!target) throw new Error("No recipient: pass ?to or set SUPER_ADMIN_EMAIL.");
		const html = `
		<div style="font-family:Segoe UI,Arial,sans-serif;background:#0b1020;padding:32px;color:#e6ecff">
			<div style="max-width:560px;margin:auto;background:#111a33;border:1px solid #6366f1;border-radius:16px;padding:28px">
				<h1 style="margin:0 0 8px;font-size:22px">Guru <span style="background:linear-gradient(90deg,#818cf8,#22d3ee);-webkit-background-clip:text;color:transparent">AI</span></h1>
				<p style="color:#94a3b8;font-size:14px">Test email from your harmonized enterprise AI workspace.</p>
				<hr style="border:none;border-top:1px solid #22305c;margin:18px 0"/>
				<p style="font-size:14px;line-height:1.7">
					<strong>Email engine:</strong> Resend — live and connected.<br/>
					<strong>Backend:</strong> Convex (brave-bullfrog-719).<br/>
					<strong>Frontend:</strong> Cloudflare Pages.<br/>
					<strong>Ecosystem:</strong> E WIN Project Ecosystem.
				</p>
				<p style="color:#64748b;font-size:12px;margin-top:20px">Sent automatically by Guru AI — you can reply to nothing, this is a test.</p>
			</div>
		</div>`;
		const res = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: { authorization: `Bearer ${process.env.RESEND_API_KEY ?? ""}`, "content-type": "application/json" },
			body: JSON.stringify({ from: "Guru AI <onboarding@resend.dev>", to: [target], subject: "Guru AI — test email (email engine live)", html })
		});
		if (!res.ok) throw new Error(`Resend failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
		const data = await res.json();
		return { id: data.id ?? null, to: target };
	}
});
