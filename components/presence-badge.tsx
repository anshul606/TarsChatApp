"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface PresenceBadgeProps {
  userId: Id<"users">;
  size?: "sm" | "md" | "lg";
}

export function PresenceBadge({ userId, size = "md" }: PresenceBadgeProps) {
  const isOnline = useQuery(api.presence.get, { userId });

  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <div
      className={cn(
        "rounded-full border-2 shadow-sm",
        isOnline ? "bg-green-500 border-white" : "bg-gray-400 border-white",
        sizeClasses[size],
      )}
      style={{ position: "relative", zIndex: 10 }}
      aria-label={isOnline ? "Online" : "Offline"}
      title={isOnline ? "Online" : "Offline"}
    />
  );
}
