# Real-Time Messaging App

A modern, real-time messaging application built with Next.js, Convex, and Clerk.

## Features

- 💬 Real-time messaging
- 👥 Group chats with admin controls
- 😊 Emoji reactions
- ✅ Read receipts (WhatsApp-style)
- ⌨️ Typing indicators
- 🟢 Online presence status
- 🎨 Dark/Light mode
- 🔐 Secure authentication

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Convex (real-time database)
- **Auth**: Clerk
- **Styling**: Tailwind CSS, shadcn/ui
- **Deployment**: Vercel

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Environment Variables

Required environment variables are in `.env.local`:

- `NEXT_PUBLIC_CONVEX_URL` - Convex deployment URL
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `CLERK_SECRET_KEY` - Clerk secret key
- `CLERK_WEBHOOK_SECRET` - Clerk webhook secret

## License

MIT
