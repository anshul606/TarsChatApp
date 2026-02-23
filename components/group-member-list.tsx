"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, Shield, UserMinus, ShieldPlus } from "lucide-react";
import { toast } from "sonner";

interface GroupMemberListProps {
  conversationId: Id<"conversations">;
}

export function GroupMemberList({ conversationId }: GroupMemberListProps) {
  // Subscribe to conversation data for real-time updates
  const conversation = useQuery(api.conversations.get, { conversationId });
  const currentUser = useQuery(api.users.getCurrentUser);
  const removeMember = useMutation(api.conversations.removeMember);
  const promoteToAdmin = useMutation(api.conversations.promoteToAdmin);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleRemoveMember = async (userId: Id<"users">, userName: string) => {
    try {
      await removeMember({ conversationId, userIdToRemove: userId });
      toast.success(`Removed ${userName} from the group`);
    } catch (error) {
      console.error("Failed to remove member:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to remove member";
      toast.error(errorMessage);
    }
  };

  const handlePromoteToAdmin = async (
    userId: Id<"users">,
    userName: string,
  ) => {
    try {
      await promoteToAdmin({ conversationId, userIdToPromote: userId });
      toast.success(`Promoted ${userName} to admin`);
    } catch (error) {
      console.error("Failed to promote to admin:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to promote to admin";
      toast.error(errorMessage);
    }
  };

  // Loading state
  if (conversation === undefined || currentUser === undefined) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (!conversation || !currentUser) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground text-sm">
        Conversation not found
      </div>
    );
  }

  // Get all participant IDs
  const participantIds = conversation.participants;
  const ownerId = conversation.ownerId;
  const adminIds = conversation.admins || [];
  const isCurrentUserOwner = currentUser._id === ownerId;

  return (
    <ScrollArea className="flex-1 max-h-[400px]">
      <div className="p-2 space-y-1">
        {participantIds.map((participantId) => {
          const isOwner = participantId === ownerId;
          const isAdmin = adminIds.includes(participantId);
          const isSelf = participantId === currentUser._id;

          return (
            <MemberItem
              key={participantId}
              userId={participantId}
              isOwner={isOwner}
              isAdmin={isAdmin}
              isSelf={isSelf}
              canRemove={isCurrentUserOwner && !isSelf}
              canPromote={isCurrentUserOwner && !isOwner && !isAdmin}
              onRemove={handleRemoveMember}
              onPromote={handlePromoteToAdmin}
              getInitials={getInitials}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
}

interface MemberItemProps {
  userId: Id<"users">;
  isOwner: boolean;
  isAdmin: boolean;
  isSelf: boolean;
  canRemove: boolean;
  canPromote: boolean;
  onRemove: (userId: Id<"users">, userName: string) => void;
  onPromote: (userId: Id<"users">, userName: string) => void;
  getInitials: (name: string) => string;
}

function MemberItem({
  userId,
  isOwner,
  isAdmin,
  isSelf,
  canRemove,
  canPromote,
  onRemove,
  onPromote,
  getInitials,
}: MemberItemProps) {
  // Subscribe to user data for real-time updates
  const user = useQuery(api.users.get, { userId });

  if (!user) {
    return (
      <div className="flex items-center gap-3 p-3">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
      <Avatar className="h-10 w-10">
        {user.imageUrl && <AvatarImage src={user.imageUrl} alt={user.name} />}
        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">
            {user.name}
            {isSelf && <span className="text-muted-foreground"> (You)</span>}
          </p>
          {isOwner && (
            <Badge variant="default" className="gap-1">
              <Crown className="h-3 w-3" />
              Owner
            </Badge>
          )}
          {isAdmin && !isOwner && (
            <Badge variant="secondary" className="gap-1">
              <Shield className="h-3 w-3" />
              Admin
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {canPromote && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onPromote(userId, user.name)}
            title="Promote to Admin"
            className="h-8 w-8"
          >
            <ShieldPlus className="h-4 w-4" />
          </Button>
        )}
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(userId, user.name)}
            title="Remove Member"
            className="h-8 w-8"
          >
            <UserMinus className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}
