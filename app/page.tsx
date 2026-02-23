"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { ChatArea } from "@/components/chat-area";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare } from "lucide-react";

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();
  const syncUser = useMutation(api.syncCurrentUser.syncCurrentUser);
  const currentUser = useQuery(api.users.getCurrentUser);
  const [isSynced, setIsSynced] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<
    Id<"conversations"> | undefined
  >();
  const [showMobileChat, setShowMobileChat] = useState(false);

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

  // Update presence on mount and unmount
  const updatePresence = useMutation(api.presence.update);

  useEffect(() => {
    if (!isSynced || !currentUser) {
      return;
    }

    // Set user as online when component mounts
    updatePresence({ isOnline: true });

    // Set user as offline when component unmounts or page is closed
    const handleBeforeUnload = () => {
      updatePresence({ isOnline: false });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      updatePresence({ isOnline: false });
    };
  }, [isSynced, currentUser, updatePresence]);

  const handleConversationSelect = (conversationId: Id<"conversations">) => {
    setSelectedConversationId(conversationId);
    setShowMobileChat(true);
  };

  const handleBackToSidebar = () => {
    setShowMobileChat(false);
  };

  const handleConversationDeleted = () => {
    setSelectedConversationId(undefined);
    setShowMobileChat(false);
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="border-b bg-card shadow-sm shrink-0">
        <div className="flex h-16 items-center px-6 gap-4">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Realtime Messaging
          </h1>
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
            {/* Desktop: Side-by-side layout */}
            {/* Mobile: Conditional display based on showMobileChat */}
            <div
              className={`w-full md:w-80 lg:w-96 border-r bg-card flex flex-col shrink-0 h-full ${
                showMobileChat ? "hidden md:flex" : "flex"
              }`}
            >
              <ConversationSidebar
                selectedConversationId={selectedConversationId}
                onConversationSelect={handleConversationSelect}
                onConversationDeleted={handleConversationDeleted}
              />
            </div>
            <div
              className={`flex-1 flex flex-col overflow-hidden ${
                showMobileChat ? "flex" : "hidden md:flex"
              }`}
            >
              {selectedConversationId ? (
                <>
                  {/* Mobile back button */}
                  <div className="md:hidden border-b px-4 py-3 flex items-center gap-3 bg-card">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleBackToSidebar}
                      className="shrink-0"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <span className="font-semibold">Back to conversations</span>
                  </div>
                  <ChatArea
                    conversationId={selectedConversationId}
                    currentUserId={currentUser._id}
                  />
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-muted/20">
                  <MessageSquare className="h-20 w-20 text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    Select a conversation
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose from your existing conversations or start a new one
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
