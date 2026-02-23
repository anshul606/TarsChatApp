"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageItem } from "@/components/message-item";
import { Send, MessageSquare } from "lucide-react";

/**
 * ChatArea Component
 * Requirements: 3.1, 3.2, 5.2, 9.2
 *
 * Main message display and input area for a conversation.
 * Features:
 * - Subscribes to messages.list query for real-time message updates
 * - Displays scrollable message list using MessageItem components
 * - Message input field with send button
 * - Calls messages.send mutation on submit
 * - Displays empty state when conversation has no messages
 * - Calls conversations.markRead when conversation is opened
 */

interface ChatAreaProps {
  conversationId: Id<"conversations">;
  currentUserId: Id<"users">;
}

export function ChatArea({ conversationId, currentUserId }: ChatAreaProps) {
  const [messageContent, setMessageContent] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Subscribe to messages for this conversation
  const messages = useQuery(api.messages.list, { conversationId });

  // Mutations
  const sendMessage = useMutation(api.messages.send);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const markRead = useMutation(api.conversations.markRead);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedContent = messageContent.trim();
    if (!trimmedContent) return;

    try {
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

  return (
    <div className="flex h-full w-full flex-col bg-muted/30">
      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1">
        {messages === undefined ? (
          // Loading state
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          // Empty state - Requirement 5.2
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start the conversation by sending a message below
            </p>
          </div>
        ) : (
          // Message list
          <div className="flex flex-col gap-2 py-4">
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
      </ScrollArea>

      {/* Message Input Area */}
      <div className="p-4 bg-background border-t shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
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
