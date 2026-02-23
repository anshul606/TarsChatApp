import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// Clerk webhook endpoint
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      return new Response("Missing CLERK_WEBHOOK_SECRET", { status: 500 });
    }

    // Get headers
    const svix_id = request.headers.get("svix-id");
    const svix_timestamp = request.headers.get("svix-timestamp");
    const svix_signature = request.headers.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    // Get body
    const body = await request.text();

    // Verify webhook
    const wh = new Webhook(WEBHOOK_SECRET);
    let evt: WebhookEvent;

    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as WebhookEvent;
    } catch (err) {
      console.error("Webhook verification failed:", err);
      return new Response("Webhook verification failed", { status: 400 });
    }

    // Handle the webhook
    const eventType = evt.type;

    if (eventType === "user.created" || eventType === "user.updated") {
      const { id, email_addresses, first_name, last_name, image_url } =
        evt.data;

      await ctx.runMutation(internal.users.upsertFromClerk, {
        clerkId: id,
        email: email_addresses[0]?.email_address ?? "",
        name: `${first_name ?? ""} ${last_name ?? ""}`.trim() || "Anonymous",
        imageUrl: image_url,
      });
    }

    return new Response("Webhook processed", { status: 200 });
  }),
});

export default http;
