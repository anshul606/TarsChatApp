# ConfirmDeleteGroupDialog Component Test Documentation

## Component Overview

The ConfirmDeleteGroupDialog component provides a confirmation dialog before deleting a group chat. It ensures users understand the permanent nature of the deletion and handles the deletion process with proper error handling and navigation.

## Requirements Validated

- **6.5**: Require confirmation before deleting a Group_Chat

## Usage Example

```tsx
import { ConfirmDeleteGroupDialog } from "@/components/confirm-delete-group-dialog";
import { useState } from "react";

function GroupManagementMenu({ conversation, onDeleted }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <>
      <button onClick={() => setShowDeleteDialog(true)}>Delete Group</button>

      <ConfirmDeleteGroupDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        conversationId={conversation._id}
        groupName={conversation.groupName || ""}
        onDeleted={onDeleted}
      />
    </>
  );
}
```

## Component Props

```typescript
interface ConfirmDeleteGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: Id<"conversations">;
  groupName: string;
  onDeleted?: () => void;
}
```

## Test Cases

### Test Case 1: Display Confirmation Message (Requirement 6.5)

**Steps**:

1. Open the dialog
2. Observe the dialog content

**Expected Result**:

- Dialog title displays: "Delete Group?"
- Dialog description includes the group name
- Warning message states the action is permanent and cannot be undone
- Warning mentions all messages will be removed for all members

**Manual Verification**:

```typescript
// Open dialog and verify all warning text is present
// Group name should be highlighted/bold in the description
```

### Test Case 2: Cancel Deletion

**Steps**:

1. Open the dialog
2. Click "Cancel" button

**Expected Result**:

- Dialog closes
- No mutation is called
- Group remains intact
- onDeleted callback is not triggered

**Manual Verification**:

```typescript
// Click Cancel and verify group still exists
// Check network tab - no delete mutation should be called
```

### Test Case 3: Confirm Deletion

**Steps**:

1. Open the dialog
2. Click "Delete Group" button

**Expected Result**:

- Mutation is called with conversationId
- Dialog closes on success
- onDeleted callback is triggered
- User is navigated away from the deleted conversation

**Manual Verification**:

```typescript
// Click Delete Group and verify:
// 1. Group is removed from conversation list
// 2. User is redirected to conversation list or home
// 3. All messages are deleted
```

### Test Case 4: Loading State During Deletion

**Steps**:

1. Open the dialog
2. Click "Delete Group" button
3. Observe button state during deletion

**Expected Result**:

- Delete button shows "Deleting..." text
- Delete button is disabled
- Cancel button is disabled
- Dialog cannot be closed during deletion

**Manual Verification**:

```typescript
// Observe button states during network request
// Try clicking outside dialog - should not close
```

### Test Case 5: Permission Error Handling

**Steps**:

1. As a non-owner user, attempt to delete the group
2. Click "Delete Group" button

**Expected Result**:

- Error message displays: "Only the group owner can delete the group"
- Dialog remains open
- Group is not deleted

**Manual Verification**:

```typescript
// Test as admin or regular member
// Should see permission error from backend
```

### Test Case 6: Network Error Handling

**Steps**:

1. Simulate network failure
2. Click "Delete Group" button

**Expected Result**:

- Error message displays below the description
- Dialog remains open
- User can retry or cancel

**Manual Verification**:

```typescript
// Disconnect network and try to delete
// Should see error message with retry option
```

### Test Case 7: Error Message Reset

**Steps**:

1. Trigger an error (e.g., permission error)
2. Close the dialog
3. Reopen the dialog

**Expected Result**:

- Error message is cleared
- Dialog shows clean state

**Manual Verification**:

```typescript
// Trigger error, close, reopen
// No error message should be visible
```

### Test Case 8: Destructive Action Styling

**Steps**:

1. Open the dialog
2. Observe the "Delete Group" button styling

**Expected Result**:

- Button uses destructive color scheme (red/danger color)
- Button clearly indicates a dangerous action
- Consistent with other destructive actions in the app

### Test Case 9: Navigation After Deletion

**Steps**:

1. Open a group conversation
2. Delete the group
3. Observe navigation behavior

**Expected Result**:

- User is redirected to conversation list
- Selected conversation is cleared
- No error or blank screen is shown

**Manual Verification**:

```typescript
// Delete group and verify:
// 1. Conversation list is shown
// 2. No conversation is selected
// 3. Deleted group is removed from list
```

### Test Case 10: Real-time Update for Other Members

**Steps**:

1. Open the app in two browser windows with different users
2. In window 1 (owner), delete the group
3. Observe window 2

**Expected Result**:

- Group disappears from conversation list in window 2
- If window 2 has the group open, it should handle the deletion gracefully
- No errors or broken state in window 2

## Visual Features

1. **Dialog Header**: "Delete Group?" title
2. **Description**:
   - Includes group name (highlighted)
   - Clear warning about permanence
   - Mentions all messages will be removed
   - States action cannot be undone
3. **Error Display**: Red text below description when errors occur
4. **Buttons**:
   - Cancel: Default variant
   - Delete Group: Destructive variant (red)

## Accessibility

- Dialog has proper AlertDialog role
- Buttons are keyboard accessible
- Error messages have role="alert"
- Dialog can be closed with Escape key (when not loading)
- Focus is trapped within dialog
- Focus returns to trigger element on close

## Edge Cases Handled

1. **Deletion during loading**: Prevented by disabled state
2. **Permission errors**: Displayed to user with specific message
3. **Network errors**: Displayed to user with retry option
4. **Dialog close during loading**: Prevented
5. **Multiple rapid clicks**: Prevented by loading state
6. **Group already deleted**: Handled by backend error

## Integration Points

- **Mutation**: `api.conversations.deleteConversation`
- **Backend Validation**: Server-side checks for owner permissions
- **Real-time Updates**: Convex subscriptions propagate deletion to all clients
- **Navigation**: onDeleted callback triggers navigation logic

## Security Considerations

1. **Server-side permission check**: Backend verifies user is owner
2. **Confirmation required**: User must explicitly confirm deletion
3. **Clear warning**: User understands consequences before proceeding

## Future Enhancements

- Option to archive instead of delete
- Confirmation via typing group name
- Delay before final deletion (grace period)
- Export messages before deletion
- Transfer ownership option before deletion
