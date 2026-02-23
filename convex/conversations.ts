import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getUserByClerkId } from "./users";
import { findDirectConversation } from "./helpers";

/**
 * Create a new conversation (direct message or group chat)
 *
 * For direct messages:
 * - Checks if a conversation already exists between the two users
 * - Returns existing conversation ID if found
 * - Creates new conversation if not found
 *
 * For group chats:
 * - Always creates a new conversation
 * - Requires a group name
 * - Supports 3 or more participants
 *
 * Requirements: 2.4, 2.5, 14.1, 14.2
 */
export const create = mutation({
  args: {
    participantIds: v.array(v.id("users")),
    isGroup: v.boolean(),
    groupName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await getUserByClerkId(ctx, identity.subject);

    // For direct messages, check if conversation already exists
    if (!args.isGroup && args.participantIds.length === 1) {
      const existing = await findDirectConversation(
        ctx,
        user._id,
        args.participantIds[0],
      );
      if (existing) return existing._id;
    }

    // Create new conversation
    const conversationId = await ctx.db.insert("conversations", {
      participants: [user._id, ...args.participantIds],
      isGroup: args.isGroup,
      groupName: args.groupName,
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
    });

    return conversationId;
  },
});
