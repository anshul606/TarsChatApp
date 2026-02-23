"use client";

import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatMessageTimestamp } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Trash2, Smile } from "lucide-react";
import { ReactionPicker } from "./reaction-picker";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useRef } from "react";

/**
 * MessageItem Component
 * Requirements: 4.1, 4.2, 4.3, 4.4, 11.1, 11.2, 11.3, 12.2, 12.3, 12.4, 12.5
 *
 * Displays an individual message with:
 * - Sender name and avatar
 * - Message content or deletion placeholder
 * - Formatted timestamp
 * - Delete button for own messages
 * - Reaction picker on hover/tap
 * - Reaction counts grouped by emoji
 * - Highlighted reactions from current user
 * - Real-time reaction updates
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

  // State for showing reaction picker
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Subscribe to reactions for this message
  const reactions = useQuery(api.reactions.getByMessage, {
    messageId: message._id,
  });

  // Toggle reaction mutation
  const toggleReaction = useMutation(api.reactions.toggle);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setShowReactionPicker(false);
      }
    };

    if (showReactionPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showReactionPicker]);

  // Group reactions by emoji and count them
  const reactionCounts = reactions?.reduce(
    (acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = {
          count: 0,
          userIds: [],
        };
      }
      acc[reaction.emoji].count++;
      acc[reaction.emoji].userIds.push(reaction.userId);
      return acc;
    },
    {} as Record<string, { count: number; userIds: Id<"users">[] }>,
  );

  const handleReactionClick = async (emoji: string) => {
    try {
      await toggleReaction({
        messageId: message._id,
        emoji,
      });
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
    }
  };

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
        <div className="relative">
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

            {/* Reaction Button */}
            {!message.isDeleted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowReactionPicker(!showReactionPicker)}
                className={cn(
                  "absolute -top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
                  "bg-background border shadow-sm hover:bg-accent",
                  isOwnMessage ? "-right-10" : "-left-2",
                )}
                aria-label="Add reaction"
              >
                <Smile className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Reaction Picker */}
          {showReactionPicker && (
            <div
              ref={pickerRef}
              className={cn(
                "absolute z-10 mt-1",
                isOwnMessage ? "right-0" : "left-0",
              )}
            >
              <ReactionPicker
                messageId={message._id}
                onReactionSelect={() => setShowReactionPicker(false)}
                className="animate-in fade-in-0 zoom-in-95"
              />
            </div>
          )}

          {/* Reaction Counts */}
          {reactionCounts && Object.keys(reactionCounts).length > 0 && (
            <div
              className={cn(
                "flex flex-wrap gap-1 mt-1",
                isOwnMessage ? "justify-end" : "justify-start",
              )}
            >
              {Object.entries(reactionCounts).map(([emoji, data]) => {
                const hasReacted = data.userIds.includes(currentUserId);
                return (
                  <button
                    key={emoji}
                    onClick={() => handleReactionClick(emoji)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                      "border transition-colors",
                      hasReacted
                        ? "bg-primary/10 border-primary text-primary font-medium"
                        : "bg-background border-border hover:bg-accent",
                    )}
                    aria-label={`${emoji} reaction, ${data.count} ${data.count === 1 ? "person" : "people"}`}
                  >
                    <span>{emoji}</span>
                    <span className="text-[10px]">{data.count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Spacer for own messages to maintain alignment */}
      {isOwnMessage && <div className="w-8 shrink-0" />}
    </div>
  );
}
