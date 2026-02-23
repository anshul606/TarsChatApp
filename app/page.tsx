"use client";

import { UserProfileDisplay } from "@/components/user-profile-header";
import { UserButton } from "@clerk/nextjs";
import { UserDirectory } from "@/components/user-directory";
import { SyncUserButton } from "@/components/sync-user-button";
import { AuthDebug } from "@/components/auth-debug";
import { useState } from "react";

export default function Home() {
  const [isUserSynced, setIsUserSynced] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="flex h-16 items-center px-4 gap-4">
          <h1 className="text-xl font-semibold">Realtime Messaging App</h1>
          <div className="ml-auto flex items-center gap-4">
            <UserProfileDisplay />
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </header>
      <main className="flex-1 flex">
        <div className="w-80 border-r">
          <UserDirectory
            isUserSynced={isUserSynced}
            onConversationCreated={(conversationId) => {
              console.log("Conversation created:", conversationId);
            }}
          />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 max-w-2xl">
            <AuthDebug />
            {!isUserSynced ? (
              <div className="flex flex-col items-center gap-4 mt-4">
                <p className="text-lg font-medium">Welcome! 👋</p>
                <p className="text-muted-foreground text-center max-w-md">
                  First time here? Click the button below to sync your account
                  and start messaging.
                </p>
                <SyncUserButton onSuccess={() => setIsUserSynced(true)} />
              </div>
            ) : (
              <p className="text-muted-foreground">
                Select a user to start a conversation
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
