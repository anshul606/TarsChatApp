import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";

// NOTE: This webhook handler is deprecated in favor of the Convex HTTP endpoint
// at convex/http.ts. Configure your Clerk webhook to point to:
// https://your-deployment.convex.site/clerk-webhook
//
// This file is kept for reference but should not be used.

export async function POST(req: Request) {
  return new Response(
    "This endpoint is deprecated. Please use the Convex HTTP endpoint instead.",
    { status: 410 },
  );
}
