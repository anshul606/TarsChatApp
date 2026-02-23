import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Get the online status for a specific user
 */
export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const presence = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    return presence?.isOnline ?? false;
  },
});

/**
 * Update the current user's online/offline status
 */
export const update = mutation({
  args: { isOnline: v.boolean() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Check if presence record exists
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existing) {
      // Update existing presence record
      await ctx.db.patch(existing._id, {
        isOnline: args.isOnline,
        lastSeenAt: Date.now(),
      });
    } else {
      // Create new presence record
      await ctx.db.insert("presence", {
        userId: user._id,
        isOnline: args.isOnline,
        lastSeenAt: Date.now(),
      });
    }
  },
});
