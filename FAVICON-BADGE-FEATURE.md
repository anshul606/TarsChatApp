# Favicon Badge Feature

## What It Does

The favicon (browser tab icon) now shows a red badge with the number of conversations that have unread messages.

### Features:

- 🔴 Red badge appears when you have unread conversations
- 🔢 Shows count (1, 2, 3, etc.)
- 📊 Updates in real-time as messages come in
- 📱 Also updates the browser tab title: "(3) Messages"
- ✨ Automatically clears when all messages are read

### Examples:

- No unread messages: Blue message icon (no badge)
- 1 unread conversation: Blue icon with red "1" badge
- 3 unread conversations: Blue icon with red "3" badge
- 99+ unread: Shows "99+" badge

## How It Works

1. **Tracks unread conversations** - Counts conversations where `unreadCount > 0`
2. **Updates favicon** - Draws a dynamic favicon with badge using Canvas API
3. **Updates tab title** - Shows "(3) Messages" when you have unread chats
4. **Real-time updates** - Automatically updates as messages arrive

## Files Added

- `lib/favicon-badge.ts` - Utility to draw favicon with badge
- `hooks/use-unread-count.ts` - Hook to track unread count
- Updated `app/page.tsx` - Integrated the unread count hook

## Technical Details

The badge is drawn using HTML5 Canvas:

- Base icon: Blue message bubble
- Badge: Red circle with white text
- Position: Bottom-right corner
- Max display: 99+ for large numbers

## Browser Support

Works in all modern browsers that support:

- Canvas API
- Dynamic favicon updates
- Chrome, Firefox, Safari, Edge

Note: Some browsers may cache favicons, so changes might take a moment to appear.
