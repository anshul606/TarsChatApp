"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MessageItem } from "@/components/message-item";
import { PresenceBadge } from "@/components/presence-badge";
import { TypingIndicator } from "@/components/typing-indicator";
import { Send, MessageSquare } from "lucide-react";

/**
 * ChatArea Component
 * Requirements: 3.1, 3.2, 5.2, 8.1, 8.2, 8.3, 8.4, 9.2
 *
 * Main message display and input area for a conversation.
 * Features:
 * - Subscribes to messages.list query for real-time message updates
 * - Displays scrollable message list using MessageItem components
 * - Message input field with send button
 * - Calls messages.send mutation on submit
 * - Displays empty state when conversation has no messages
 * - Calls conversations.markRead when conversation is opened
 * - Debounced typing detection with automatic clear after 2 seconds
 * - Clears typing status immediately on message send
 * - Displays TypingIndicator component showing who is typing
 */

interface ChatAreaProps {
  conversationId: Id<"conversations">;
  currentUserId: Id<"users">;
}

export function ChatArea({ conversationId, currentUserId }: ChatAreaProps) {
  const [messageContent, setMessageContent] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to messages for this conversation
  const messages = useQuery(api.messages.list, { conversationId });
  const conversation = useQuery(api.conversations.get, { conversationId });

  // Mutations
  const sendMessage = useMutation(api.messages.send);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const markRead = useMutation(api.conversations.markRead);
  const updateTyping = useMutation(api.typing.update);

  // Mark conversation as read when opened or when new messages arrive
  useEffect(() => {
    if (conversationId) {
      markRead({ conversationId });
    }
  }, [conversationId, messages, markRead]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Handle input change with typing detection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setMessageContent(newValue);

    // Only track typing if there's content
    if (newValue.trim()) {
      // Set typing status to true
      updateTyping({ conversationId, isTyping: true });

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to clear typing after 2 seconds
      typingTimeoutRef.current = setTimeout(() => {
        updateTyping({ conversationId, isTyping: false });
      }, 2000);
    } else {
      // Clear typing immediately if input is empty
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      updateTyping({ conversationId, isTyping: false });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedContent = messageContent.trim();
    if (!trimmedContent) return;

    try {
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Clear typing status immediately
      await updateTyping({ conversationId, isTyping: false });

      await sendMessage({
        conversationId,
        content: trimmedContent,
      });

      // Clear input after sending
      setMessageContent("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleDeleteMessage = async (messageId: Id<"messages">) => {
    try {
      await deleteMessage({ messageId });
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex h-full w-full flex-col">
      {/* Chat Header */}
      {conversation && (
        <div className="border-b bg-background px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            {conversation.isGroup ? (
              <>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <MessageSquare className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-lg truncate">
                    {conversation.groupName}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {conversation.otherParticipants.length + 1} members
                  </p>
                </div>
              </>
            ) : conversation.otherParticipants[0] ? (
              <>
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    {conversation.otherParticipants[0].imageUrl && (
                      <AvatarImage
                        src={conversation.otherParticipants[0].imageUrl}
                        alt={conversation.otherParticipants[0].name}
                      />
                    )}
                    <AvatarFallback>
                      {getInitials(conversation.otherParticipants[0].name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5">
                    <PresenceBadge
                      userId={conversation.otherParticipants[0]._id}
                      size="sm"
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-lg truncate">
                    {conversation.otherParticipants[0].name}
                  </h2>
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.otherParticipants[0].email}
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 bg-muted/20">
        {messages === undefined ? (
          // Loading state
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          // Empty state - Requirement 5.2
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <MessageSquare className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              No messages yet
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Start the conversation by sending a message below
            </p>
          </div>
        ) : (
          // Message list
          <div className="flex flex-col gap-1 py-4 px-4">
            {messages.map((message) => (
              <MessageItem
                key={message._id}
                message={message}
                currentUserId={currentUserId}
                onDelete={handleDeleteMessage}
              />
            ))}
          </div>
        )}
        {/* Typing Indicator - Requirements 8.1, 8.4 */}
        <TypingIndicator
          conversationId={conversationId}
          currentUserId={currentUserId}
        />
      </ScrollArea>

      {/* Message Input Area */}
      <div className="p-4 bg-background border-t shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={messageContent}
            onChange={handleInputChange}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!messageContent.trim()}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
