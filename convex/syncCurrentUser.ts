import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Temporary mutation to manually sync current user from Clerk to Convex
// This is useful when the webhook hasn't been triggered yet
export const syncCurrentUser = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (existing) {
      return { message: "User already exists", userId: existing._id };
    }

    // Create new user from Clerk identity
    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: identity.email ?? "",
      name: identity.name ?? "Anonymous",
      imageUrl: identity.pictureUrl,
      createdAt: Date.now(),
    });

    console.log(`[ManualSync] Created new user: ${userId} (${identity.email})`);

    // Automatically create conversation with developer
    await ctx.scheduler.runAfter(
      0,
      internal.autoCreateDeveloperChat.createDeveloperConversation,
      {
        userId,
      },
    );

    console.log(
      `[ManualSync] Scheduled auto-create developer chat for user: ${userId}`,
    );

    return { message: "User created successfully", userId };
  },
});
