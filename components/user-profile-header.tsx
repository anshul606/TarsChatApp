"use client";

import { useUser } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function UserProfileDisplay() {
  const { user } = useUser();

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-8 w-8">
        <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />
        <AvatarFallback>
          {user.firstName?.[0]}
          {user.lastName?.[0]}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium">
        {user.fullName || "Anonymous"}
      </span>
    </div>
  );
}
