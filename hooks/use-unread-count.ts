import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { updateFaviconBadge } from "@/lib/favicon-badge";

/**
 * Hook to track unread conversations and update favicon badge
 */
export function useUnreadCount() {
  const conversations = useQuery(api.conversations.list);

  useEffect(() => {
    if (!conversations) return;

    // Count conversations with unread messages (unreadCount > 0)
    const unreadConversations = conversations.filter(
      (conv) => conv.unreadCount > 0,
    ).length;

    // Update favicon badge
    updateFaviconBadge(unreadConversations);

    // Update document title
    if (unreadConversations > 0) {
      document.title = `(${unreadConversations}) Messages`;
    } else {
      document.title = "Messages";
    }

    // Cleanup on unmount
    return () => {
      updateFaviconBadge(0);
      document.title = "Messages";
    };
  }, [conversations]);

  return conversations?.filter((conv) => conv.unreadCount > 0).length || 0;
}
