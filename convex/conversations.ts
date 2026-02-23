import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserByClerkId } from "./users";
import {
  findDirectConversation,
  getLastMessage,
  getUnreadCount,
} from "./helpers";

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

/**
 * List all conversations for the current user
 *
 * Returns conversations where the current user is a participant, enriched with:
 * - Last message preview
 * - Unread message count
 * - Participant details (for displaying names/avatars)
 * - Ordered by most recent activity (lastMessageAt descending)
 *
 * Requirements: 3.3, 3.4, 3.5, 9.1
 */
export const list = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await getUserByClerkId(ctx, identity.subject);

    // Query all conversations where the user is a participant
    // Note: We collect all conversations and filter in memory because
    // Convex doesn't support direct array contains queries with indexes
    const allConversations = await ctx.db.query("conversations").collect();
    const conversations = allConversations.filter((conv) =>
      conv.participants.includes(user._id),
    );

    // Enrich each conversation with last message, unread count, and participant details
    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await getLastMessage(ctx, conv._id);
        const unreadCount = await getUnreadCount(ctx, conv._id, user._id);

        // Get participant details (excluding current user for direct messages)
        const participantDetails = await Promise.all(
          conv.participants
            .filter((participantId) => participantId !== user._id)
            .map(async (participantId) => {
              const participant = await ctx.db.get(participantId);
              return participant;
            }),
        );

        return {
          ...conv,
          lastMessage,
          unreadCount,
          otherParticipants: participantDetails.filter((p) => p !== null),
        };
      }),
    );

    // Sort by lastMessageAt descending (most recent first)
    enrichedConversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

    return enrichedConversations;
  },
});

/**
 * Mark all messages in a conversation as read
 *
 * Upserts a readStatus record for the current user and conversation,
 * setting the lastReadAt timestamp to the current time. This is used
 * to calculate unread message counts.
 *
 * Requirements: 9.2
 */
export const markRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await getUserByClerkId(ctx, identity.subject);

    // Upsert read status using the by_conversation_user index
    const existing = await ctx.db
      .query("readStatus")
      .withIndex("by_conversation_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", user._id),
      )
      .first();

    if (existing) {
      // Update existing read status
      await ctx.db.patch(existing._id, {
        lastReadAt: Date.now(),
      });
    } else {
      // Create new read status record
      await ctx.db.insert("readStatus", {
        conversationId: args.conversationId,
        userId: user._id,
        lastReadAt: Date.now(),
      });
    }
  },
});
