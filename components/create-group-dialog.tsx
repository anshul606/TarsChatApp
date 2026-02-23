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
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Users } from "lucide-react";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated?: (conversationId: Id<"conversations">) => void;
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  onGroupCreated,
}: CreateGroupDialogProps) {
  const [groupName, setGroupName] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<Id<"users">>>(
    new Set(),
  );
  const [searchQuery, setSearchQuery] = useState("");

  const users = useQuery(api.users.list);
  const createConversation = useMutation(api.conversations.create);

  // Filter users by search query
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchQuery.trim()) return users;

    const lowerSearch = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(lowerSearch) ||
        user.email.toLowerCase().includes(lowerSearch),
    );
  }, [users, searchQuery]);

  const handleUserToggle = (userId: Id<"users">) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUserIds.size < 2) {
      return;
    }

    try {
      const conversationId = await createConversation({
        participantIds: Array.from(selectedUserIds),
        isGroup: true,
        groupName: groupName.trim(),
      });

      // Reset form
      setGroupName("");
      setSelectedUserIds(new Set());
      setSearchQuery("");

      // Close dialog
      onOpenChange(false);

      // Notify parent
      onGroupCreated?.(conversationId);
    } catch (error) {
      console.error("Failed to create group:", error);
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

  const isValid = groupName.trim().length > 0 && selectedUserIds.size >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create Group Chat
          </DialogTitle>
          <DialogDescription>
            Create a group conversation with multiple members. Select at least 2
            people to start.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Group Name Input */}
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              aria-required="true"
              aria-invalid={groupName.trim().length === 0}
            />
          </div>

          {/* Member Selection */}
          <div className="space-y-2">
            <Label>Select Members ({selectedUserIds.size} selected)</Label>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                aria-label="Search users to add to group"
              />
            </div>

            {/* User List */}
            <ScrollArea className="h-[250px] border rounded-md">
              <div className="p-2">
                {users === undefined ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                    Loading users...
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                    No users found
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredUsers.map((user) => {
                      const isSelected = selectedUserIds.has(user._id);
                      return (
                        <div
                          key={user._id}
                          role="checkbox"
                          aria-checked={isSelected}
                          tabIndex={0}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500"
                          onClick={() => handleUserToggle(user._id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleUserToggle(user._id);
                            }
                          }}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleUserToggle(user._id)}
                            aria-label={`Select ${user.name}`}
                          />
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
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {user.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>

            {selectedUserIds.size > 0 && selectedUserIds.size < 2 && (
              <p className="text-xs text-muted-foreground">
                Select at least 2 members to create a group
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            aria-label="Cancel group creation"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateGroup}
            disabled={!isValid}
            aria-label="Create group chat"
            aria-disabled={!isValid}
          >
            Create Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
