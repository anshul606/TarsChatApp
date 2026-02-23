# ConfirmLeaveGroupDialog Component Test Documentation

## Component Overview

The ConfirmLeaveGroupDialog component provides a confirmation dialog before leaving a group chat. It ensures users understand the consequences of leaving and handles the leave process with proper error handling and navigation. For group owners, it provides additional context about ownership transfer or group deletion.

## Requirements Validated

- **8.6**: Require confirmation before removing a user from a Group_Chat
- **9.1**: When the Group_Owner leaves and Group_Admin members exist, promote the longest-serving Group_Admin to Group_Owner
- **9.2**: When the Group_Owner leaves and no Group_Admin members exist, promote the longest-serving Group_Member to Group_Owner
- **9.3**: When the Group_Owner leaves and they are the last member, delete the Group_Chat
- **9.4**: When ownership transfers, update the Group_Owner designation in real-time for all remaining members

## Usage Example

```tsx
import { ConfirmLeaveGroupDialog } from "@/components/confirm-leave-group-dialog";
import { useState } from "react";

function GroupManagementMenu({ conversation, currentUserId, onLeft }) {
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const isOwner = conversation.ownerId === currentUserId;

  return (
    <>
      <button onClick={() => setShowLeaveDialog(true)}>Leave Group</button>

      <ConfirmLeaveGroupDialog
        open={showLeaveDialog}
        onOpenChange={setShowLeaveDialog}
        conversationId={conversation._id}
        groupName={conversation.groupName || ""}
        isOwner={isOwner}
        onLeft={onLeft}
      />
    </>
  );
}
```

## Component Props

```typescript
interface ConfirmLeaveGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: Id<"conversations">;
  groupName: string;
  isOwner: boolean;
  onLeft?: () => void;
}
```

## Test Cases

### Test Case 1: Display Confirmation Message for Regular Member (Requirement 8.6)

**Steps**:

1. Open the dialog as a regular member (isOwner=false)
2. Observe the dialog content

**Expected Result**:

- Dialog title displays: "Leave Group?"
- Dialog description includes the group name
- No additional warning about ownership transfer
- Clear confirmation message about leaving

**Manual Verification**:

```typescript
// Open dialog as regular member and verify:
// - Group name is highlighted/bold
// - No ownership transfer warning
```

### Test Case 2: Display Ownership Transfer Warning for Owner (Requirements 9.1, 9.2, 9.3)

**Steps**:

1. Open the dialog as the group owner (isOwner=true)
2. Observe the dialog content

**Expected Result**:

- Dialog title displays: "Leave Group?"
- Dialog description includes the group name
- Additional warning states: "As the group owner, your ownership will be transferred to another member, or the group will be deleted if you are the last member."

**Manual Verification**:

```typescript
// Open dialog as owner and verify:
// - Ownership transfer warning is visible
// - Warning mentions both transfer and deletion scenarios
```

### Test Case 3: Cancel Leave Action

**Steps**:

1. Open the dialog
2. Click "Cancel" button

**Expected Result**:

- Dialog closes
- No mutation is called
- User remains in the group
- onLeft callback is not triggered

**Manual Verification**:

```typescript
// Click Cancel and verify:
// - User still in group
// - Network tab shows no leave mutation
```

### Test Case 4: Confirm Leave as Regular Member

**Steps**:

1. Open the dialog as a regular member
2. Click "Leave Group" button

**Expected Result**:

- leaveGroup mutation is called with conversationId
- Dialog closes on success
- onLeft callback is triggered
- User is navigated away from the group
- Group is removed from user's conversation list

**Manual Verification**:

```typescript
// Click Leave Group and verify:
// 1. Group removed from conversation list
// 2. User redirected to conversation list or home
// 3. User no longer has access to group
```

### Test Case 5: Confirm Leave as Owner with Admins (Requirement 9.1)

**Steps**:

1. Create a group with owner and at least one admin
2. As owner, leave the group
3. Observe the group state

**Expected Result**:

- Owner is removed from participants
- Longest-serving admin is promoted to owner
- Remaining members see ownership change in real-time
- Group continues to exist

**Manual Verification**:

```typescript
// Leave as owner and verify:
// 1. Admin is promoted to owner
// 2. Owner badge updates for all members
// 3. Group remains functional
```

### Test Case 6: Confirm Leave as Owner without Admins (Requirement 9.2)

**Steps**:

1. Create a group with owner and regular members (no admins)
2. As owner, leave the group
3. Observe the group state

**Expected Result**:

- Owner is removed from participants
- Longest-serving member is promoted to owner
- Remaining members see ownership change in real-time
- Group continues to exist

**Manual Verification**:

```typescript
// Leave as owner and verify:
// 1. Regular member is promoted to owner
// 2. Owner badge updates for all members
// 3. Group remains functional
```

### Test Case 7: Confirm Leave as Last Member (Requirement 9.3)

**Steps**:

1. Create a group with only one member (owner)
2. As owner, leave the group
3. Observe the group state

**Expected Result**:

- Group is deleted
- Group is removed from all conversation lists
- No errors occur

**Manual Verification**:

```typescript
// Leave as last member and verify:
// 1. Group is completely deleted
// 2. No orphaned data remains
```

### Test Case 8: Loading State During Leave

**Steps**:

1. Open the dialog
2. Click "Leave Group" button
3. Observe button state during the operation

**Expected Result**:

- Leave button shows "Leaving..." text
- Leave button is disabled
- Cancel button is disabled
- Dialog cannot be closed during the operation

**Manual Verification**:

```typescript
// Observe button states during network request
// Try clicking outside dialog - should not close
```

### Test Case 9: Network Error Handling

**Steps**:

1. Simulate network failure
2. Click "Leave Group" button

**Expected Result**:

- Error message displays below the description
- Dialog remains open
- User can retry or cancel

**Manual Verification**:

```typescript
// Disconnect network and try to leave
// Should see error message with retry option
```

### Test Case 10: Error Message Reset

**Steps**:

1. Trigger an error (e.g., network error)
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

### Test Case 11: Destructive Action Styling

**Steps**:

1. Open the dialog
2. Observe the "Leave Group" button styling

**Expected Result**:

- Button uses destructive color scheme (red/danger color)
- Button clearly indicates a significant action
- Consistent with other destructive actions in the app

### Test Case 12: Navigation After Leaving

**Steps**:

1. Open a group conversation
2. Leave the group
3. Observe navigation behavior

**Expected Result**:

- User is redirected to conversation list
- Selected conversation is cleared
- No error or blank screen is shown

**Manual Verification**:

```typescript
// Leave group and verify:
// 1. Conversation list is shown
// 2. No conversation is selected
// 3. Left group is removed from list
```

### Test Case 13: Real-time Update for Other Members (Requirement 9.4)

**Steps**:

1. Open the app in two browser windows with different users
2. In window 1, leave the group
3. Observe window 2

**Expected Result**:

- Member list updates in window 2
- If window 1 user was owner, ownership transfer is visible in window 2
- No errors or broken state in window 2

**Manual Verification**:

```typescript
// Leave in one window and verify:
// 1. Member list updates in other window
// 2. Owner badge updates if applicable
// 3. Real-time sync works correctly
```

### Test Case 14: Admin Leaving Group

**Steps**:

1. As a group admin (not owner), leave the group
2. Observe the group state

**Expected Result**:

- Admin is removed from participants
- Admin is removed from admins array
- No ownership transfer occurs
- Group continues to exist with owner intact

**Manual Verification**:

```typescript
// Leave as admin and verify:
// 1. Admin removed from group
// 2. Admin badge removed
// 3. Owner remains unchanged
```

## Visual Features

1. **Dialog Header**: "Leave Group?" title
2. **Description**:
   - Includes group name (highlighted)
   - For owners: Additional warning about ownership transfer or deletion
   - For members: Simple confirmation message
3. **Error Display**: Red text below description when errors occur
4. **Buttons**:
   - Cancel: Default variant
   - Leave Group: Destructive variant (red)

## Accessibility

- Dialog has proper AlertDialog role
- Buttons are keyboard accessible
- Error messages have role="alert"
- Dialog can be closed with Escape key (when not loading)
- Focus is trapped within dialog
- Focus returns to trigger element on close

## Edge Cases Handled

1. **Leave during loading**: Prevented by disabled state
2. **Network errors**: Displayed to user with retry option
3. **Dialog close during loading**: Prevented
4. **Multiple rapid clicks**: Prevented by loading state
5. **User already removed**: Handled by backend error
6. **Ownership transfer logic**: Handled by backend mutation

## Integration Points

- **Mutation**: `api.conversations.leaveGroup`
- **Backend Logic**: Server-side handles ownership transfer and group deletion
- **Real-time Updates**: Convex subscriptions propagate member list and ownership changes
- **Navigation**: onLeft callback triggers navigation logic

## Security Considerations

1. **Server-side validation**: Backend verifies user is a member
2. **Confirmation required**: User must explicitly confirm leaving
3. **Ownership transfer**: Automatically handled by backend logic

## Future Enhancements

- Option to rejoin group (if permissions allow)
- Confirmation via typing group name for owners
- Preview of who will become owner before leaving
- Option to transfer ownership to specific member before leaving
- Notification to new owner about ownership transfer
