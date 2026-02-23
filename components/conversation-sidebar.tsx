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
import {
  MessageSquare,
  Users,
  Search,
  X,
  Plus,
  UserPlus,
  Trash2,
  Crown,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PresenceBadge } from "@/components/presence-badge";
import { CreateGroupDialog } from "@/components/create-group-dialog";
import { DeleteConversationDialog } from "@/components/delete-conversation-dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface ConversationSidebarProps {
  selectedConversationId?: Id<"conversations">;
  onConversationSelect: (conversationId: Id<"conversations">) => void;
  onConversationDeleted?: () => void;
}

export function ConversationSidebar({
  selectedConversationId,
  onConversationSelect,
  onConversationDeleted,
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<{
    id: Id<"conversations">;
    name: string;
    isGroup: boolean;
  } | null>(null);

  const conversations = useQuery(api.conversations.list);
  const users = useQuery(api.users.list);
  const currentUser = useQuery(api.users.getCurrentUser);
  const createConversation = useMutation(api.conversations.create);
  const deleteConversation = useMutation(api.conversations.deleteConversation);

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

  const handleDeleteClick = (
    e: React.MouseEvent,
    conversation: {
      _id: Id<"conversations">;
      isGroup: boolean;
      groupName?: string;
      otherParticipants: any[];
    },
  ) => {
    e.stopPropagation();
    const name = conversation.isGroup
      ? conversation.groupName || "Unnamed Group"
      : conversation.otherParticipants[0]?.name || "Unknown User";

    setConversationToDelete({
      id: conversation._id,
      name,
      isGroup: conversation.isGroup,
    });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!conversationToDelete) return;

    try {
      await deleteConversation({ conversationId: conversationToDelete.id });
      setDeleteDialogOpen(false);
      setConversationToDelete(null);

      // If the deleted conversation was selected, notify parent
      if (selectedConversationId === conversationToDelete.id) {
        onConversationDeleted?.();
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
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

  const getUserRole = (conversation: any) => {
    if (!conversation.isGroup || !currentUser) return null;

    if (conversation.ownerId === currentUser._id) {
      return "owner";
    }

    if (conversation.admins?.includes(currentUser._id)) {
      return "admin";
    }

    return null;
  };

  return (
    <div className="flex h-full w-full flex-col bg-background">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Messages</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowUserSearch(!showUserSearch)}
            className="h-9 w-9 rounded-lg hover:bg-muted"
            title="Search"
            aria-label="Search conversations"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* CTA Button */}
        <Button
          onClick={() => setShowCreateGroupDialog(true)}
          className="w-full h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-sm mb-4"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create group
        </Button>

        {showUserSearch && (
          <Input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-muted/50 border-0 px-4 h-10"
            autoFocus
            aria-label="Search for users to start a conversation"
          />
        )}
      </div>

      {/* User Search Results or Conversation List */}
      <ScrollArea className="flex-1">
        {showUserSearch && searchQuery ? (
          // User search results
          <div className="px-4 pb-4">
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleUserSelect(user._id);
                      }
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left focus:outline-none"
                    aria-label={`Start conversation with ${user.name}`}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12 border-2 border-background">
                        {user.imageUrl && (
                          <AvatarImage src={user.imageUrl} alt={user.name} />
                        )}
                        <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-500 text-white font-medium text-sm">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5">
                        <PresenceBadge userId={user._id} size="sm" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">
                        {user.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
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
          <div className="px-4 pb-4">
            {conversations === undefined ? (
              // Loading skeleton
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 p-3">
                    <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No conversations yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Start a new conversation above
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conversation) => {
                  const isSelected =
                    selectedConversationId === conversation._id;

                  return (
                    <div
                      key={conversation._id}
                      className={cn(
                        "group relative flex items-start gap-3 p-3 pr-12 rounded-xl transition-all duration-200",
                        isSelected ? "bg-muted/80" : "hover:bg-muted/40",
                      )}
                    >
                      <button
                        onClick={() => onConversationSelect(conversation._id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onConversationSelect(conversation._id);
                          }
                        }}
                        className="flex items-start gap-3 flex-1 min-w-0 text-left focus:outline-none"
                        aria-label={`Open conversation with ${conversation.isGroup ? conversation.groupName : conversation.otherParticipants[0]?.name || "Unknown User"}${conversation.unreadCount > 0 ? `, ${conversation.unreadCount} unread messages` : ""}`}
                        aria-current={isSelected ? "true" : "false"}
                      >
                        <div className="relative shrink-0">
                          {conversation.isGroup ? (
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
                              <Users className="h-5 w-5 text-white" />
                            </div>
                          ) : (
                            <>
                              <Avatar className="h-12 w-12 border-2 border-background">
                                {conversation.otherParticipants[0]
                                  ?.imageUrl && (
                                  <AvatarImage
                                    src={
                                      conversation.otherParticipants[0].imageUrl
                                    }
                                    alt={conversation.otherParticipants[0].name}
                                  />
                                )}
                                <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-500 text-white font-medium text-sm">
                                  {getInitials(
                                    conversation.otherParticipants[0]?.name ||
                                      "User",
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              {conversation.otherParticipants[0]?._id && (
                                <div className="absolute -bottom-0.5 -right-0.5">
                                  <PresenceBadge
                                    userId={
                                      conversation.otherParticipants[0]._id
                                    }
                                    size="sm"
                                  />
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <p className="font-medium truncate text-sm">
                                {conversation.isGroup
                                  ? conversation.groupName
                                  : conversation.otherParticipants[0]?.name ||
                                    "Unknown User"}
                              </p>
                              {/* Developer Badge */}
                              {!conversation.isGroup &&
                                conversation.otherParticipants[0]?.email ===
                                  "anshulbansal2406@gmail.com" && (
                                  <Badge
                                    variant="default"
                                    className="gap-1 shrink-0 bg-linear-to-r from-purple-500 to-pink-500 text-[10px] px-1.5 py-0 h-4"
                                  >
                                    <Crown className="h-2.5 w-2.5" />
                                    Dev
                                  </Badge>
                                )}
                              {getUserRole(conversation) === "owner" && (
                                <Badge
                                  variant="default"
                                  className="gap-1 shrink-0 text-[10px] px-1.5 py-0 h-4"
                                >
                                  <Crown className="h-2.5 w-2.5" />
                                  Owner
                                </Badge>
                              )}
                              {getUserRole(conversation) === "admin" && (
                                <Badge
                                  variant="secondary"
                                  className="gap-1 shrink-0 text-[10px] px-1.5 py-0 h-4"
                                >
                                  <Shield className="h-2.5 w-2.5" />
                                  Admin
                                </Badge>
                              )}
                            </div>
                            {conversation.lastMessage && (
                              <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                                {formatTimestamp(
                                  conversation.lastMessage.createdAt,
                                )}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground truncate flex-1 min-w-0">
                              {conversation.isGroup ? (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3 shrink-0" />
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
                                className="h-5 min-w-5 px-1.5 flex items-center justify-center text-[11px] shrink-0 bg-gradient-to-br from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 rounded-full"
                              >
                                {conversation.unreadCount > 99
                                  ? "99+"
                                  : conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Delete button - shows on hover, only for direct messages */}
                      {!conversation.isGroup && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDeleteClick(e, conversation)}
                          className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 absolute right-2 top-2 rounded-full hover:bg-destructive/10"
                          title="Delete conversation"
                          aria-label={`Delete conversation with ${conversation.otherParticipants[0]?.name || "Unknown User"}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Create Group Dialog */}
      <CreateGroupDialog
        open={showCreateGroupDialog}
        onOpenChange={setShowCreateGroupDialog}
        onGroupCreated={onConversationSelect}
      />

      {/* Delete Conversation Dialog */}
      {conversationToDelete && (
        <DeleteConversationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDeleteConfirm}
          conversationName={conversationToDelete.name}
          isGroup={conversationToDelete.isGroup}
        />
      )}
    </div>
  );
}
