import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getUserByClerkId } from "./users";

/**
 * Mutation to mark messages as delivered
 * Requirements: 11.3, 11.4, 16.1, 16.2, 16.3, 16.4
 *
 * Marks all undelivered messages in a conversation as delivered for the current user.
 * This is called when a user opens a conversation.
 */
export const markAsDelivered = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await getUserByClerkId(ctx, identity.subject);

    // Verify user is participant in conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.participants.includes(user._id)) {
      throw new Error("Not a participant");
    }

    // Get all messages in the conversation
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    // Filter messages that:
    // 1. Were not sent by the current user
    // 2. Don't already have a delivery status for this user
    const deliveryPromises = messages.map(async (message) => {
      // Skip messages sent by current user
      if (message.senderId === user._id) return null;

      // Check if delivery status already exists
      const existingDelivery = await ctx.db
        .query("messageDeliveryStatus")
        .withIndex("by_message_user", (q) =>
          q.eq("messageId", message._id).eq("userId", user._id),
        )
        .unique();

      // If no delivery status exists, create one
      if (!existingDelivery) {
        return ctx.db.insert("messageDeliveryStatus", {
          messageId: message._id,
          userId: user._id,
          deliveredAt: Date.now(),
        });
      }

      return null;
    });

    await Promise.all(deliveryPromises);

    return { success: true };
  },
});

/**
 * Mutation to mark a message as read
 * Requirements: 12.3, 12.4, 17.1, 17.2, 17.3, 17.4
 *
 * Marks a specific message as read by the current user.
 * This is called when a message becomes visible in the viewport for at least 1 second.
 * Also updates the conversation's readStatus to keep unread counts in sync.
 */
export const markAsRead = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await getUserByClerkId(ctx, identity.subject);

    // Get the message
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // Verify user is participant in the conversation
    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation || !conversation.participants.includes(user._id)) {
      throw new Error("Not a participant");
    }

    // Skip if user is the sender
    if (message.senderId === user._id) {
      return { success: true, skipped: true };
    }

    const now = Date.now();

    // Check if read status already exists
    const existingRead = await ctx.db
      .query("messageReadStatus")
      .withIndex("by_message_user", (q) =>
        q.eq("messageId", args.messageId).eq("userId", user._id),
      )
      .unique();

    // If no read status exists, create one
    if (!existingRead) {
      await ctx.db.insert("messageReadStatus", {
        messageId: args.messageId,
        userId: user._id,
        readAt: now,
      });
    }

    // Update the conversation's readStatus to keep unread counts in sync
    // This ensures the sidebar unread badge updates in real-time
    const conversationReadStatus = await ctx.db
      .query("readStatus")
      .withIndex("by_conversation_user", (q) =>
        q.eq("conversationId", message.conversationId).eq("userId", user._id),
      )
      .first();

    if (conversationReadStatus) {
      // Only update if this message is newer than the current lastReadAt
      if (message.createdAt > conversationReadStatus.lastReadAt) {
        await ctx.db.patch(conversationReadStatus._id, {
          lastReadAt: message.createdAt,
        });
      }
    } else {
      // Create new read status record
      await ctx.db.insert("readStatus", {
        conversationId: message.conversationId,
        userId: user._id,
        lastReadAt: message.createdAt,
      });
    }

    return { success: true };
  },
});

/**
 * Query to get message delivery status
 * Requirements: 11.3, 14.1, 14.2, 20.3
 *
 * Returns delivery status for all recipients of a message.
 * Calculates if all recipients have received the message.
 *
 * Edge cases handled:
 * - Users removed from group: Only count current participants as recipients
 */
export const getDeliveryStatus = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await getUserByClerkId(ctx, identity.subject);

    // Get the message
    const message = await ctx.db.get(args.messageId);
    if (!message) return null;

    // Get the conversation
    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation) return null;

    // Verify user is participant
    if (!conversation.participants.includes(user._id)) {
      throw new Error("Not a participant");
    }

    // Get all delivery statuses for this message
    const deliveryStatuses = await ctx.db
      .query("messageDeliveryStatus")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();

    // Get recipients (all CURRENT participants except the sender)
    // This handles users who were removed from the group
    const recipients = conversation.participants.filter(
      (participantId) => participantId !== message.senderId,
    );

    // Filter delivery statuses to only include current participants
    const validDeliveryStatuses = deliveryStatuses.filter((status) =>
      recipients.includes(status.userId),
    );

    // Calculate if all current recipients have received the message
    const allDelivered = recipients.length === validDeliveryStatuses.length;

    return {
      deliveryStatuses: validDeliveryStatuses,
      totalRecipients: recipients.length,
      deliveredCount: validDeliveryStatuses.length,
      allDelivered,
    };
  },
});

/**
 * Query to get message read status
 * Requirements: 12.3, 14.1, 14.2, 20.3
 *
 * Returns read status for all recipients of a message.
 * Calculates if all recipients have read the message.
 *
 * Edge cases handled:
 * - Users removed from group: Only count current participants as recipients
 */
export const getReadStatus = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await getUserByClerkId(ctx, identity.subject);

    // Get the message
    const message = await ctx.db.get(args.messageId);
    if (!message) return null;

    // Get the conversation
    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation) return null;

    // Verify user is participant
    if (!conversation.participants.includes(user._id)) {
      throw new Error("Not a participant");
    }

    // Get all read statuses for this message
    const readStatuses = await ctx.db
      .query("messageReadStatus")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();

    // Get recipients (all CURRENT participants except the sender)
    // This handles users who were removed from the group
    const recipients = conversation.participants.filter(
      (participantId) => participantId !== message.senderId,
    );

    // Filter read statuses to only include current participants
    const validReadStatuses = readStatuses.filter((status) =>
      recipients.includes(status.userId),
    );

    // Calculate if all current recipients have read the message
    const allRead = recipients.length === validReadStatuses.length;

    return {
      readStatuses: validReadStatuses,
      totalRecipients: recipients.length,
      readCount: validReadStatuses.length,
      allRead,
    };
  },
});

/**
 * Query to get tick status for a direct message
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 20.3
 *
 * Returns the tick status for a message in a direct conversation.
 * - "sent": Message sent to server but not delivered
 * - "delivered": Message delivered but not read
 * - "read": Message has been read
 *
 * Edge cases handled:
 * - Messages sent before read receipt system: Show as "sent" (no delivery/read records)
 * - Deleted messages: Return null if message doesn't exist
 */
export const getDirectMessageTickStatus = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await getUserByClerkId(ctx, identity.subject);

    // Get the message
    const message = await ctx.db.get(args.messageId);
    if (!message) return null; // Handle deleted messages

    // Only show tick status for messages sent by current user
    if (message.senderId !== user._id) {
      return null;
    }

    // Get the conversation
    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation) return null;

    // Verify this is a direct message (not a group)
    if (conversation.isGroup) {
      return null;
    }

    // Get the recipient (the other participant)
    const recipient = conversation.participants.find(
      (participantId) => participantId !== user._id,
    );

    if (!recipient) return null;

    // Check if read status exists
    const readStatus = await ctx.db
      .query("messageReadStatus")
      .withIndex("by_message_user", (q) =>
        q.eq("messageId", args.messageId).eq("userId", recipient),
      )
      .unique();

    if (readStatus) {
      return "read";
    }

    // Check if delivery status exists
    const deliveryStatus = await ctx.db
      .query("messageDeliveryStatus")
      .withIndex("by_message_user", (q) =>
        q.eq("messageId", args.messageId).eq("userId", recipient),
      )
      .unique();

    if (deliveryStatus) {
      return "delivered";
    }

    // No delivery or read status - message is just sent
    // This also handles messages sent before read receipt system was implemented
    return "sent";
  },
});

/**
 * Query to get tick status for a group message
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 20.3
 *
 * Returns the tick status for a message in a group conversation.
 * - "sent": Not all recipients have delivery status
 * - "delivered": All recipients have delivery status but not all have read status
 * - "read": All recipients have read status
 *
 * Edge cases handled:
 * - Messages sent before read receipt system: Show as "sent" (no delivery/read records)
 * - Users removed from group: Only count current participants as recipients
 * - Deleted messages: Return null if message doesn't exist
 */
export const getGroupMessageTickStatus = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await getUserByClerkId(ctx, identity.subject);

    // Get the message
    const message = await ctx.db.get(args.messageId);
    if (!message) return null; // Handle deleted messages

    // Only show tick status for messages sent by current user
    if (message.senderId !== user._id) {
      return null;
    }

    // Get the conversation
    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation) return null;

    // Verify this is a group message
    if (!conversation.isGroup) {
      return null;
    }

    // Get recipients (all CURRENT participants except the sender)
    // This handles the edge case where users were removed from the group
    const recipients = conversation.participants.filter(
      (participantId) => participantId !== message.senderId,
    );

    const totalRecipients = recipients.length;

    // If no recipients (shouldn't happen), return sent
    if (totalRecipients === 0) {
      return "sent";
    }

    // Get all read statuses for this message
    const readStatuses = await ctx.db
      .query("messageReadStatus")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();

    // Filter read statuses to only include current participants
    // This handles users who were removed from the group after reading
    const validReadStatuses = readStatuses.filter((status) =>
      recipients.includes(status.userId),
    );

    const readCount = validReadStatuses.length;

    // If all current recipients have read the message, return "read"
    if (readCount === totalRecipients) {
      return "read";
    }

    // Get all delivery statuses for this message
    const deliveryStatuses = await ctx.db
      .query("messageDeliveryStatus")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();

    // Filter delivery statuses to only include current participants
    const validDeliveryStatuses = deliveryStatuses.filter((status) =>
      recipients.includes(status.userId),
    );

    const deliveredCount = validDeliveryStatuses.length;

    // If all current recipients have delivery status, return "delivered"
    if (deliveredCount === totalRecipients) {
      return "delivered";
    }

    // Not all current recipients have delivery status, return "sent"
    // This also handles messages sent before read receipt system was implemented
    return "sent";
  },
});
