# Realtime Messaging App

A real-time messaging application built with Next.js (App Router), Convex, and Clerk.

## Features

- Real-time messaging with Convex subscriptions
- User authentication with Clerk (email and social providers)
- Direct messages and group chats
- Typing indicators and presence awareness
- Message reactions
- Responsive design for desktop and mobile

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend**: Convex (real-time database and backend)
- **Authentication**: Clerk

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn
- A Convex account (sign up at [convex.dev](https://convex.dev))
- A Clerk account (sign up at [clerk.com](https://clerk.com))

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up Convex:

```bash
npx convex dev
```

This will:

- Prompt you to log in to Convex
- Create a new project or select an existing one
- Generate a `.env.local` file with your `NEXT_PUBLIC_CONVEX_URL`
- Start watching your Convex functions

3. Set up Clerk:

- Go to [clerk.com](https://clerk.com) and create a new application
- Copy your API keys from the Clerk dashboard
- Add them to `.env.local`:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

4. Configure Clerk webhook (for user sync):

- In Clerk Dashboard, go to "Webhooks"
- Add endpoint: `http://localhost:3000/api/clerk-webhook` (for development)
- Subscribe to events: `user.created` and `user.updated`
- Copy the signing secret and add to `.env.local`:

```bash
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

5. Configure Convex to accept Clerk tokens:

- In Convex Dashboard, go to Settings → Authentication
- Add Clerk as a provider
- Enter your Clerk domain (found in Clerk Dashboard under API Keys)

### Running the App

1. Start the Convex dev server (in one terminal):

```bash
npx convex dev
```

2. Start the Next.js dev server (in another terminal):

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
realtime-messaging-app/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Home page
│   └── providers.tsx      # Convex provider setup
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── convex/               # Convex backend
│   ├── schema.ts         # Database schema
│   └── _generated/       # Auto-generated types
├── lib/                  # Utility functions
└── middleware.ts         # Clerk middleware for route protection
```

## Environment Variables

Create a `.env.local` file with the following variables:

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

## Development

- The Convex dev server watches for changes to your backend functions and automatically deploys them
- The Next.js dev server provides hot reloading for your frontend code
- All Convex functions are type-safe with auto-generated TypeScript types

## Deployment

1. Deploy Convex backend:

```bash
npx convex deploy
```

2. Update environment variables in your hosting platform (Vercel, Netlify, etc.)

3. Update Clerk webhook URL to point to your production domain

4. Deploy your Next.js app

## License

MIT
