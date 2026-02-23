"use client";

import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatMessageTimestamp } from "@/lib/utils";
import { cn } from "@/lib/utils";
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
    <div
      className={cn(
        "flex gap-2 px-2",
        isOwnMessage ? "justify-end" : "justify-start",
      )}
    >
      {/* Avatar for other users (left side) */}
      {!isOwnMessage && (
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          {message.sender?.imageUrl && (
            <AvatarImage src={message.sender.imageUrl} alt={senderName} />
          )}
          <AvatarFallback className="text-xs">{senderInitials}</AvatarFallback>
        </Avatar>
      )}

      {/* Message Bubble */}
      <div
        className={cn(
          "flex flex-col max-w-[70%] group",
          isOwnMessage ? "items-end" : "items-start",
        )}
      >
        {/* Sender name (only for other users) */}
        {!isOwnMessage && (
          <span className="text-xs font-medium text-muted-foreground mb-1 px-3">
            {senderName}
          </span>
        )}

        {/* Message content bubble */}
        <div
          className={cn(
            "rounded-2xl px-3 py-2 relative",
            isOwnMessage
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted rounded-bl-sm",
          )}
        >
          {message.isDeleted ? (
            <p className="text-sm italic opacity-70">
              This message was deleted
            </p>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}

          {/* Timestamp */}
          <span
            className={cn(
              "text-[10px] mt-1 block",
              isOwnMessage
                ? "text-primary-foreground/70"
                : "text-muted-foreground",
            )}
          >
            {formatMessageTimestamp(message.createdAt)}
          </span>

          {/* Delete Button */}
          {isOwnMessage && !message.isDeleted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(message._id)}
              className={cn(
                "absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
                "bg-background border shadow-sm hover:bg-accent",
              )}
              aria-label="Delete message"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Spacer for own messages to maintain alignment */}
      {isOwnMessage && <div className="w-8 shrink-0" />}
    </div>
  );
}
