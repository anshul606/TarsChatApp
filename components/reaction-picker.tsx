"use client";

import { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * ReactionPicker Component
 * Requirements: 12.1, 12.2, 12.3
 *
 * Displays an emoji picker with supported emojis and handles emoji selection.
 * Calls reactions.toggle mutation when an emoji is selected.
 */

interface ReactionPickerProps {
  messageId: Id<"messages">;
  className?: string;
  onReactionSelect?: () => void;
}

const SUPPORTED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

export function ReactionPicker({
  messageId,
  className,
  onReactionSelect,
}: ReactionPickerProps) {
  const toggleReaction = useMutation(api.reactions.toggle);

  const handleEmojiClick = async (emoji: string) => {
    try {
      await toggleReaction({
        messageId,
        emoji,
      });
      // Close the picker after selecting a reaction
      onReactionSelect?.();
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
    }
  };

  return (
    <div
      className={cn(
        "flex gap-1 p-1 bg-background border rounded-lg shadow-lg",
        className,
      )}
    >
      {SUPPORTED_EMOJIS.map((emoji) => (
        <Button
          key={emoji}
          variant="ghost"
          size="sm"
          onClick={() => handleEmojiClick(emoji)}
          className="h-8 w-8 p-0 hover:bg-accent text-lg"
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </Button>
      ))}
    </div>
  );
}
