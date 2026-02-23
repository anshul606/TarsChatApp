"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDeleteGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: Id<"conversations">;
  groupName: string;
  onDeleted?: () => void;
}

/**
 * ConfirmDeleteGroupDialog Component
 * Requirements: 6.5
 *
 * Displays a confirmation dialog before deleting a group chat.
 * - Shows a clear warning that the action is permanent
 * - Calls the deleteConversation mutation on confirm
 * - Handles loading state during deletion
 * - Displays error messages if deletion fails
 * - Triggers onDeleted callback for navigation after successful deletion
 */
export function ConfirmDeleteGroupDialog({
  open,
  onOpenChange,
  conversationId,
  groupName,
  onDeleted,
}: ConfirmDeleteGroupDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const deleteConversation = useMutation(api.conversations.deleteConversation);

  const handleConfirm = async () => {
    setError("");
    setIsLoading(true);

    try {
      await deleteConversation({ conversationId });

      // Close dialog and trigger navigation callback
      onOpenChange(false);
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete group");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) {
      // Reset error when closing
      setError("");
      onOpenChange(open);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Group?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-semibold">{groupName}</span>? This will
            permanently remove the group and all messages for all members. This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? "Deleting..." : "Delete Group"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
