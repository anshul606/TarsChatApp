import { query } from "./_generated/server";

// Debug query to check if authentication is working
export const checkAuth = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return {
        authenticated: false,
        message: "No authentication token found",
      };
    }

    return {
      authenticated: true,
      clerkId: identity.subject,
      email: identity.email,
      name: identity.name,
      message: "Authentication working!",
    };
  },
});
