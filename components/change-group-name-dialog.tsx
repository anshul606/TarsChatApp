"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit3 } from "lucide-react";

interface ChangeGroupNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: Id<"conversations">;
  currentName: string;
}

export function ChangeGroupNameDialog({
  open,
  onOpenChange,
  conversationId,
  currentName,
}: ChangeGroupNameDialogProps) {
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const changeGroupName = useMutation(api.conversations.changeGroupName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate name is not empty
    if (!newName.trim()) {
      setError("Group name cannot be empty");
      return;
    }

    // Validate name is under 100 characters
    if (newName.length > 100) {
      setError("Group name cannot exceed 100 characters");
      return;
    }

    setIsLoading(true);

    try {
      await changeGroupName({
        conversationId,
        newName: newName.trim(),
      });

      // Reset form and close dialog
      setNewName("");
      setError("");
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to change group name",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form when closing
      setNewName("");
      setError("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Change Group Name
          </DialogTitle>
          <DialogDescription>
            Enter a new name for the group. The name must be between 1 and 100
            characters.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-group-name">New Group Name</Label>
              <Input
                id="new-group-name"
                placeholder={currentName}
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setError("");
                }}
                aria-required="true"
                aria-invalid={!!error}
                aria-describedby={error ? "name-error" : undefined}
                disabled={isLoading}
                maxLength={100}
              />
              {error && (
                <p
                  id="name-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
              aria-label="Cancel changing group name"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !newName.trim()}
              aria-label="Save new group name"
              aria-disabled={isLoading || !newName.trim()}
            >
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
