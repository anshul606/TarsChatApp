# MessageItem Component Test Documentation

## Component Overview

The MessageItem component displays individual messages in a conversation with proper formatting, deletion handling, and user interaction capabilities.

## Requirements Validated

- **4.1**: Today's messages display time only (12-hour with AM/PM)
- **4.2**: Previous days in current year display "MMM D, h:mm A"
- **4.3**: Previous years display "MMM D, YYYY, h:mm A"
- **4.4**: All messages have timestamps
- **11.1**: Users can delete their own messages
- **11.2**: Users cannot delete others' messages
- **11.3**: Deleted messages show "This message was deleted" in italics
- **12.4**: Reactions display with counts (placeholder for future implementation)

## Usage Example

```tsx
import { MessageItem } from "@/components/message-item";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

function ChatArea({ conversationId, currentUserId }) {
  const messages = useQuery(api.messages.list, { conversationId });
  const deleteMessage = useMutation(api.messages.deleteMessage);

  const handleDelete = (messageId) => {
    deleteMessage({ messageId });
  };

  return (
    <div>
      {messages?.map((message) => (
        <MessageItem
          key={message._id}
          message={message}
          currentUserId={currentUserId}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
```

## Component Props

```typescript
interface MessageItemProps {
  message: {
    _id: Id<"messages">;
    content: string;
    isDeleted: boolean;
    createdAt: number;
    senderId: Id<"users">;
    sender?: {
      _id: Id<"users">;
      name: string;
      imageUrl?: string;
    } | null;
  };
  currentUserId: Id<"users">;
  onDelete: (messageId: Id<"messages">) => void;
  onReact?: (messageId: Id<"messages">, emoji: string) => void;
}
```

## Visual Features

1. **Avatar Display**: Shows sender's profile picture or initials
2. **Sender Name**: Displays in bold at the top of the message
3. **Timestamp**: Smart formatting based on message age
4. **Message Content**:
   - Normal messages: Display full content with word wrapping
   - Deleted messages: Show italic "This message was deleted" text
5. **Delete Button**:
   - Only visible on hover for own messages
   - Ghost button with trash icon
   - Hidden for deleted messages
6. **Hover Effect**: Subtle background highlight on hover

## Timestamp Formatting Examples

- **Today**: "2:30 PM"
- **This Year**: "Jan 15, 2:30 PM"
- **Previous Year**: "Dec 25, 2023, 2:30 PM"

## Accessibility

- Delete button has proper aria-label
- Avatar has alt text for images
- Proper semantic HTML structure
- Keyboard accessible buttons

## Future Enhancements

- Reactions display (when reactions API is implemented)
- Reaction picker integration
- Edit functionality
- Message threading
- Link previews
