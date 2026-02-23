"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConversationSidebarProps {
  selectedConversationId?: Id<"conversations">;
  onConversationSelect: (conversationId: Id<"conversations">) => void;
}

export function ConversationSidebar({
  selectedConversationId,
  onConversationSelect,
}: ConversationSidebarProps) {
  const conversations = useQuery(api.conversations.list);

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
      // Today - show time only
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else if (diffInHours < 24 * 7) {
      // This week - show day of week
      return date.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      // Older - show date
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Messages
        </h2>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {conversations === undefined ? (
            // Loading state
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Loading conversations...
            </div>
          ) : conversations.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No conversations yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start a conversation from the user directory
              </p>
            </div>
          ) : (
            // Conversation list
            <div className="space-y-1">
              {conversations.map((conversation) => {
                const isSelected = selectedConversationId === conversation._id;

                return (
                  <button
                    key={conversation._id}
                    onClick={() => onConversationSelect(conversation._id)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left",
                      isSelected ? "bg-accent" : "hover:bg-accent/50",
                    )}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {conversation.isGroup ? (
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                      ) : (
                        <Avatar>
                          {conversation.otherParticipants[0]?.imageUrl && (
                            <AvatarImage
                              src={conversation.otherParticipants[0].imageUrl}
                              alt={conversation.otherParticipants[0].name}
                            />
                          )}
                          <AvatarFallback>
                            {getInitials(
                              conversation.otherParticipants[0]?.name || "User",
                            )}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>

                    {/* Content */}
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

                      {/* Group member count or last message preview */}
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

                        {/* Unread count badge */}
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
      </ScrollArea>
    </div>
  );
}
