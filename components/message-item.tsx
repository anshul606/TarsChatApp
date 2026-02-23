"use client";

import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatMessageTimestamp } from "@/lib/utils";
import { Trash2 } from "lucide-react";

/**
 * MessageItem Component
 * Requirements: 4.1, 4.2, 4.3, 4.4, 11.1, 11.2, 11.3, 12.4
 *
 * Displays an individual message with:
 * - Sender name and avatar
 * - Message content or deletion placeholder
 * - Formatted timestamp
 * - Delete button for own messages
 * - Reactions with counts (placeholder for future implementation)
 */

interface MessageItemProps {
  message: {
    _id: Id<"messages">;
    content: string;
    isDeleted: boolean;
    createdAt: number;
    senderId: Id<"users">;
    sender?: {
      _id: Id<"users">;
      name: string;
      imageUrl?: string;
    } | null;
  };
  currentUserId: Id<"users">;
  onDelete: (messageId: Id<"messages">) => void;
  onReact?: (messageId: Id<"messages">, emoji: string) => void;
}

export function MessageItem({
  message,
  currentUserId,
  onDelete,
  onReact,
}: MessageItemProps) {
  const isOwnMessage = message.senderId === currentUserId;
  const senderName = message.sender?.name || "Unknown User";
  const senderInitials = senderName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex gap-3 px-4 py-2 hover:bg-accent/50 group">
      {/* Sender Avatar */}
      <Avatar size="default">
        {message.sender?.imageUrl && (
          <AvatarImage src={message.sender.imageUrl} alt={senderName} />
        )}
        <AvatarFallback>{senderInitials}</AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Sender Name and Timestamp */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-semibold text-sm">{senderName}</span>
          <span className="text-xs text-muted-foreground">
            {formatMessageTimestamp(message.createdAt)}
          </span>
        </div>

        {/* Message Text or Deletion Notice */}
        {message.isDeleted ? (
          <p className="text-sm text-muted-foreground italic">
            This message was deleted
          </p>
        ) : (
          <p className="text-sm whitespace-pre-wrap wrap-break-word">
            {message.content}
          </p>
        )}

        {/* Reactions Placeholder - Requirements: 12.4 */}
        {/* TODO: Implement reactions display when reactions API is available */}
        {/* This will show reaction counts below the message */}
      </div>

      {/* Delete Button - Requirements: 11.1, 11.2, 11.3 */}
      {isOwnMessage && !message.isDeleted && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onDelete(message._id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Delete message"
        >
          <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
        </Button>
      )}
    </div>
  );
}
