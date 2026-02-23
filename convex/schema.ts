import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - stores user profile information
  users: defineTable({
    clerkId: v.string(), // Clerk user ID (unique)
    email: v.string(), // User email
    name: v.string(), // Display name
    imageUrl: v.optional(v.string()), // Profile picture URL
    createdAt: v.number(), // Unix timestamp
  })
    .index("by_clerk_id", ["clerkId"]) // Fast lookup by Clerk ID
    .index("by_email", ["email"]), // Fast lookup by email

  // Conversations table - stores chat rooms (DM or group)
  conversations: defineTable({
    participants: v.array(v.id("users")), // Array of user IDs
    isGroup: v.boolean(), // true for group chats
    groupName: v.optional(v.string()), // Name for group chats
    createdAt: v.number(), // Unix timestamp
    lastMessageAt: v.number(), // For sorting conversations
  })
    .index("by_participant", ["participants"]) // Query by participant
    .index("by_last_message", ["lastMessageAt"]), // Sort by recent activity

  // Messages table - stores all messages
  messages: defineTable({
    conversationId: v.id("conversations"), // Parent conversation
    senderId: v.id("users"), // Who sent it
    content: v.string(), // Message text
    isDeleted: v.boolean(), // Soft delete flag
    deletedAt: v.optional(v.number()), // When deleted
    createdAt: v.number(), // Unix timestamp
  })
    .index("by_conversation", ["conversationId", "createdAt"]) // Get messages for conversation
    .index("by_sender", ["senderId"]), // Get messages by user

  // Reactions table - emoji reactions on messages
  reactions: defineTable({
    messageId: v.id("messages"), // Which message
    userId: v.id("users"), // Who reacted
    emoji: v.string(), // Emoji character
    createdAt: v.number(), // Unix timestamp
  })
    .index("by_message", ["messageId"]) // Get all reactions for message
    .index("by_message_user", ["messageId", "userId"]), // Check if user reacted

  // Typing indicators - who's currently typing
  typing: defineTable({
    conversationId: v.id("conversations"), // Which conversation
    userId: v.id("users"), // Who's typing
    lastTypedAt: v.number(), // Last keystroke timestamp
  })
    .index("by_conversation", ["conversationId", "lastTypedAt"]) // Get recent typers
    .index("by_conversation_user", ["conversationId", "userId"]), // Upsert typing status

  // Presence table - online/offline status
  presence: defineTable({
    userId: v.id("users"), // Which user
    isOnline: v.boolean(), // Online status
    lastSeenAt: v.number(), // Last activity timestamp
  }).index("by_user", ["userId"]), // One presence record per user

  // Read status - track what messages users have read
  readStatus: defineTable({
    conversationId: v.id("conversations"), // Which conversation
    userId: v.id("users"), // Which user
    lastReadAt: v.number(), // Timestamp of last read
  })
    .index("by_conversation_user", ["conversationId", "userId"]) // Upsert read status
    .index("by_user", ["userId"]), // Get all read status for user
});
