"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
import { AddMemberDialog } from "@/components/add-member-dialog";
import { GroupManagementMenu } from "@/components/group-management-menu";
import { GroupMemberList } from "@/components/group-member-list";
import { ChangeGroupNameDialog } from "@/components/change-group-name-dialog";
import { ConfirmDeleteGroupDialog } from "@/components/confirm-delete-group-dialog";
import { ConfirmLeaveGroupDialog } from "@/components/confirm-leave-group-dialog";
import { EmojiPickerInput } from "@/components/emoji-picker-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Send,
  MessageSquare,
  ArrowDown,
  UserPlus,
  AlertCircle,
  RefreshCw,
  Users,
  Crown,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

/**
 * ChatArea Component
 * Requirements: 3.1, 3.2, 5.2, 8.1, 8.2, 8.3, 8.4, 9.2, 13.2, 13.3
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
 * - Error handling for message sending with retry functionality
 * - Stores failed messages locally for retry
 */

interface FailedMessage {
  id: string;
  content: string;
  timestamp: number;
}

interface OptimisticMessage {
  _id: string;
  content: string;
  isDeleted: boolean;
  createdAt: number;
  senderId: Id<"users">;
  sender?: {
    _id: Id<"users">;
    name: string;
    imageUrl?: string;
  } | null;
  isOptimistic?: boolean;
}

interface ChatAreaProps {
  conversationId: Id<"conversations">;
  currentUserId: Id<"users">;
}

export function ChatArea({ conversationId, currentUserId }: ChatAreaProps) {
  const [messageContent, setMessageContent] = useState("");
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showNewMessagesButton, setShowNewMessagesButton] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [showMemberListDialog, setShowMemberListDialog] = useState(false);
  const [showChangeNameDialog, setShowChangeNameDialog] = useState(false);
  const [showDeleteGroupDialog, setShowDeleteGroupDialog] = useState(false);
  const [showLeaveGroupDialog, setShowLeaveGroupDialog] = useState(false);
  const [failedMessages, setFailedMessages] = useState<FailedMessage[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<
    OptimisticMessage[]
  >([]);
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousMessageCountRef = useRef<number>(0);
  const visibilityTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const markedAsReadRef = useRef<Set<string>>(new Set());

  // Subscribe to messages for this conversation
  // Only subscribe when conversationId is defined to avoid unnecessary queries
  const messages = useQuery(
    api.messages.list,
    conversationId ? { conversationId } : "skip",
  );
  const conversation = useQuery(
    api.conversations.get,
    conversationId ? { conversationId } : "skip",
  );
  const currentUser = useQuery(api.users.getCurrentUser);

  // Redirect to home if user is no longer a participant (removed or left)
  useEffect(() => {
    if (conversation === null) {
      // Conversation was deleted or user is no longer a participant
      window.location.href = "/";
    }
  }, [conversation]);

  // Mutations
  const sendMessage = useMutation(api.messages.send);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const markRead = useMutation(api.conversations.markRead);
  const updateTyping = useMutation(api.typing.update);
  const markAsDelivered = useMutation(api.readReceipts.markAsDelivered);
  const markAsRead = useMutation(api.readReceipts.markAsRead);

  // Merge real messages with optimistic messages
  const allMessages = useMemo(() => {
    if (!messages) return messages;

    // Filter out optimistic messages that have been confirmed
    const confirmedMessageIds = new Set(messages.map((m) => m._id));
    const pendingOptimistic = optimisticMessages.filter(
      (om) => !confirmedMessageIds.has(om._id as Id<"messages">),
    );

    // Combine and sort by timestamp
    return [...messages, ...pendingOptimistic].sort(
      (a, b) => a.createdAt - b.createdAt,
    );
  }, [messages, optimisticMessages]);

  // Mark conversation as read when opened
  useEffect(() => {
    if (conversationId) {
      markRead({ conversationId }).catch((error) => {
        console.error("Failed to mark conversation as read:", error);
      });
    }
    // Only run when conversation changes, not when messages change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Mark messages as delivered when conversation opens
  // Requirements: 16.1, 16.2, 16.3, 16.4
  useEffect(() => {
    if (conversationId) {
      markAsDelivered({ conversationId }).catch((error) => {
        console.error("Failed to mark messages as delivered:", error);
      });
    }
    // Only run when conversation changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Scroll to bottom when conversation is first opened or messages first load
  useEffect(() => {
    if (messages && messages.length > 0 && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollContainer) {
        // Use setTimeout to ensure DOM is updated
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 100); // Increased timeout to ensure rendering is complete
      }
    }
  }, [conversationId, messages]); // Run when conversation changes OR when messages load

  // Check if user is scrolled to bottom
  const checkIfAtBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollContainer) {
        const threshold = 50; // pixels from bottom to consider "at bottom"
        const isBottom =
          scrollContainer.scrollHeight -
            scrollContainer.scrollTop -
            scrollContainer.clientHeight <=
          threshold;
        setIsAtBottom(isBottom);
        // Hide button when user scrolls to bottom manually
        if (isBottom) {
          setShowNewMessagesButton(false);
        }
      }
    }
  };

  // Auto-scroll to bottom only when user is already at bottom
  useEffect(() => {
    // Only scroll if we have messages and user is at bottom
    if (
      scrollAreaRef.current &&
      isAtBottom &&
      allMessages &&
      allMessages.length > 0 &&
      previousMessageCountRef.current > 0 && // Only if we had messages before (not initial load)
      allMessages.length > previousMessageCountRef.current // Only if new messages arrived
    ) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMessages?.length, isAtBottom]); // Removed conversationId

  // Show "New messages" button when new messages arrive while scrolled up
  useEffect(() => {
    if (allMessages && allMessages.length > previousMessageCountRef.current) {
      // New messages have arrived
      if (!isAtBottom) {
        setShowNewMessagesButton(true);
      }
      previousMessageCountRef.current = allMessages.length;
    }
  }, [allMessages, isAtBottom]);

  // Track scroll position
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    );
    if (!scrollContainer) return;

    const handleScroll = () => {
      checkIfAtBottom();
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    // Check initial position
    checkIfAtBottom();

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Clear typing status when conversation changes
  useEffect(() => {
    return () => {
      // Clear typing status when switching conversations
      if (conversationId) {
        updateTyping({ conversationId, isTyping: false }).catch((error) => {
          console.error("Failed to clear typing status on unmount:", error);
        });
      }
    };
  }, [conversationId, updateTyping]);

  // Implement Intersection Observer for read tracking
  // Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    const scrollContainer = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    );
    if (!scrollContainer) return;

    // Cleanup function to clear all timers
    const cleanup = () => {
      visibilityTimersRef.current.forEach((timer) => clearTimeout(timer));
      visibilityTimersRef.current.clear();
    };

    // Create Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const messageId = entry.target.getAttribute("data-message-id");
          if (!messageId) return;

          // Skip if already marked as read
          if (markedAsReadRef.current.has(messageId)) return;

          if (entry.isIntersecting) {
            // Message became visible - start timer
            // Only mark as read after 1 second of visibility
            const timer = setTimeout(() => {
              // Check if message is sent by another user
              const message = messages.find((m) => m._id === messageId);
              if (message && message.senderId !== currentUserId) {
                markAsRead({ messageId: messageId as Id<"messages"> })
                  .then(() => {
                    markedAsReadRef.current.add(messageId);
                  })
                  .catch((error) => {
                    console.error("Failed to mark message as read:", error);
                  });
              }
            }, 1000); // 1 second visibility requirement

            visibilityTimersRef.current.set(messageId, timer);
          } else {
            // Message left viewport - cancel timer
            const timer = visibilityTimersRef.current.get(messageId);
            if (timer) {
              clearTimeout(timer);
              visibilityTimersRef.current.delete(messageId);
            }
          }
        });
      },
      {
        root: scrollContainer,
        threshold: 0.5, // Message must be at least 50% visible
      },
    );

    // Observe all message elements
    const messageElements =
      scrollContainer.querySelectorAll("[data-message-id]");
    messageElements.forEach((element) => observer.observe(element));

    return () => {
      cleanup();
      observer.disconnect();
    };
  }, [messages, currentUserId, markAsRead]);

  // Clear read tracking state when conversation changes
  useEffect(() => {
    markedAsReadRef.current.clear();
    visibilityTimersRef.current.forEach((timer) => clearTimeout(timer));
    visibilityTimersRef.current.clear();
  }, [conversationId]);

  // Handle input change with typing detection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setMessageContent(newValue);

    // Only track typing if there's content
    if (newValue.trim()) {
      // Set typing status to true
      updateTyping({ conversationId, isTyping: true }).catch((error) => {
        console.error("Failed to update typing status:", error);
      });

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to clear typing after 2 seconds
      typingTimeoutRef.current = setTimeout(() => {
        updateTyping({ conversationId, isTyping: false }).catch((error) => {
          console.error("Failed to clear typing status:", error);
        });
      }, 2000);
    } else {
      // Clear typing immediately if input is empty
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      updateTyping({ conversationId, isTyping: false }).catch((error) => {
        console.error("Failed to clear typing status:", error);
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedContent = messageContent.trim();
    if (!trimmedContent || isSending) return;

    setIsSending(true);

    // Create optimistic message
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: OptimisticMessage = {
      _id: optimisticId,
      content: trimmedContent,
      isDeleted: false,
      createdAt: Date.now(),
      senderId: currentUserId,
      sender: currentUser
        ? {
            _id: currentUser._id,
            name: currentUser.name,
            imageUrl: currentUser.imageUrl,
          }
        : null,
      isOptimistic: true,
    };

    // Add optimistic message immediately
    setOptimisticMessages((prev) => [...prev, optimisticMessage]);

    // Clear input immediately for better UX
    setMessageContent("");

    try {
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Clear typing status immediately
      await updateTyping({ conversationId, isTyping: false });

      // Send the actual message
      const messageId = await sendMessage({
        conversationId,
        content: trimmedContent,
      });

      // Remove optimistic message once confirmed
      setOptimisticMessages((prev) =>
        prev.filter((msg) => msg._id !== optimisticId),
      );
    } catch (error) {
      console.error("Failed to send message:", error);

      // Remove optimistic message on error
      setOptimisticMessages((prev) =>
        prev.filter((msg) => msg._id !== optimisticId),
      );

      // Restore input content
      setMessageContent(trimmedContent);

      // Store failed message for retry
      const failedMessage: FailedMessage = {
        id: `failed-${Date.now()}`,
        content: trimmedContent,
        timestamp: Date.now(),
      };
      setFailedMessages((prev) => [...prev, failedMessage]);

      // Show error toast with retry option
      toast.error("Failed to send message", {
        description: "Your message couldn't be sent. Click retry to try again.",
        action: {
          label: "Retry",
          onClick: () => handleRetryMessage(failedMessage),
        },
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleRetryMessage = async (failedMessage: FailedMessage) => {
    try {
      await sendMessage({
        conversationId,
        content: failedMessage.content,
      });

      // Remove from failed messages
      setFailedMessages((prev) =>
        prev.filter((msg) => msg.id !== failedMessage.id),
      );

      toast.success("Message sent successfully");
    } catch (error) {
      console.error("Failed to retry message:", error);
      toast.error("Failed to send message", {
        description: "Please try again later.",
        action: {
          label: "Retry",
          onClick: () => handleRetryMessage(failedMessage),
        },
      });
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageContent((prev) => prev + emoji);
  };

  const handleDeleteMessage = async (messageId: Id<"messages"> | string) => {
    console.log(
      "Attempting to delete message:",
      messageId,
      "type:",
      typeof messageId,
    );

    // Don't allow deleting optimistic messages (they start with "optimistic-")
    if (typeof messageId === "string" && messageId.startsWith("optimistic-")) {
      console.log("Cannot delete optimistic message");
      return;
    }

    try {
      await deleteMessage({ messageId: messageId as Id<"messages"> });
      console.log("Message deleted successfully");
    } catch (error) {
      console.error("Failed to delete message:", error);
      toast.error("Failed to delete message", {
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
    }
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: "smooth",
        });
        setShowNewMessagesButton(false);
      }
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
        <div className="border-b bg-background px-6 py-4 shrink-0 z-10">
          <div className="flex items-center gap-3">
            {conversation.isGroup ? (
              <>
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-base truncate">
                    {conversation.groupName}
                  </h2>
                  <button
                    onClick={() => setShowMemberListDialog(true)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="View group members"
                  >
                    {conversation.participants.length} members
                  </button>
                </div>
                {/* Only show Add Member button for owner or admin */}
                {(conversation.ownerId === currentUserId ||
                  conversation.admins?.includes(currentUserId)) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAddMemberDialog(true)}
                    title="Add Member"
                    aria-label="Add member to group"
                    className="h-9 w-9 rounded-lg"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                )}
                <GroupManagementMenu
                  conversationId={conversationId}
                  currentUserId={currentUserId}
                  onAddMembers={() => setShowAddMemberDialog(true)}
                  onChangeGroupName={() => setShowChangeNameDialog(true)}
                  onDeleteGroup={() => setShowDeleteGroupDialog(true)}
                  onLeaveGroup={() => setShowLeaveGroupDialog(true)}
                  onRemoveMember={() => setShowMemberListDialog(true)}
                  onPromoteToAdmin={() => setShowMemberListDialog(true)}
                />
              </>
            ) : conversation.otherParticipants[0] ? (
              <>
                <div className="relative">
                  <Avatar className="h-12 w-12 border-2 border-background">
                    {conversation.otherParticipants[0].imageUrl && (
                      <AvatarImage
                        src={conversation.otherParticipants[0].imageUrl}
                        alt={conversation.otherParticipants[0].name}
                      />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-500 text-white font-medium text-sm">
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
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-base truncate">
                      {conversation.otherParticipants[0].name}
                    </h2>
                    {conversation.otherParticipants[0].email ===
                      "anshulbansal2406@gmail.com" && (
                      <Badge
                        variant="default"
                        className="gap-1 shrink-0 bg-linear-to-r from-purple-500 to-pink-500 text-xs px-1.5 py-0"
                      >
                        <Crown className="h-2.5 w-2.5" />
                        Dev
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {conversation.otherParticipants[0].email}
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 relative min-h-0">
        {/* Screen reader live region for new messages */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {allMessages && allMessages.length > 0 && (
            <span>
              {allMessages.length} messages in conversation
              {(allMessages[allMessages.length - 1] as OptimisticMessage)
                ?.isOptimistic
                ? ", sending..."
                : ""}
            </span>
          )}
        </div>

        <ScrollArea
          ref={scrollAreaRef}
          className="h-full w-full bg-muted/30"
          role="log"
          aria-label="Message history"
        >
          {messages === undefined ? (
            // Loading skeleton
            <div className="flex flex-col gap-4 py-4 px-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}
                >
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex flex-col gap-2 max-w-[70%]">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton
                      className={`h-16 ${i % 3 === 0 ? "w-48" : i % 3 === 1 ? "w-64" : "w-56"}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : messages === null ? (
            // Conversation deleted
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-destructive/20 blur-3xl rounded-full" />
                <MessageSquare className="relative h-20 w-20 text-destructive/60" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">
                Conversation not found
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This conversation may have been deleted
              </p>
            </div>
          ) : !allMessages || allMessages.length === 0 ? (
            // Empty state - Requirement 5.2
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full" />
                <MessageSquare className="relative h-20 w-20 text-orange-500/60" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">
                No messages yet
              </p>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                Start the conversation by sending a message below
              </p>
            </div>
          ) : (
            // Message list
            <div className="flex flex-col py-3">
              {allMessages.map((message) => (
                <MessageItem
                  key={message._id}
                  message={message}
                  currentUserId={currentUserId}
                  conversationId={conversationId}
                  isGroupConversation={conversation?.isGroup ?? false}
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

        {/* New Messages Button - Requirements 10.2, 10.3 */}
        {showNewMessagesButton && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <Button
              onClick={scrollToBottom}
              variant="secondary"
              size="sm"
              className="shadow-lg pointer-events-auto"
              aria-label="Scroll to new messages"
            >
              <ArrowDown className="h-4 w-4 mr-2" />
              New messages
            </Button>
          </div>
        )}
      </div>

      {/* Message Input Area */}
      <div className="px-6 py-4 bg-background border-t shrink-0 z-20 relative">
        {/* Failed Messages Display */}
        {failedMessages.length > 0 && (
          <div className="mb-3 space-y-2">
            {failedMessages.map((failedMsg) => (
              <div
                key={failedMsg.id}
                className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl"
              >
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-destructive">
                    Failed to send
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {failedMsg.content}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRetryMessage(failedMsg)}
                  className="shrink-0 h-8 rounded-lg"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <EmojiPickerInput onEmojiSelect={handleEmojiSelect} />
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Type a message..."
              value={messageContent}
              onChange={handleInputChange}
              className="flex-1 h-12 rounded-full bg-muted/50 border-0 px-5 pr-14 focus-visible:ring-1 focus-visible:ring-orange-500/20 text-sm placeholder:text-muted-foreground/60"
              disabled={isSending}
              aria-label="Message input"
              aria-describedby="message-input-description"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!messageContent.trim() || isSending}
              aria-label="Send message"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-orange-500 hover:bg-orange-600 shadow-sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <span id="message-input-description" className="sr-only">
            Type your message and press Enter or click Send to send it
          </span>
        </form>
      </div>

      {/* Add Member Dialog */}
      {conversation?.isGroup && (
        <AddMemberDialog
          open={showAddMemberDialog}
          onOpenChange={setShowAddMemberDialog}
          conversationId={conversationId}
          existingParticipantIds={conversation.participants}
        />
      )}

      {/* Member List Dialog */}
      {conversation?.isGroup && (
        <Dialog
          open={showMemberListDialog}
          onOpenChange={setShowMemberListDialog}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Group Members
              </DialogTitle>
            </DialogHeader>
            <GroupMemberList conversationId={conversationId} />
          </DialogContent>
        </Dialog>
      )}

      {/* Change Group Name Dialog */}
      {conversation?.isGroup && (
        <ChangeGroupNameDialog
          open={showChangeNameDialog}
          onOpenChange={setShowChangeNameDialog}
          conversationId={conversationId}
          currentName={conversation.groupName || ""}
        />
      )}

      {/* Delete Group Dialog */}
      {conversation?.isGroup && (
        <ConfirmDeleteGroupDialog
          open={showDeleteGroupDialog}
          onOpenChange={setShowDeleteGroupDialog}
          conversationId={conversationId}
          groupName={conversation.groupName || ""}
          onDeleted={() => {
            // Navigate away from deleted conversation
            window.location.href = "/";
          }}
        />
      )}

      {/* Leave Group Dialog */}
      {conversation?.isGroup && (
        <ConfirmLeaveGroupDialog
          open={showLeaveGroupDialog}
          onOpenChange={setShowLeaveGroupDialog}
          conversationId={conversationId}
          groupName={conversation.groupName || ""}
          isOwner={conversation.ownerId === currentUserId}
          onLeft={() => {
            // Navigate away from left conversation
            window.location.href = "/";
          }}
        />
      )}
    </div>
  );
}
