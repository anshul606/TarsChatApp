"use client";

import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatMessageTimestamp } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Trash2, Smile } from "lucide-react";
import { ReactionPicker } from "./reaction-picker";
import { ReadReceiptTicks } from "./read-receipt-ticks";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useRef, useMemo } from "react";

/**
 * MessageItem Component
 * Requirements: 4.1, 4.2, 4.3, 4.4, 10.2, 10.3, 10.4, 11.1, 11.2, 11.3, 11.5, 12.2, 12.3, 12.4, 12.5
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
 * - Read receipt ticks for own messages
 */

interface MessageItemProps {
  message: {
    _id: Id<"messages"> | string;
    content: string;
    isDeleted: boolean;
    createdAt: number;
    senderId: Id<"users">;
    sender?: {
      _id: Id<"users">;
      name: string;
      imageUrl?: string;
    } | null;
    isOptimistic?: boolean;
  };
  currentUserId: Id<"users">;
  conversationId: Id<"conversations">;
  isGroupConversation: boolean;
  onDelete: (messageId: Id<"messages"> | string) => void;
  onReact?: (messageId: Id<"messages">, emoji: string) => void;
}

export function MessageItem({
  message,
  currentUserId,
  conversationId,
  isGroupConversation,
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
  const [optimisticReactions, setOptimisticReactions] = useState<
    Array<{ emoji: string; userId: Id<"users">; isOptimistic: boolean }>
  >([]);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Subscribe to reactions for this message
  // Only subscribe when message is not deleted and not optimistic
  const reactions = useQuery(
    api.reactions.getByMessage,
    !message.isDeleted && !message.isOptimistic
      ? { messageId: message._id as Id<"messages"> }
      : "skip",
  );

  // Subscribe to read receipt status for own messages
  // Requirements: 10.2, 10.3, 10.4, 11.5, 12.5
  const directTickStatus = useQuery(
    api.readReceipts.getDirectMessageTickStatus,
    isOwnMessage &&
      !message.isOptimistic &&
      !message.isDeleted &&
      !isGroupConversation
      ? { messageId: message._id as Id<"messages"> }
      : "skip",
  );

  const groupTickStatus = useQuery(
    api.readReceipts.getGroupMessageTickStatus,
    isOwnMessage &&
      !message.isOptimistic &&
      !message.isDeleted &&
      isGroupConversation
      ? { messageId: message._id as Id<"messages"> }
      : "skip",
  );

  // Determine which tick status to use
  const tickStatus = isGroupConversation ? groupTickStatus : directTickStatus;

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
  const reactionCounts = useMemo(() => {
    // Merge real reactions with optimistic reactions
    const allReactions = [
      ...(reactions || []),
      ...optimisticReactions.map((r) => ({
        emoji: r.emoji,
        userId: r.userId,
        messageId: message._id as Id<"messages">,
        _id: `optimistic-${r.emoji}-${r.userId}` as Id<"reactions">,
        createdAt: Date.now(),
      })),
    ];

    return allReactions.reduce(
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
  }, [reactions, optimisticReactions, message._id]);

  const handleReactionClick = async (emoji: string) => {
    if (message.isOptimistic) return; // Don't allow reactions on optimistic messages

    try {
      // Check if user already reacted with this emoji
      const existingReaction = reactions?.find(
        (r) => r.emoji === emoji && r.userId === currentUserId,
      );

      if (existingReaction) {
        // Remove optimistic reaction
        setOptimisticReactions((prev) =>
          prev.filter(
            (r) => !(r.emoji === emoji && r.userId === currentUserId),
          ),
        );
      } else {
        // Add optimistic reaction
        setOptimisticReactions((prev) => [
          ...prev,
          { emoji, userId: currentUserId, isOptimistic: true },
        ]);
      }

      // Perform actual toggle
      await toggleReaction({
        messageId: message._id as Id<"messages">,
        emoji,
      });

      // Clear optimistic reaction after confirmation
      setOptimisticReactions((prev) =>
        prev.filter((r) => !(r.emoji === emoji && r.userId === currentUserId)),
      );
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
      // Remove optimistic reaction on error
      setOptimisticReactions((prev) =>
        prev.filter((r) => !(r.emoji === emoji && r.userId === currentUserId)),
      );
    }
  };

  return (
    <div
      data-message-id={message._id}
      className={cn(
        "flex gap-2.5 px-6 py-0.5 group/message",
        isOwnMessage ? "justify-end" : "justify-start",
      )}
    >
      {/* Avatar for other users (left side) */}
      {!isOwnMessage && (
        <Avatar className="h-8 w-8 shrink-0 mt-0.5">
          {message.sender?.imageUrl && (
            <AvatarImage src={message.sender.imageUrl} alt={senderName} />
          )}
          <AvatarFallback className="text-xs bg-gradient-to-br from-orange-400 to-orange-500 text-white font-medium">
            {senderInitials}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Action Buttons - Left side for own messages */}
      {isOwnMessage && !message.isDeleted && !message.isOptimistic && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover/message:opacity-100 transition-opacity self-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowReactionPicker(!showReactionPicker);
            }}
            className="h-7 w-7 hover:bg-accent rounded-md"
            aria-label="Add reaction"
            title="Add reaction"
          >
            <Smile className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              console.log("Delete button clicked!", message._id);
              e.preventDefault();
              e.stopPropagation();
              onDelete(message._id);
            }}
            className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive rounded-md"
            aria-label="Delete message"
            title="Delete message"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Message Bubble */}
      <div
        className={cn(
          "flex flex-col max-w-[60%]",
          isOwnMessage ? "items-end" : "items-start",
        )}
      >
        {/* Sender name for group messages */}
        {!isOwnMessage && isGroupConversation && (
          <span className="text-xs font-medium text-foreground mb-0.5 px-0.5">
            {senderName}
          </span>
        )}

        {/* Message content bubble */}
        <div className="relative">
          <div
            className={cn(
              "rounded-2xl px-3.5 py-2 relative",
              isOwnMessage
                ? "bg-muted text-foreground"
                : "bg-orange-100 dark:bg-orange-950/20 text-foreground",
              message.isOptimistic && "opacity-70",
            )}
          >
            {message.isDeleted ? (
              <p className="text-sm italic opacity-70">
                This message was deleted
              </p>
            ) : (
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap wrap-break-word">
                {message.content}
              </p>
            )}
          </div>

          {/* Reaction Picker */}
          {showReactionPicker && !message.isOptimistic && (
            <div
              ref={pickerRef}
              className={cn(
                "absolute z-10 mt-1",
                isOwnMessage ? "right-0" : "left-0",
              )}
            >
              <ReactionPicker
                messageId={message._id as Id<"messages">}
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
                      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm",
                      "border transition-colors",
                      hasReacted
                        ? "bg-orange-50 dark:bg-orange-950/30 border-orange-400 text-orange-600 dark:text-orange-400 font-medium"
                        : "bg-background border-border hover:bg-accent",
                    )}
                    aria-label={`${emoji} reaction, ${data.count} ${data.count === 1 ? "person" : "people"}`}
                  >
                    <span className="text-sm">{emoji}</span>
                    <span className="text-xs">{data.count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Timestamp and read receipts below bubble */}
        <div className="flex items-center gap-1 mt-0.5 px-0.5">
          <span className="text-[10px] text-muted-foreground">
            {formatMessageTimestamp(message.createdAt)}
          </span>
          {/* Read Receipt Ticks */}
          {isOwnMessage &&
            !message.isOptimistic &&
            !message.isDeleted &&
            tickStatus && (
              <ReadReceiptTicks
                status={tickStatus}
                className="text-muted-foreground"
              />
            )}
        </div>
      </div>

      {/* Action Buttons - Right side for received messages */}
      {!isOwnMessage && !message.isDeleted && !message.isOptimistic && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover/message:opacity-100 transition-opacity self-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowReactionPicker(!showReactionPicker);
            }}
            className="h-7 w-7 hover:bg-accent rounded-md"
            aria-label="Add reaction"
            title="Add reaction"
          >
            <Smile className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Spacer for own messages to maintain alignment */}
      {isOwnMessage && <div className="w-8 shrink-0" />}
    </div>
  );
}
