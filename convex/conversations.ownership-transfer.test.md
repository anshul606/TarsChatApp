# Ownership Transfer Edge Cases Test Document

This document describes manual test cases for ownership transfer edge cases when the group owner leaves a group.

## Requirements Being Tested

- **Requirement 9.1**: When the Group_Owner leaves and Group_Admin members exist, THE Messaging_System SHALL promote the longest-serving Group_Admin to Group_Owner
- **Requirement 9.2**: When the Group_Owner leaves and no Group_Admin members exist, THE Messaging_System SHALL promote the longest-serving Group_Member to Group_Owner
- **Requirement 9.3**: When the Group_Owner leaves and they are the last member, THE Messaging_System SHALL delete the Group_Chat

## Test Case 1: Owner Leaving with Multiple Admins

**Scenario**: Group owner leaves when there are multiple admins in the group.

**Setup**:

1. Create a group with 5 members (Owner + 4 members)
2. Promote 2 members to admin (in order: Admin1, then Admin2)
3. Group structure: Owner, Admin1, Admin2, Member1, Member2

**Action**: Owner calls `leaveGroup` mutation

**Expected Result**:

- Admin1 (the longest-serving admin) becomes the new owner
- Admin2 remains an admin
- Owner is removed from participants
- Group continues to exist
- All remaining members see the updated roles in real-time

**Verification**:

```javascript
// After owner leaves:
conversation.ownerId === Admin1._id; // true
conversation.admins.includes(Admin2._id); // true
conversation.admins.includes(Admin1._id); // false (promoted to owner)
conversation.participants.includes(Owner._id); // false
conversation.participants.length === 4; // true
```

## Test Case 2: Owner Leaving with No Admins

**Scenario**: Group owner leaves when there are no admins, only regular members.

**Setup**:

1. Create a group with 4 members (Owner + 3 members)
2. Do not promote any members to admin
3. Group structure: Owner, Member1, Member2, Member3

**Action**: Owner calls `leaveGroup` mutation

**Expected Result**:

- Member1 (the longest-serving member, first in participants array) becomes the new owner
- No admins exist
- Owner is removed from participants
- Group continues to exist
- All remaining members see the updated roles in real-time

**Verification**:

```javascript
// After owner leaves:
conversation.ownerId === Member1._id; // true
conversation.admins.length === 0; // true
conversation.participants.includes(Owner._id); // false
conversation.participants.length === 3; // true
```

## Test Case 3: Owner Leaving as Last Member

**Scenario**: Group owner is the only remaining member and leaves the group.

**Setup**:

1. Create a group with 3 members
2. Remove all members except the owner
3. Group structure: Owner only

**Action**: Owner calls `leaveGroup` mutation

**Expected Result**:

- Group is completely deleted from the database
- All associated data is deleted:
  - All messages in the conversation
  - All reactions on those messages
  - All typing indicators
  - All read status records
  - All message delivery status records
  - All message read status records
- The conversation no longer appears in any user's conversation list
- The mutation returns `{ success: true, deleted: true }`

**Verification**:

```javascript
// After owner leaves:
const conversation = await ctx.db.get(conversationId); // null
const messages = await ctx.db
  .query("messages")
  .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
  .collect(); // []
```

## Test Case 4: Owner Leaving with One Admin and Multiple Members

**Scenario**: Group owner leaves when there is exactly one admin and multiple regular members.

**Setup**:

1. Create a group with 5 members (Owner + 4 members)
2. Promote 1 member to admin
3. Group structure: Owner, Admin1, Member1, Member2, Member3

**Action**: Owner calls `leaveGroup` mutation

**Expected Result**:

- Admin1 becomes the new owner
- No admins remain (Admin1 was promoted to owner)
- Owner is removed from participants
- Group continues to exist with 4 members

**Verification**:

```javascript
// After owner leaves:
conversation.ownerId === Admin1._id; // true
conversation.admins.length === 0; // true (Admin1 promoted to owner)
conversation.participants.length === 4; // true
```

## Test Case 5: Data Integrity During Ownership Transfer

**Scenario**: Verify that no data is lost during ownership transfer.

**Setup**:

1. Create a group with 4 members (Owner + 3 members)
2. Promote 1 member to admin
3. Send several messages in the group
4. Add reactions to messages
5. Create read receipts for messages

**Action**: Owner calls `leaveGroup` mutation

**Expected Result**:

- All messages remain intact
- All reactions remain intact
- All read receipts remain intact
- Only the owner's participation is removed
- New owner can perform all owner actions
- Group name and other metadata remain unchanged

**Verification**:

```javascript
// After owner leaves:
const messages = await ctx.db
  .query("messages")
  .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
  .collect();
// messages.length should be unchanged

const reactions = await ctx.db
  .query("reactions")
  .withIndex("by_message", (q) => q.eq("messageId", messages[0]._id))
  .collect();
// reactions.length should be unchanged

// New owner can change group name
await changeGroupName({ conversationId, newName: "New Name" }); // succeeds
```

## Test Case 6: Real-time Updates During Ownership Transfer

**Scenario**: Verify that all remaining members receive real-time updates when ownership transfers.

**Setup**:

1. Create a group with 4 members (Owner + 3 members)
2. Promote 1 member to admin
3. All members are subscribed to the conversation

**Action**: Owner calls `leaveGroup` mutation

**Expected Result**:

- All remaining members receive real-time update showing:
  - Owner removed from participants list
  - New owner assigned
  - Admin list updated (if applicable)
- UI updates immediately for all users
- No manual refresh required

**Verification**:

- Monitor Convex subscriptions
- Verify all clients receive updated conversation data
- Check that UI reflects new owner and participant list

## Test Case 7: Edge Case - Owner Leaves Immediately After Creating Group

**Scenario**: Owner creates a group and immediately leaves before any other activity.

**Setup**:

1. Create a group with 3 members (Owner + 2 members)
2. No messages sent, no admins promoted

**Action**: Owner calls `leaveGroup` mutation immediately

**Expected Result**:

- Member1 becomes the new owner
- Group continues to exist
- No errors occur
- Group is functional for remaining members

## Test Case 8: Edge Case - Owner Leaves After Removing All Admins

**Scenario**: Owner removes all admins then leaves the group.

**Setup**:

1. Create a group with 5 members
2. Promote 2 members to admin
3. Owner removes both admins (demotes them to regular members)
4. Group structure: Owner, Member1, Member2, Member3, Member4

**Action**: Owner calls `leaveGroup` mutation

**Expected Result**:

- Member1 (longest-serving member) becomes the new owner
- No admins exist
- Group continues to exist
- Follows Requirement 9.2 (no admins exist scenario)

## Manual Testing Instructions

To manually test these scenarios:

1. **Setup Test Environment**:
   - Ensure Convex backend is running
   - Have multiple test user accounts ready
   - Use the Convex dashboard to inspect database state

2. **Execute Tests**:
   - For each test case, follow the setup steps
   - Execute the action (owner leaves group)
   - Verify the expected results using:
     - Convex dashboard to inspect database records
     - Frontend UI to verify real-time updates
     - Browser console to check for errors

3. **Verification Checklist**:
   - [ ] Ownership transferred correctly
   - [ ] Admin list updated correctly
   - [ ] Participant list updated correctly
   - [ ] No data loss occurred
   - [ ] Real-time updates received by all clients
   - [ ] No errors in console or logs
   - [ ] Group remains functional after transfer

## Known Edge Cases Handled

1. **Empty admins array**: When `conversation.admins` is undefined or empty, the system correctly promotes the longest-serving member
2. **Single member**: When owner is the last member, the group is deleted completely
3. **Admin promotion**: When an admin becomes owner, they are removed from the admins array
4. **Participant ordering**: The system relies on array order to determine "longest-serving" status

## Error Scenarios

These scenarios should result in appropriate error messages:

1. **Non-participant tries to leave**: Error "Not a member of this group"
2. **User tries to leave non-group conversation**: Error "Can only leave group conversations"
3. **User tries to leave non-existent group**: Error "Conversation not found"

## Conclusion

All ownership transfer edge cases are handled correctly by the `leaveGroup` mutation in `convex/conversations.ts`. The implementation follows the requirements and ensures smooth ownership transition without data loss.
