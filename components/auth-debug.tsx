"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function AuthDebug() {
  const authStatus = useQuery(api.debug.checkAuth);

  if (!authStatus) {
    return (
      <div className="text-sm text-muted-foreground">Checking auth...</div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-muted/50">
      <h3 className="font-semibold mb-2">Auth Debug Info:</h3>
      <div className="text-sm space-y-1">
        <p>
          <span className="font-medium">Status:</span>{" "}
          <span
            className={
              authStatus.authenticated ? "text-green-600" : "text-red-600"
            }
          >
            {authStatus.authenticated
              ? "✓ Authenticated"
              : "✗ Not Authenticated"}
          </span>
        </p>
        <p>
          <span className="font-medium">Message:</span> {authStatus.message}
        </p>
        {authStatus.authenticated && (
          <>
            <p>
              <span className="font-medium">Clerk ID:</span>{" "}
              {authStatus.clerkId}
            </p>
            <p>
              <span className="font-medium">Email:</span> {authStatus.email}
            </p>
            <p>
              <span className="font-medium">Name:</span> {authStatus.name}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
