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

    // Validate group chat requirements
    if (args.isGroup) {
      // Group name is required for group chats
      if (!args.groupName || !args.groupName.trim()) {
        throw new Error("Group name is required for group chats");
      }

      // Groups must have at least 2 other participants (3+ total including current user)
      if (args.participantIds.length < 2) {
        throw new Error("Groups must have at least 3 members");
      }
    }

    // For direct messages, check if conversation already exists
    if (!args.isGroup && args.participantIds.length === 1) {
      const existing = await findDirectConversation(
        ctx,
        user._id,
        args.participantIds[0],
      );
      if (existing) return existing._id;
    }

    // Create new conversation with current user included in participants
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

/**
 * Get a single conversation by ID
 *
 * Returns conversation details with participant information
 */
export const get = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await getUserByClerkId(ctx, identity.subject);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    // Verify user is a participant
    if (!conversation.participants.includes(user._id)) {
      throw new Error("Not a participant in this conversation");
    }

    // Get participant details (excluding current user)
    const participantDetails = await Promise.all(
      conversation.participants
        .filter((participantId) => participantId !== user._id)
        .map(async (participantId) => {
          const participant = await ctx.db.get(participantId);
          return participant;
        }),
    );

    return {
      ...conversation,
      otherParticipants: participantDetails.filter((p) => p !== null),
    };
  },
});

/**
 * Add a member to an existing group conversation
 *
 * Only works for group conversations. Adds the specified user to the
 * participants array if they're not already a member.
 *
 * Requirements: 14.6
 */
export const addMember = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const currentUser = await getUserByClerkId(ctx, identity.subject);

    // Get the conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Verify current user is a participant
    if (!conversation.participants.includes(currentUser._id)) {
      throw new Error("Not a participant in this conversation");
    }

    // Verify it's a group conversation
    if (!conversation.isGroup) {
      throw new Error("Can only add members to group conversations");
    }

    // Check if user is already a participant
    if (conversation.participants.includes(args.userId)) {
      throw new Error("User is already a member of this group");
    }

    // Add the user to participants
    await ctx.db.patch(args.conversationId, {
      participants: [...conversation.participants, args.userId],
    });

    return args.conversationId;
  },
});

/**
 * Delete a conversation
 *
 * Removes the conversation and all associated data (messages, reactions, typing indicators, read status).
 * Only participants can delete a conversation.
 */
export const deleteConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await getUserByClerkId(ctx, identity.subject);

    // Get the conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Verify user is a participant
    if (!conversation.participants.includes(user._id)) {
      throw new Error("Not a participant in this conversation");
    }

    // Delete all messages in the conversation
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    for (const message of messages) {
      // Delete reactions for this message
      const reactions = await ctx.db
        .query("reactions")
        .withIndex("by_message", (q) => q.eq("messageId", message._id))
        .collect();

      for (const reaction of reactions) {
        await ctx.db.delete(reaction._id);
      }

      // Delete the message
      await ctx.db.delete(message._id);
    }

    // Delete typing indicators for this conversation
    const typingIndicators = await ctx.db
      .query("typing")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    for (const typing of typingIndicators) {
      await ctx.db.delete(typing._id);
    }

    // Delete read status for this conversation
    const readStatuses = await ctx.db
      .query("readStatus")
      .withIndex("by_conversation_user", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    for (const readStatus of readStatuses) {
      await ctx.db.delete(readStatus._id);
    }

    // Finally, delete the conversation itself
    await ctx.db.delete(args.conversationId);

    return { success: true };
  },
});
