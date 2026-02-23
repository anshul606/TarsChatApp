"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { ChatArea } from "@/components/chat-area";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();
  const syncUser = useMutation(api.syncCurrentUser.syncCurrentUser);
  const currentUser = useQuery(api.users.getCurrentUser);
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

  const handleConversationSelect = (conversationId: Id<"conversations">) => {
    setSelectedConversationId(conversationId);
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b shrink-0">
        <div className="flex h-16 items-center px-4 gap-4">
          <h1 className="text-xl font-semibold">Realtime Messaging App</h1>
          <div className="ml-auto">
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </header>
      <main className="flex-1 flex overflow-hidden">
        {!isLoaded ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : !isSignedIn ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Please sign in to continue</p>
          </div>
        ) : isSynced && currentUser ? (
          <>
            <div className="w-80 border-r flex flex-col shrink-0 h-full">
              <ConversationSidebar
                selectedConversationId={selectedConversationId}
                onConversationSelect={handleConversationSelect}
              />
            </div>
            <div className="flex-1 flex overflow-hidden">
              {selectedConversationId ? (
                <ChatArea
                  conversationId={selectedConversationId}
                  currentUserId={currentUser._id}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-muted-foreground">
                    Select a conversation or start a new one
                  </p>
                </div>
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
