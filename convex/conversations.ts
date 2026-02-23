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
      ownerId: args.isGroup ? user._id : undefined,
      admins: args.isGroup ? [] : undefined,
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
    try {
      const identity = await ctx.auth.getUserIdentity();

      // Return empty array if not authenticated (happens during logout)
      if (!identity) {
        return [];
      }

      // Try to get user, return empty array if not found yet (user still syncing)
      let user;
      try {
        user = await getUserByClerkId(ctx, identity.subject);
      } catch (error) {
        // User not synced yet, return empty array
        console.log("User not synced yet:", identity.subject);
        return [];
      }

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

      // Pin developer chat to top (anshulbansal2406@gmail.com)
      const DEVELOPER_EMAIL = "anshulbansal2406@gmail.com";
      const developerUser = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("email"), DEVELOPER_EMAIL))
        .first();

      if (developerUser) {
        // Move developer's direct chat to the top
        const developerChatIndex = enrichedConversations.findIndex(
          (conv) =>
            !conv.isGroup && conv.participants.includes(developerUser._id),
        );

        if (developerChatIndex > 0) {
          const [developerChat] = enrichedConversations.splice(
            developerChatIndex,
            1,
          );
          enrichedConversations.unshift(developerChat);
        }
      }

      return enrichedConversations;
    } catch (error) {
      console.error("[conversations:list] Unexpected error:", error);
      // Return empty array on any error to prevent UI crashes
      return [];
    }
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

    // Return null if not authenticated (happens during logout)
    if (!identity) {
      return null;
    }

    // Try to get user, return null if not found yet (user still syncing)
    let user;
    try {
      user = await getUserByClerkId(ctx, identity.subject);
    } catch (error) {
      // User not synced yet
      console.log("User not synced yet:", identity.subject);
      return null;
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    // Return null if user is not a participant (instead of throwing error)
    // This allows the frontend to handle removed/left users gracefully
    if (!conversation.participants.includes(user._id)) {
      return null;
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
 * Add a member to an existing group conversation (owner or admin only)
 *
 * Only works for group conversations. Adds the specified user to the
 * participants array if they're not already a member. Only the owner
 * or admins can add members.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 18.2, 18.3, 18.4, 18.5
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

    // Verify current user is owner or admin
    const admins = conversation.admins || [];
    const isOwner = conversation.ownerId === currentUser._id;
    const isAdmin = admins.includes(currentUser._id);

    if (!isOwner && !isAdmin) {
      throw new Error("Only the group owner or admins can add members");
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
 * For group conversations, only the owner can delete. For direct messages, any participant can delete.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 18.1, 18.3, 18.4, 18.5
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

    // For group conversations, only the owner can delete
    if (conversation.isGroup && conversation.ownerId !== user._id) {
      throw new Error("Only the group owner can delete the group");
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

    // Delete message delivery status records
    for (const message of messages) {
      const deliveryStatuses = await ctx.db
        .query("messageDeliveryStatus")
        .withIndex("by_message", (q) => q.eq("messageId", message._id))
        .collect();

      for (const deliveryStatus of deliveryStatuses) {
        await ctx.db.delete(deliveryStatus._id);
      }

      // Delete message read status records
      const messageReadStatuses = await ctx.db
        .query("messageReadStatus")
        .withIndex("by_message", (q) => q.eq("messageId", message._id))
        .collect();

      for (const messageReadStatus of messageReadStatuses) {
        await ctx.db.delete(messageReadStatus._id);
      }
    }

    // Finally, delete the conversation itself
    await ctx.db.delete(args.conversationId);

    return { success: true };
  },
});

/**
 * Remove a member from a group conversation (owner only)
 *
 * Only the group owner can remove members. The owner cannot remove themselves.
 * Removes the specified user from the participants array and also from admins if applicable.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 18.1, 18.3, 18.4, 18.5
 */
export const removeMember = mutation({
  args: {
    conversationId: v.id("conversations"),
    userIdToRemove: v.id("users"),
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

    // Verify it's a group conversation
    if (!conversation.isGroup) {
      throw new Error("Can only remove members from group conversations");
    }

    // Verify current user is the owner
    if (conversation.ownerId !== currentUser._id) {
      throw new Error("Only the group owner can remove members");
    }

    // Prevent owner from removing themselves
    if (args.userIdToRemove === currentUser._id) {
      throw new Error("Owner cannot remove themselves from the group");
    }

    // Check if user is a participant
    if (!conversation.participants.includes(args.userIdToRemove)) {
      throw new Error("User is not a member of this group");
    }

    // Remove user from participants
    const updatedParticipants = conversation.participants.filter(
      (id) => id !== args.userIdToRemove,
    );

    // Remove user from admins if they are an admin
    const updatedAdmins = conversation.admins
      ? conversation.admins.filter((id) => id !== args.userIdToRemove)
      : [];

    // Update the conversation
    await ctx.db.patch(args.conversationId, {
      participants: updatedParticipants,
      admins: updatedAdmins,
    });

    return { success: true };
  },
});

/**
 * Promote a member to admin (owner only)
 *
 * Only the group owner can promote members to admin. The user must be a participant
 * and not already an admin.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 18.1, 18.3, 18.4, 18.5
 */
export const promoteToAdmin = mutation({
  args: {
    conversationId: v.id("conversations"),
    userIdToPromote: v.id("users"),
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

    // Verify it's a group conversation
    if (!conversation.isGroup) {
      throw new Error("Can only promote members in group conversations");
    }

    // Verify current user is the owner
    if (conversation.ownerId !== currentUser._id) {
      throw new Error("Only the group owner can promote members to admin");
    }

    // Check if user is a participant
    if (!conversation.participants.includes(args.userIdToPromote)) {
      throw new Error("User is not a member of this group");
    }

    // Check if user is already an admin
    const admins = conversation.admins || [];
    if (admins.includes(args.userIdToPromote)) {
      throw new Error("User is already an admin");
    }

    // Add user to admins
    await ctx.db.patch(args.conversationId, {
      admins: [...admins, args.userIdToPromote],
    });

    return { success: true };
  },
});

/**
 * Change group name (owner or admin only)
 *
 * Allows the group owner or any admin to change the group name. The name must
 * not be empty and must be under 100 characters.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 18.2, 18.3, 18.4, 18.5
 */
export const changeGroupName = mutation({
  args: {
    conversationId: v.id("conversations"),
    newName: v.string(),
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

    // Verify it's a group conversation
    if (!conversation.isGroup) {
      throw new Error("Can only change name for group conversations");
    }

    // Validate name is not empty
    if (!args.newName || !args.newName.trim()) {
      throw new Error("Group name cannot be empty");
    }

    // Validate name length
    if (args.newName.length > 100) {
      throw new Error("Group name cannot exceed 100 characters");
    }

    // Verify current user is owner or admin
    const admins = conversation.admins || [];
    const isOwner = conversation.ownerId === currentUser._id;
    const isAdmin = admins.includes(currentUser._id);

    if (!isOwner && !isAdmin) {
      throw new Error(
        "Only the group owner or admins can change the group name",
      );
    }

    // Update the group name
    await ctx.db.patch(args.conversationId, {
      groupName: args.newName.trim(),
    });

    return { success: true };
  },
});
/**
 * Leave a group conversation
 *
 * Allows any member (including owner and admins) to leave a group. When leaving:
 * - User is removed from participants array
 * - User is removed from admins array if applicable
 * - If the leaving user is the owner, ownership is transferred:
 *   - To the longest-serving admin if admins exist
 *   - To the longest-serving member if no admins exist
 *   - Group is deleted if the owner is the last member
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4
 */
export const leaveGroup = mutation({
  args: {
    conversationId: v.id("conversations"),
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

    // Verify it's a group conversation
    if (!conversation.isGroup) {
      throw new Error("Can only leave group conversations");
    }

    // Verify user is a participant
    if (!conversation.participants.includes(currentUser._id)) {
      throw new Error("Not a member of this group");
    }

    const isOwner = conversation.ownerId === currentUser._id;
    const isLastMember = conversation.participants.length === 1;

    // If owner is leaving and is the last member, delete the group
    if (isOwner && isLastMember) {
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

      // Delete message delivery status records
      for (const message of messages) {
        const deliveryStatuses = await ctx.db
          .query("messageDeliveryStatus")
          .withIndex("by_message", (q) => q.eq("messageId", message._id))
          .collect();

        for (const deliveryStatus of deliveryStatuses) {
          await ctx.db.delete(deliveryStatus._id);
        }

        // Delete message read status records
        const messageReadStatuses = await ctx.db
          .query("messageReadStatus")
          .withIndex("by_message", (q) => q.eq("messageId", message._id))
          .collect();

        for (const messageReadStatus of messageReadStatuses) {
          await ctx.db.delete(messageReadStatus._id);
        }
      }

      // Finally, delete the conversation itself
      await ctx.db.delete(args.conversationId);

      return { success: true, deleted: true };
    }

    // Remove user from participants
    const updatedParticipants = conversation.participants.filter(
      (id) => id !== currentUser._id,
    );

    // Remove user from admins if they are an admin
    const admins = conversation.admins || [];
    const updatedAdmins = admins.filter((id) => id !== currentUser._id);

    // Handle ownership transfer if the leaving user is the owner
    let newOwnerId = conversation.ownerId;
    if (isOwner) {
      // Check if there are admins remaining
      if (updatedAdmins.length > 0) {
        // Promote the longest-serving admin (first in the admins array)
        newOwnerId = updatedAdmins[0];
        // Remove the new owner from the admins array
        updatedAdmins.shift();
      } else if (updatedParticipants.length > 0) {
        // Promote the longest-serving member (first in the participants array)
        newOwnerId = updatedParticipants[0];
      }
    }

    // Update the conversation
    await ctx.db.patch(args.conversationId, {
      participants: updatedParticipants,
      admins: updatedAdmins,
      ownerId: newOwnerId,
    });

    return { success: true, deleted: false };
  },
});
