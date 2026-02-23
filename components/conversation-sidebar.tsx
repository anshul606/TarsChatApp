"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PresenceBadge } from "@/components/presence-badge";

interface ConversationSidebarProps {
  selectedConversationId?: Id<"conversations">;
  onConversationSelect: (conversationId: Id<"conversations">) => void;
}

export function ConversationSidebar({
  selectedConversationId,
  onConversationSelect,
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserSearch, setShowUserSearch] = useState(false);

  const conversations = useQuery(api.conversations.list);
  const users = useQuery(api.users.list);
  const createConversation = useMutation(api.conversations.create);

  const filteredUsers = useMemo(() => {
    if (!users || !searchQuery) return [];
    return users.filter((user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [users, searchQuery]);

  const handleUserSelect = async (userId: Id<"users">) => {
    try {
      const conversationId = await createConversation({
        participantIds: [userId],
        isGroup: false,
      });
      onConversationSelect(conversationId);
      setSearchQuery("");
      setShowUserSearch(false);
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

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-background">
      {/* Header with Search */}
      <div className="p-4 border-b space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowUserSearch(!showUserSearch)}
            className="h-8 w-8"
          >
            {showUserSearch ? (
              <X className="h-4 w-4" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {showUserSearch && (
          <Input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
            autoFocus
          />
        )}
      </div>

      {/* User Search Results or Conversation List */}
      <ScrollArea className="flex-1">
        {showUserSearch && searchQuery ? (
          // User search results
          <div className="p-2">
            {filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <Search className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No users found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredUsers.map((user) => (
                  <button
                    key={user._id}
                    onClick={() => handleUserSelect(user._id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        {user.imageUrl && (
                          <AvatarImage src={user.imageUrl} alt={user.name} />
                        )}
                        <AvatarFallback>
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5">
                        <PresenceBadge userId={user._id} size="sm" />
                      </div>
                    </div>
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
        ) : (
          // Conversation list
          <div className="p-2">
            {conversations === undefined ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Loading conversations...
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No conversations yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Click the search icon to find users
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conversation) => {
                  const isSelected =
                    selectedConversationId === conversation._id;

                  return (
                    <button
                      key={conversation._id}
                      onClick={() => onConversationSelect(conversation._id)}
                      className={cn(
                        "w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left",
                        isSelected ? "bg-accent" : "hover:bg-accent/50",
                      )}
                    >
                      <div className="relative shrink-0">
                        {conversation.isGroup ? (
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                        ) : (
                          <>
                            <Avatar className="h-10 w-10">
                              {conversation.otherParticipants[0]?.imageUrl && (
                                <AvatarImage
                                  src={
                                    conversation.otherParticipants[0].imageUrl
                                  }
                                  alt={conversation.otherParticipants[0].name}
                                />
                              )}
                              <AvatarFallback>
                                {getInitials(
                                  conversation.otherParticipants[0]?.name ||
                                    "User",
                                )}
                              </AvatarFallback>
                            </Avatar>
                            {conversation.otherParticipants[0]?._id && (
                              <div className="absolute -bottom-0.5 -right-0.5">
                                <PresenceBadge
                                  userId={conversation.otherParticipants[0]._id}
                                  size="sm"
                                />
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <p className="font-medium truncate">
                            {conversation.isGroup
                              ? conversation.groupName
                              : conversation.otherParticipants[0]?.name ||
                                "Unknown User"}
                          </p>
                          {conversation.lastMessage && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {formatTimestamp(
                                conversation.lastMessage.createdAt,
                              )}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.isGroup ? (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {conversation.participants.length} members
                              </span>
                            ) : conversation.lastMessage ? (
                              conversation.lastMessage.isDeleted ? (
                                <span className="italic">
                                  This message was deleted
                                </span>
                              ) : (
                                conversation.lastMessage.content
                              )
                            ) : (
                              "No messages yet"
                            )}
                          </p>

                          {conversation.unreadCount > 0 && (
                            <Badge
                              variant="default"
                              className="h-5 min-w-5 px-1.5 flex items-center justify-center text-xs"
                            >
                              {conversation.unreadCount > 99
                                ? "99+"
                                : conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
