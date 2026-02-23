import { v } from "convex/values";
import { query, mutation, MutationCtx } from "./_generated/server";
import { getUserByClerkId } from "./users";
import { clearTyping } from "./helpers";

/**
 * Query to list all messages in a conversation
 * Requirements: 3.1, 3.2
 */
export const list = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Verify user is participant in the conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const user = await getUserByClerkId(ctx, identity.subject);
    if (!conversation.participants.includes(user._id)) {
      throw new Error("Not a participant");
    }

    // Query messages ordered by createdAt ascending
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .collect();

    // Return messages with sender information
    const messagesWithSender = await Promise.all(
      messages.map(async (message) => {
        const sender = await ctx.db.get(message.senderId);
        return {
          ...message,
          sender,
        };
      }),
    );

    return messagesWithSender;
  },
});

/**
 * Mutation to send a new message in a conversation
 * Requirements: 3.2, 4.4
 */
export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
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

    // Insert message with senderId and timestamp
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: user._id,
      content: args.content,
      isDeleted: false,
      createdAt: Date.now(),
    });

    // Update conversation lastMessageAt
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
    });

    // Clear typing indicator for sender
    await clearTyping(ctx, args.conversationId, user._id);

    return messageId;
  },
});

/**
 * Mutation to soft delete a message
 * Requirements: 11.1, 11.2, 11.4
 */
export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await getUserByClerkId(ctx, identity.subject);
    const message = await ctx.db.get(args.messageId);

    if (!message) throw new Error("Message not found");

    // Verify user owns the message
    if (message.senderId !== user._id) {
      throw new Error("Can only delete own messages");
    }

    // Perform soft delete by setting isDeleted flag and store deletedAt timestamp
    await ctx.db.patch(args.messageId, {
      isDeleted: true,
      deletedAt: Date.now(),
    });
  },
});
