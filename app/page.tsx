"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { ChatArea } from "@/components/chat-area";
import { ThemeToggle } from "@/components/theme-toggle";
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
    updatePresence({ isOnline: true }).catch((error) => {
      console.error("Failed to set online status:", error);
    });

    // Set user as offline when component unmounts or page is closed
    const handleBeforeUnload = () => {
      // Use sendBeacon for more reliable offline status on page close
      navigator.sendBeacon?.("/api/presence-offline");
      updatePresence({ isOnline: false }).catch((error) => {
        console.error("Failed to set offline status:", error);
      });
    };

    // Handle visibility change to update presence
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence({ isOnline: false }).catch((error) => {
          console.error("Failed to set offline status:", error);
        });
      } else {
        updatePresence({ isOnline: true }).catch((error) => {
          console.error("Failed to set online status:", error);
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      updatePresence({ isOnline: false }).catch((error) => {
        console.error("Failed to set offline status on unmount:", error);
      });
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
    <div className="flex h-screen flex-col bg-gradient-to-br from-background via-background to-muted/20">
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Skip to main content
      </a>

      <header
        className="border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-sm shrink-0"
        role="banner"
      >
        <div className="flex h-16 items-center px-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary via-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
              <MessageSquare className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
              Tars Chat App
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
      </header>
      <main
        id="main-content"
        className="flex-1 flex overflow-hidden"
        role="main"
      >
        {!isLoaded ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
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
              className={`w-full md:w-80 lg:w-96 border-r bg-card/50 backdrop-blur-sm flex flex-col shrink-0 h-full shadow-sm ${
                showMobileChat ? "hidden md:flex" : "flex"
              }`}
              role="navigation"
              aria-label="Conversations"
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
              role="region"
              aria-label="Chat area"
            >
              {selectedConversationId ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Mobile back button */}
                  <div className="md:hidden border-b px-4 py-3 flex items-center gap-3 bg-card/80 backdrop-blur-sm shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleBackToSidebar}
                      className="shrink-0"
                      aria-label="Back to conversations list"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <span className="font-semibold">Back to conversations</span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <ChatArea
                      conversationId={selectedConversationId}
                      currentUserId={currentUser._id}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-muted/10">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                    <MessageSquare className="relative h-24 w-24 text-primary/70" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Welcome to Tars Chat
                  </h2>
                  <p className="text-muted-foreground max-w-md text-center px-4">
                    Select a conversation from the sidebar or start a new one to
                    begin messaging
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
