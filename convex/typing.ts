import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getUserByClerkId } from "./users";
import { clearTyping } from "./helpers";

/**
 * Typing Indicators Backend API
 * Requirements: 8.1, 8.2, 8.4
 */

/**
 * Get currently typing users for a conversation
 * Filters to users who typed within the last 2 seconds
 */
export const get = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const now = Date.now();
    const twoSecondsAgo = now - 2000;

    // Get typing records from the last 2 seconds
    const typingRecords = await ctx.db
      .query("typing")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .filter((q) => q.gt(q.field("lastTypedAt"), twoSecondsAgo))
      .collect();

    // Enrich with user information
    const typingUsers = await Promise.all(
      typingRecords.map(async (record) => {
        const user = await ctx.db.get(record.userId);
        return {
          userId: record.userId,
          userName: user?.name || "Unknown",
          lastTypedAt: record.lastTypedAt,
        };
      }),
    );

    return typingUsers;
  },
});

/**
 * Update typing status for the current user
 * Sets isTyping=true to create/update typing record
 * Sets isTyping=false to clear typing record
 */
export const update = mutation({
  args: {
    conversationId: v.id("conversations"),
    isTyping: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await getUserByClerkId(ctx, identity.subject);

    if (args.isTyping) {
      // Upsert typing record
      const existing = await ctx.db
        .query("typing")
        .withIndex("by_conversation_user", (q) =>
          q.eq("conversationId", args.conversationId).eq("userId", user._id),
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          lastTypedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("typing", {
          conversationId: args.conversationId,
          userId: user._id,
          lastTypedAt: Date.now(),
        });
      }
    } else {
      // Clear typing record
      await clearTyping(ctx, args.conversationId, user._id);
    }
  },
});
