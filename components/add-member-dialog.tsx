"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, UserPlus } from "lucide-react";

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: Id<"conversations">;
  existingParticipantIds: Id<"users">[];
}

export function AddMemberDialog({
  open,
  onOpenChange,
  conversationId,
  existingParticipantIds,
}: AddMemberDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(
    null,
  );

  const users = useQuery(api.users.list);
  const addMember = useMutation(api.conversations.addMember);

  // Filter users: exclude existing participants and filter by search
  const availableUsers = useMemo(() => {
    if (!users) return [];

    // Filter out existing participants
    const filtered = users.filter(
      (user) => !existingParticipantIds.includes(user._id),
    );

    // Apply search filter
    if (!searchQuery.trim()) return filtered;

    const lowerSearch = searchQuery.toLowerCase();
    return filtered.filter(
      (user) =>
        user.name.toLowerCase().includes(lowerSearch) ||
        user.email.toLowerCase().includes(lowerSearch),
    );
  }, [users, existingParticipantIds, searchQuery]);

  const handleAddMember = async () => {
    if (!selectedUserId) return;

    try {
      await addMember({
        conversationId,
        userId: selectedUserId,
      });

      // Reset form
      setSelectedUserId(null);
      setSearchQuery("");

      // Close dialog
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to add member:", error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Member
          </DialogTitle>
          <DialogDescription>
            Add a new member to this group conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search Input */}
          <div className="space-y-2">
            <Label>Search Users</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* User List */}
          <div className="space-y-2">
            <Label>Select User</Label>
            <ScrollArea className="h-[250px] border rounded-md">
              <div className="p-2">
                {users === undefined ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                    Loading users...
                  </div>
                ) : availableUsers.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                    {searchQuery.trim()
                      ? "No users found"
                      : "All users are already members"}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {availableUsers.map((user) => {
                      const isSelected = selectedUserId === user._id;
                      return (
                        <button
                          key={user._id}
                          onClick={() => setSelectedUserId(user._id)}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                            isSelected
                              ? "bg-accent border-2 border-primary"
                              : "hover:bg-accent"
                          }`}
                        >
                          <Avatar className="h-8 w-8">
                            {user.imageUrl && (
                              <AvatarImage
                                src={user.imageUrl}
                                alt={user.name}
                              />
                            )}
                            <AvatarFallback className="text-xs">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm font-medium truncate">
                              {user.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddMember} disabled={!selectedUserId}>
            Add Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
