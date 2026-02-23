"use client";

import { UserProfileDisplay } from "@/components/user-profile-header";
import { UserButton, useAuth } from "@clerk/nextjs";
import { UserDirectory } from "@/components/user-directory";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();
  const syncUser = useMutation(api.syncCurrentUser.syncCurrentUser);
  const [isSynced, setIsSynced] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<
    Id<"conversations"> | undefined
  >();

  // Automatically sync user on mount (only after Clerk is loaded and user is signed in)
  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    const syncUserData = async () => {
      try {
        await syncUser();
        setIsSynced(true);
      } catch (error) {
        console.error("Failed to sync user:", error);
        // Still set synced to true to allow the app to work
        // (user might already be synced from webhook)
        setIsSynced(true);
      }
    };

    syncUserData();
  }, [isLoaded, isSignedIn, syncUser]);

  const handleConversationCreated = (conversationId: Id<"conversations">) => {
    setSelectedConversationId(conversationId);
  };

  const handleConversationSelect = (conversationId: Id<"conversations">) => {
    setSelectedConversationId(conversationId);
  };

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
        {!isLoaded ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : !isSignedIn ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Please sign in to continue</p>
          </div>
        ) : isSynced ? (
          <>
            <div className="w-80 border-r">
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-hidden">
                  <ConversationSidebar
                    selectedConversationId={selectedConversationId}
                    onConversationSelect={handleConversationSelect}
                  />
                </div>
                <div className="border-t">
                  <UserDirectory
                    onConversationCreated={handleConversationCreated}
                  />
                </div>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              {selectedConversationId ? (
                <p className="text-muted-foreground">
                  Chat area will be implemented in the next task
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Select a conversation or start a new one
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        )}
      </main>
    </div>
  );
}
