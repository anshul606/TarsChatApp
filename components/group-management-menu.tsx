"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  UserMinus,
  Shield,
  Edit3,
  Trash2,
  UserPlus,
  LogOut,
} from "lucide-react";

interface GroupManagementMenuProps {
  conversationId: Id<"conversations">;
  currentUserId: Id<"users">;
  onRemoveMember?: () => void;
  onPromoteToAdmin?: () => void;
  onChangeGroupName?: () => void;
  onDeleteGroup?: () => void;
  onAddMembers?: () => void;
  onLeaveGroup?: () => void;
}

/**
 * GroupManagementMenu Component
 * Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 5.1, 5.4, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 8.1, 8.2
 *
 * Displays a dropdown menu with group management options based on user permissions:
 * - Owner can: remove members, promote to admin, change name, delete group, add members, leave
 * - Admin can: change name, add members, leave
 * - Member can: leave
 *
 * Permission-based visibility ensures users only see actions they're authorized to perform.
 */
export function GroupManagementMenu({
  conversationId,
  currentUserId,
  onRemoveMember,
  onPromoteToAdmin,
  onChangeGroupName,
  onDeleteGroup,
  onAddMembers,
  onLeaveGroup,
}: GroupManagementMenuProps) {
  const [open, setOpen] = useState(false);

  // Subscribe to conversation data for real-time permission updates
  const conversation = useQuery(api.conversations.get, { conversationId });

  // Determine user's role and permissions
  const isOwner = conversation?.ownerId === currentUserId;
  const isAdmin = conversation?.admins?.includes(currentUserId) || false;
  const canManageMembers = isOwner || isAdmin;

  // Loading state
  if (conversation === undefined) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <MoreVertical className="h-5 w-5" />
      </Button>
    );
  }

  // Not a group conversation
  if (!conversation?.isGroup) {
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Group management options"
        >
          <MoreVertical className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Add Members - Owner and Admins */}
        {canManageMembers && (
          <DropdownMenuItem
            onClick={() => {
              setOpen(false);
              onAddMembers?.();
            }}
          >
            <UserPlus className="h-4 w-4" />
            Add Members
          </DropdownMenuItem>
        )}

        {/* Change Group Name - Owner and Admins */}
        {canManageMembers && (
          <DropdownMenuItem
            onClick={() => {
              setOpen(false);
              onChangeGroupName?.();
            }}
          >
            <Edit3 className="h-4 w-4" />
            Change Group Name
          </DropdownMenuItem>
        )}

        {/* Owner-only actions */}
        {isOwner && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setOpen(false);
                onPromoteToAdmin?.();
              }}
            >
              <Shield className="h-4 w-4" />
              Promote to Admin
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setOpen(false);
                onRemoveMember?.();
              }}
            >
              <UserMinus className="h-4 w-4" />
              Remove Member
            </DropdownMenuItem>
          </>
        )}

        {/* Separator before destructive actions */}
        <DropdownMenuSeparator />

        {/* Leave Group - All members */}
        <DropdownMenuItem
          onClick={() => {
            setOpen(false);
            onLeaveGroup?.();
          }}
        >
          <LogOut className="h-4 w-4" />
          Leave Group
        </DropdownMenuItem>

        {/* Delete Group - Owner only */}
        {isOwner && (
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              setOpen(false);
              onDeleteGroup?.();
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete Group
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
