# ChangeGroupNameDialog Component Test Documentation

## Component Overview

The ChangeGroupNameDialog component allows group owners and admins to change the name of a group conversation. It provides validation for empty names and names exceeding 100 characters.

## Requirements Validated

- **4.1**: Group owner can change group name
- **4.2**: Validate that the new group name is not empty
- **4.3**: Validate that the new group name does not exceed 100 characters
- **4.4**: Group name changes update in real-time for all participants
- **4.5**: Updated name displays in conversation sidebar
- **5.1**: Group admin can change group name
- **5.2**: Validate that the new group name is not empty
- **5.3**: Validate that the new group name does not exceed 100 characters
- **5.4**: Regular members cannot change group name
- **5.5**: Group name changes update in real-time for all participants

## Usage Example

```tsx
import { ChangeGroupNameDialog } from "@/components/change-group-name-dialog";
import { useState } from "react";

function GroupManagementMenu({ conversation }) {
  const [showChangeNameDialog, setShowChangeNameDialog] = useState(false);

  return (
    <>
      <button onClick={() => setShowChangeNameDialog(true)}>
        Change Group Name
      </button>

      <ChangeGroupNameDialog
        open={showChangeNameDialog}
        onOpenChange={setShowChangeNameDialog}
        conversationId={conversation._id}
        currentName={conversation.groupName || ""}
      />
    </>
  );
}
```

## Component Props

```typescript
interface ChangeGroupNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: Id<"conversations">;
  currentName: string;
}
```

## Test Cases

### Test Case 1: Empty Name Validation (Requirements 4.2, 5.2)

**Steps**:

1. Open the dialog
2. Leave the input field empty
3. Click "Save" button

**Expected Result**:

- Error message displays: "Group name cannot be empty"
- Mutation is not called
- Dialog remains open

**Manual Verification**:

```typescript
// In browser console, try to submit empty name
// Should see error message and dialog stays open
```

### Test Case 2: Name Length Validation (Requirements 4.3, 5.3)

**Steps**:

1. Open the dialog
2. Enter a name with 101 characters
3. Click "Save" button

**Expected Result**:

- Error message displays: "Group name cannot exceed 100 characters"
- Mutation is not called
- Dialog remains open

**Manual Verification**:

```typescript
// Enter exactly 101 characters in the input
const longName = "a".repeat(101);
// Should see error message
```

### Test Case 3: Valid Name Submission (Requirements 4.1, 5.1)

**Steps**:

1. Open the dialog
2. Enter a valid name (1-100 characters)
3. Click "Save" button

**Expected Result**:

- Mutation is called with trimmed name
- Dialog closes on success
- Form is reset
- No error messages

**Manual Verification**:

```typescript
// Enter "New Group Name" and submit
// Should see dialog close and group name update in UI
```

### Test Case 4: Whitespace Trimming

**Steps**:

1. Open the dialog
2. Enter " New Group Name " (with leading/trailing spaces)
3. Click "Save" button

**Expected Result**:

- Mutation is called with "New Group Name" (trimmed)
- Dialog closes on success

**Manual Verification**:

```typescript
// Check network request to see trimmed value
// Group name should not have leading/trailing spaces
```

### Test Case 5: Permission Error Handling (Requirement 5.4)

**Steps**:

1. As a regular member (not owner/admin), open the dialog
2. Enter a valid name
3. Click "Save" button

**Expected Result**:

- Error message displays: "Only the group owner or admins can change the group name"
- Dialog remains open
- Group name is not changed

**Manual Verification**:

```typescript
// Test as a regular member
// Should see permission error from backend
```

### Test Case 6: Loading State

**Steps**:

1. Open the dialog
2. Enter a valid name
3. Click "Save" button
4. Observe button state during submission

**Expected Result**:

- Save button shows "Saving..." text
- Save button is disabled
- Cancel button is disabled
- Input field is disabled

### Test Case 7: Dialog Reset on Close

**Steps**:

1. Open the dialog
2. Enter some text in the input
3. Click "Cancel" or close the dialog

**Expected Result**:

- Dialog closes
- Input field is cleared
- Error messages are cleared

**Manual Verification**:

```typescript
// Enter text, close dialog, reopen
// Input should be empty
```

### Test Case 8: Save Button Disabled State

**Steps**:

1. Open the dialog
2. Observe the Save button state

**Expected Result**:

- Save button is disabled when input is empty
- Save button is enabled when valid text is entered
- Save button is disabled during loading

### Test Case 9: Maximum Length Enforcement

**Steps**:

1. Open the dialog
2. Try to type more than 100 characters

**Expected Result**:

- Input field has maxLength attribute set to 100
- Cannot type more than 100 characters

### Test Case 10: Real-time Update (Requirements 4.4, 5.5)

**Steps**:

1. Open the app in two browser windows with different users
2. In window 1 (owner/admin), change the group name
3. Observe window 2

**Expected Result**:

- Group name updates in real-time in window 2
- Updated name appears in conversation sidebar
- Updated name appears in chat header

## Visual Features

1. **Dialog Header**: Edit icon with "Change Group Name" title
2. **Description**: Clear instructions about character limits
3. **Input Field**:
   - Placeholder shows current group name
   - Label: "New Group Name"
   - Max length: 100 characters
4. **Error Display**: Red text below input field
5. **Buttons**:
   - Cancel: Outline variant
   - Save: Primary variant, disabled when invalid

## Accessibility

- Input has proper aria-required attribute
- Input has aria-invalid when error exists
- Input has aria-describedby linking to error message
- Buttons have descriptive aria-labels
- Error messages have role="alert"
- Form can be submitted with Enter key

## Edge Cases Handled

1. **Whitespace-only names**: Treated as empty (validation fails)
2. **Exactly 100 characters**: Valid and accepted
3. **Network errors**: Displayed to user with error message
4. **Permission errors**: Displayed to user with specific message
5. **Dialog close during loading**: Prevented by disabled state

## Integration Points

- **Mutation**: `api.conversations.changeGroupName`
- **Backend Validation**: Server-side checks for permissions and validation
- **Real-time Updates**: Convex subscriptions propagate changes to all clients

## Future Enhancements

- Character counter showing remaining characters
- Preview of new name before submission
- Undo functionality
- Name change history/audit log
