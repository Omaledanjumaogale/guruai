import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

export const create = mutation({
	args: { workspaceId: v.id("workspaces"), title: v.string(), model: v.string(), provider: v.string(), routedBy: v.optional(v.string()) },
	handler: async (ctx, args) => {
		const now = Date.now();
		const id = await ctx.db.insert("chats", { ...args, pinned: false, archived: false, createdAt: now, updatedAt: now });
		return id;
	}
});

export const list = query({
	args: { workspaceId: v.id("workspaces"), archived: v.optional(v.boolean()) },
	handler: async (ctx, { workspaceId, archived }) =>
		await ctx.db
			.query("chats")
			.withIndex("by_workspace_updated", (q) => q.eq("workspaceId", workspaceId))
			.order("desc")
			.filter((q) => q.eq(q.field("archived"), archived ?? false))
			.collect()
});

export const get = query({
	args: { id: v.id("chats") },
	handler: async (ctx, { id }) => await ctx.db.get(id)
});

export const rename = mutation({
	args: { id: v.id("chats"), title: v.string() },
	handler: async (ctx, { id, title }) => {
		await ctx.db.patch(id, { title, updatedAt: Date.now() });
	}
});

export const setPinned = mutation({
	args: { id: v.id("chats"), pinned: v.boolean() },
	handler: async (ctx, { id, pinned }) => {
		await ctx.db.patch(id, { pinned, updatedAt: Date.now() });
	}
});

export const setArchived = mutation({
	args: { id: v.id("chats"), archived: v.boolean() },
	handler: async (ctx, { id, archived }) => {
		await ctx.db.patch(id, { archived, updatedAt: Date.now() });
	}
});

export const remove = mutation({
	args: { id: v.id("chats") },
	handler: async (ctx, { id }) => {
		const msgs = await ctx.db.query("messages").withIndex("by_chat", (q) => q.eq("chatId", id)).collect();
		for (const m of msgs) await ctx.db.delete(m._id);
		await ctx.db.delete(id);
	}
});

export const addMessage = mutation({
	args: { chatId: v.id("chats"), workspaceId: v.id("workspaces"), role: v.string(), content: v.string(), model: v.optional(v.string()), tokens: v.optional(v.number()) },
	handler: async (ctx, args) => {
		const id = await ctx.db.insert("messages", { ...args, createdAt: Date.now() });
		await ctx.db.patch(args.chatId, { updatedAt: Date.now() });
		return id;
	}
});

export const messagesFor = query({
	args: { chatId: v.id("chats") },
	handler: async (ctx, { chatId }) =>
		await ctx.db
			.query("messages")
			.withIndex("by_chat", (q) => q.eq("chatId", chatId))
			.order("asc")
			.collect()
});

/** Append the model answer and auto-title empty chats. */
export const appendAssistant = mutation({
	args: { chatId: v.id("chats"), workspaceId: v.id("workspaces"), content: v.string(), model: v.string(), tokens: v.optional(v.number()) },
	handler: async (ctx, { chatId, workspaceId, content, model, tokens }) => {
		await ctx.db.insert("messages", { chatId, workspaceId, role: "assistant", content, model, tokens, createdAt: Date.now() });
		const chat = await ctx.db.get(chatId);
		if (chat && (chat.title === "New chat" || !chat.title)) {
			const title = content.replace(/\s+/g, " ").trim().slice(0, 48) || "New chat";
			await ctx.db.patch(chatId, { title });
		}
		await ctx.db.patch(chatId, { updatedAt: Date.now() });
	}
});

export const logUsage = internalMutation({
	args: { workspaceId: v.id("workspaces"), ok: v.boolean() },
	handler: async (ctx, { workspaceId, ok }) => {
		await ctx.db.insert("usageEvents", { workspaceId, module: "chat", action: "send", ok, createdAt: Date.now() });
	}
});
