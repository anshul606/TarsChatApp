"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search } from "lucide-react";

interface UserDirectoryProps {
  onConversationCreated?: (conversationId: Id<"conversations">) => void;
  isUserSynced?: boolean;
}

export function UserDirectory({
  onConversationCreated,
  isUserSynced = false,
}: UserDirectoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  // Only query users if the current user is synced to avoid "Unauthorized" error
  const users = useQuery(api.users.list, isUserSynced ? undefined : "skip");
  const createConversation = useMutation(api.conversations.create);

  // Filter users by search term (real-time client-side filtering)
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchTerm.trim()) return users;

    const lowerSearch = searchTerm.toLowerCase();
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(lowerSearch) ||
        user.email.toLowerCase().includes(lowerSearch),
    );
  }, [users, searchTerm]);

  const handleUserSelect = async (userId: Id<"users">) => {
    try {
      // Create or open direct message conversation
      const conversationId = await createConversation({
        participantIds: [userId],
        isGroup: false,
      });

      // Notify parent component
      onConversationCreated?.(conversationId);
    } catch (error) {
      console.error("Failed to create conversation:", error);
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
    <div className="flex h-full flex-col">
      {/* Search Input */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* User List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {!isUserSynced ? (
            // User not synced state
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <p className="text-muted-foreground">
                Please sync your user account first
              </p>
            </div>
          ) : users === undefined ? (
            // Loading state
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground">
                {searchTerm.trim()
                  ? "No users match your search"
                  : "No users available"}
              </p>
            </div>
          ) : (
            // User list
            <div className="space-y-1">
              {filteredUsers.map((user) => (
                <button
                  key={user._id}
                  onClick={() => handleUserSelect(user._id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <Avatar>
                    {user.imageUrl && (
                      <AvatarImage src={user.imageUrl} alt={user.name} />
                    )}
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
