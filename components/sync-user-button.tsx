"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface SyncUserButtonProps {
  onSuccess?: () => void;
}

export function SyncUserButton({ onSuccess }: SyncUserButtonProps) {
  const syncUser = useMutation(api.syncCurrentUser.syncCurrentUser);
  const [status, setStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSync = async () => {
    setIsLoading(true);
    setStatus("");
    try {
      const result = await syncUser();
      setStatus(result.message);
      if (
        result.message.includes("successfully") ||
        result.message.includes("already exists")
      ) {
        // User is synced, notify parent
        onSuccess?.();
      }
    } catch (error) {
      setStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <Button onClick={handleSync} disabled={isLoading} size="lg">
        {isLoading ? "Syncing..." : "Sync My Account"}
      </Button>
      {status && (
        <p
          className={`text-sm ${status.includes("Error") ? "text-red-500" : "text-green-500"}`}
        >
          {status}
        </p>
      )}
    </div>
  );
}
