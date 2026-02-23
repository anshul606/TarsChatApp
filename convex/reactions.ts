import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserByClerkId } from "./users";

/**
 * Supported emoji set for reactions
 * Requirements: 12.1
 */
const SUPPORTED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

/**
 * Query to get all reactions for a message
 * Requirements: 12.4, 12.5
 */
export const getByMessage = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();

    return reactions;
  },
});

/**
 * Mutation to toggle a reaction on a message
 * Requirements: 12.1, 12.2, 12.3
 *
 * If the user has already reacted with this emoji, remove the reaction.
 * If the user has not reacted with this emoji, add the reaction.
 */
export const toggle = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Validate emoji is in supported set
    if (!SUPPORTED_EMOJIS.includes(args.emoji)) {
      throw new Error("Unsupported emoji");
    }

    const user = await getUserByClerkId(ctx, identity.subject);

    // Check if reaction already exists
    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_message_user", (q) =>
        q.eq("messageId", args.messageId).eq("userId", user._id),
      )
      .filter((q) => q.eq(q.field("emoji"), args.emoji))
      .first();

    if (existing) {
      // Remove reaction
      await ctx.db.delete(existing._id);
      return { action: "removed" };
    } else {
      // Add reaction
      await ctx.db.insert("reactions", {
        messageId: args.messageId,
        userId: user._id,
        emoji: args.emoji,
        createdAt: Date.now(),
      });
      return { action: "added" };
    }
  },
});
