# Setup Guide

This guide will help you complete the setup of your Realtime Messaging App.

## Prerequisites Completed ✅

The following have already been set up:

- ✅ Next.js project with TypeScript and Tailwind CSS
- ✅ shadcn/ui components installed
- ✅ Convex client library installed
- ✅ Clerk authentication library installed
- ✅ Project structure created
- ✅ Environment variables template created

## Next Steps

You need to complete the following steps to get the app running:

### 1. Set Up Convex

1. Run the Convex development server:

```bash
npx convex dev
```

2. Follow the prompts:
   - Log in to Convex (or create an account)
   - Create a new project or select an existing one
   - The CLI will automatically add `NEXT_PUBLIC_CONVEX_URL` to your `.env.local` file

3. Keep this terminal window open - it watches for changes to your Convex functions

### 2. Set Up Clerk

1. Go to [clerk.com](https://clerk.com) and sign up/log in

2. Create a new application:
   - Click "Create Application"
   - Name it "Realtime Messaging App"
   - Select authentication methods (Email, Google, GitHub recommended)
   - Click "Create Application"

3. Copy your API keys from the Clerk dashboard:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

4. Add them to your `.env.local` file:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

### 3. Configure Clerk Webhook (for user sync)

1. In Clerk Dashboard, go to "Webhooks" in the sidebar

2. Click "Add Endpoint"

3. For local development, you'll need to expose your local server:
   - Install ngrok: `npm install -g ngrok`
   - Run: `ngrok http 3000`
   - Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

4. Enter webhook URL: `https://your-ngrok-url.ngrok.io/api/clerk-webhook`

5. Subscribe to events:
   - `user.created`
   - `user.updated`

6. Copy the "Signing Secret" and add to `.env.local`:

```bash
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### 4. Configure Convex to Accept Clerk Tokens

1. In Convex Dashboard, go to your project settings

2. Click "Authentication" in the sidebar

3. Click "Add Provider" and select "Clerk"

4. Enter your Clerk domain:
   - Find this in Clerk Dashboard under "API Keys"
   - Format: `https://your-app.clerk.accounts.dev`

5. Click "Save"

### 5. Run the Application

1. Make sure the Convex dev server is running:

```bash
npx convex dev
```

2. In a new terminal, start the Next.js dev server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

4. You should see the sign-in page. Create an account to test!

## Verification Checklist

- [ ] Convex dev server is running without errors
- [ ] Next.js dev server is running without errors
- [ ] You can access the sign-in page at http://localhost:3000/sign-in
- [ ] You can create a new account
- [ ] After signing in, you see the main page with your user button
- [ ] Check Convex dashboard - you should see a new user record in the `users` table

## Troubleshooting

### Convex Connection Issues

- Make sure `NEXT_PUBLIC_CONVEX_URL` is set in `.env.local`
- Restart the Next.js dev server after adding environment variables
- Check that `npx convex dev` is running

### Clerk Authentication Issues

- Verify all Clerk environment variables are set correctly
- Make sure the Clerk domain is configured in Convex Dashboard
- Check that middleware.ts is in the root directory

### Webhook Not Working

- For local development, ensure ngrok is running
- Verify webhook secret matches in Clerk and `.env.local`
- Check webhook endpoint logs for errors in Clerk Dashboard
- The webhook endpoint will be created in task 2.2

## Your .env.local Should Look Like This

```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

## Next Tasks

Once setup is complete, the next tasks will implement:

- Task 2: Clerk authentication integration (webhook handler, user profile display)
- Task 3: Convex backend functions (queries and mutations)
- Task 4+: UI components and messaging features

## Need Help?

- Convex Documentation: https://docs.convex.dev
- Clerk Documentation: https://clerk.com/docs
- Next.js Documentation: https://nextjs.org/docs
- shadcn/ui Documentation: https://ui.shadcn.com
