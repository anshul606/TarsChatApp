import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Find an existing direct conversation between two users
 * @param ctx - Query or mutation context
 * @param userId1 - First user ID
 * @param userId2 - Second user ID
 * @returns The conversation if found, null otherwise
 */
export async function findDirectConversation(
  ctx: QueryCtx | MutationCtx,
  userId1: Id<"users">,
  userId2: Id<"users">,
) {
  const conversations = await ctx.db.query("conversations").collect();

  // Find a conversation that:
  // 1. Is not a group (isGroup = false)
  // 2. Has exactly 2 participants
  // 3. Contains both user IDs
  const directConversation = conversations.find((conv) => {
    return (
      !conv.isGroup &&
      conv.participants.length === 2 &&
      conv.participants.includes(userId1) &&
      conv.participants.includes(userId2)
    );
  });

  return directConversation || null;
}

/**
 * Get the last message in a conversation
 * @param ctx - Query or mutation context
 * @param conversationId - The conversation ID
 * @returns The most recent message or null if no messages exist
 */
export async function getLastMessage(
  ctx: QueryCtx | MutationCtx,
  conversationId: Id<"conversations">,
) {
  const messages = await ctx.db
    .query("messages")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
    .order("desc")
    .take(1);

  return messages[0] || null;
}

/**
 * Get the count of unread messages for a user in a conversation
 * @param ctx - Query or mutation context
 * @param conversationId - The conversation ID
 * @param userId - The user ID
 * @returns The number of unread messages
 */
export async function getUnreadCount(
  ctx: QueryCtx | MutationCtx,
  conversationId: Id<"conversations">,
  userId: Id<"users">,
) {
  // Get the user's last read timestamp for this conversation
  const readStatus = await ctx.db
    .query("readStatus")
    .withIndex("by_conversation_user", (q) =>
      q.eq("conversationId", conversationId).eq("userId", userId),
    )
    .first();

  const lastReadAt = readStatus?.lastReadAt || 0;

  // Count messages in this conversation that:
  // 1. Were created after the last read timestamp
  // 2. Were not sent by the current user
  const messages = await ctx.db
    .query("messages")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
    .collect();

  const unreadCount = messages.filter(
    (msg) => msg.createdAt > lastReadAt && msg.senderId !== userId,
  ).length;

  return unreadCount;
}

/**
 * Clear typing indicator for a user in a conversation
 * @param ctx - Mutation context
 * @param conversationId - The conversation ID
 * @param userId - The user ID
 */
export async function clearTyping(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
  userId: Id<"users">,
) {
  const typingRecord = await ctx.db
    .query("typing")
    .withIndex("by_conversation_user", (q) =>
      q.eq("conversationId", conversationId).eq("userId", userId),
    )
    .first();

  if (typingRecord) {
    await ctx.db.delete(typingRecord._id);
  }
}
