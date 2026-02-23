import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { QueryCtx } from "./_generated/server";

// Internal mutation to create/update user (called by Clerk webhook)
export const upsertFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("users", {
        ...args,
        createdAt: Date.now(),
      });
    }
  },
});

// Query to list all users except current user
export const list = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const users = await ctx.db
      .query("users")
      .filter((q) => q.neq(q.field("clerkId"), identity.subject))
      .collect();

    return users;
  },
});

// Query to get current user
export const getCurrentUser = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    return user || null;
  },
});

// Helper function to get user by Clerk ID
export async function getUserByClerkId(ctx: QueryCtx, clerkId: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .first();

  if (!user) throw new Error("User not found");
  return user;
}

// Query to get a user by ID
export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db.get(args.userId);
    return user;
  },
});
