import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Automatically create a conversation with the developer for new users
 * This runs after a user is synced from Clerk
 */
export const createDeveloperConversation = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const DEVELOPER_EMAIL = "anshulbansal2406@gmail.com";

    console.log(`[AutoDevChat] Starting auto-create for user ${args.userId}`);

    // Get the developer user
    const developerUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), DEVELOPER_EMAIL))
      .first();

    if (!developerUser) {
      console.error(
        `[AutoDevChat] Developer user not found with email: ${DEVELOPER_EMAIL}`,
      );
      console.log("[AutoDevChat] Available users:");
      const allUsers = await ctx.db.query("users").collect();
      allUsers.forEach((u) => console.log(`  - ${u.email} (${u._id})`));
      return;
    }

    console.log(`[AutoDevChat] Found developer user: ${developerUser._id}`);

    // Don't create conversation if the new user IS the developer
    if (args.userId === developerUser._id) {
      console.log(
        "[AutoDevChat] New user is the developer, skipping auto-conversation",
      );
      return;
    }

    // Check if conversation already exists
    const allConversations = await ctx.db.query("conversations").collect();
    const existingConversation = allConversations.find((conv) => {
      return (
        !conv.isGroup &&
        conv.participants.length === 2 &&
        conv.participants.includes(args.userId) &&
        conv.participants.includes(developerUser._id)
      );
    });

    if (existingConversation) {
      console.log(
        `[AutoDevChat] Conversation with developer already exists: ${existingConversation._id}`,
      );
      return;
    }

    // Create new conversation with developer
    const conversationId = await ctx.db.insert("conversations", {
      participants: [args.userId, developerUser._id],
      isGroup: false,
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
    });

    console.log(`[AutoDevChat] Created conversation: ${conversationId}`);

    // Send welcome message from developer
    await ctx.db.insert("messages", {
      conversationId,
      senderId: developerUser._id,
      content:
        "👋 Hey! I'm Anshul, the developer of this app. Feel free to reach out if you have any questions or feedback!",
      createdAt: Date.now(),
      isDeleted: false,
    });

    console.log(
      `[AutoDevChat] Successfully created developer conversation for user ${args.userId}`,
    );
  },
});
