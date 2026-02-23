"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/**
 * TypingIndicator Component
 * Requirements: 8.1, 8.4
 *
 * Shows which users are currently typing in a conversation.
 * Features:
 * - Subscribes to typing.get query for real-time updates
 * - Displays typing users (excluding current user)
 * - Shows animated indicator with user names
 */

interface TypingIndicatorProps {
  conversationId: Id<"conversations">;
  currentUserId: Id<"users">;
}

export function TypingIndicator({
  conversationId,
  currentUserId,
}: TypingIndicatorProps) {
  // Subscribe to typing status for this conversation
  const typingUsers = useQuery(api.typing.get, { conversationId });

  // Filter out current user
  const otherUsersTyping =
    typingUsers?.filter((user) => user.userId !== currentUserId) || [];

  // Don't render anything if no one is typing
  if (otherUsersTyping.length === 0) {
    return null;
  }

  // Format the typing message
  const getTypingMessage = () => {
    if (otherUsersTyping.length === 1) {
      return `${otherUsersTyping[0].userName} is typing`;
    } else if (otherUsersTyping.length === 2) {
      return `${otherUsersTyping[0].userName} and ${otherUsersTyping[1].userName} are typing`;
    } else {
      return `${otherUsersTyping[0].userName} and ${otherUsersTyping.length - 1} others are typing`;
    }
  };

  return (
    <div className="px-4 py-2 text-sm text-muted-foreground flex items-center gap-2">
      <div className="flex gap-1">
        <span
          className="animate-bounce inline-block"
          style={{ animationDelay: "0ms" }}
        >
          •
        </span>
        <span
          className="animate-bounce inline-block"
          style={{ animationDelay: "150ms" }}
        >
          •
        </span>
        <span
          className="animate-bounce inline-block"
          style={{ animationDelay: "300ms" }}
        >
          •
        </span>
      </div>
      <span>{getTypingMessage()}</span>
    </div>
  );
}
