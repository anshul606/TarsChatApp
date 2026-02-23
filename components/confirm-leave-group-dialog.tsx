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

interface ConfirmLeaveGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: Id<"conversations">;
  groupName: string;
  isOwner: boolean;
  onLeft?: () => void;
}

/**
 * ConfirmLeaveGroupDialog Component
 * Requirements: 8.6
 *
 * Displays a confirmation dialog before leaving a group chat.
 * - Shows a clear warning about leaving the group
 * - If user is owner, warns about ownership transfer or group deletion
 * - Calls the leaveGroup mutation on confirm
 * - Handles loading state during the operation
 * - Displays error messages if leaving fails
 * - Triggers onLeft callback for navigation after successful leave
 */
export function ConfirmLeaveGroupDialog({
  open,
  onOpenChange,
  conversationId,
  groupName,
  isOwner,
  onLeft,
}: ConfirmLeaveGroupDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const leaveGroup = useMutation(api.conversations.leaveGroup);

  const handleConfirm = async () => {
    setError("");
    setIsLoading(true);

    try {
      await leaveGroup({ conversationId });

      // Close dialog and trigger navigation callback
      onOpenChange(false);
      onLeft?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave group");
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
          <AlertDialogTitle>Leave Group?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to leave{" "}
            <span className="font-semibold">{groupName}</span>?
            {isOwner && (
              <>
                {" "}
                As the group owner, your ownership will be transferred to
                another member, or the group will be deleted if you are the last
                member.
              </>
            )}
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
            {isLoading ? "Leaving..." : "Leave Group"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
