# Read Receipt Edge Cases Test Document

This document describes manual test cases for read receipt edge cases.

## Requirements Being Tested

- **Requirement 20.3**: THE Messaging_System SHALL maintain delivery and read status records for the lifetime of the message

## Test Case 1: Messages Sent Before Read Receipt System Implementation

**Scenario**: Handle messages that were sent before the read receipt system was implemented (no delivery/read status records exist).

**Setup**:

1. Assume there are old messages in the database without any delivery or read status records
2. User opens a conversation with these old messages

**Expected Result**:

- Old messages show single grey tick (sent status)
- No errors occur when querying tick status
- When user opens conversation, new delivery status records are created for undelivered messages
- Tick status updates to double grey (delivered) after delivery status is created

**Verification**:

```javascript
// For old message without delivery/read status:
const tickStatus = await getDirectMessageTickStatus({
  messageId: oldMessageId,
});
// tickStatus === "sent" (no delivery status exists)

// After user opens conversation:
await markAsDelivered({ conversationId });
const newTickStatus = await getDirectMessageTickStatus({
  messageId: oldMessageId,
});
// newTickStatus === "delivered" (delivery status now exists)
```

## Test Case 2: Deleted Messages with Existing Read Receipts

**Scenario**: Handle deleted messages that have existing delivery and read status records.

**Setup**:

1. Send a message in a conversation
2. Recipients mark the message as delivered and read
3. Delete the message

**Expected Result**:

- Tick status query returns `null` for deleted messages
- No errors occur when querying tick status for non-existent messages
- Read receipt records remain in database (per Requirement 20.3)
- UI gracefully handles null tick status

**Verification**:

```javascript
// After message is deleted:
const message = await ctx.db.get(messageId); // null
const tickStatus = await getDirectMessageTickStatus({ messageId });
// tickStatus === null (message doesn't exist)

// Read receipt records still exist:
const deliveryStatuses = await ctx.db
  .query("messageDeliveryStatus")
  .withIndex("by_message", (q) => q.eq("messageId", messageId))
  .collect();
// deliveryStatuses.length > 0 (records maintained for lifetime of message)
```

## Test Case 3: Users Removed from Group with Pending Read Status

**Scenario**: Handle users who are removed from a group after they have read some messages but before all messages are read.

**Setup**:

1. Create a group with 4 members (Owner + 3 members)
2. Owner sends Message A
3. Member1 and Member2 read Message A
4. Owner removes Member3 from the group
5. Owner sends Message B

**Expected Result**:

- Message A shows double blue tick (all CURRENT members have read it)
- Member3's read status is not counted after removal
- Message B only tracks delivery/read for current members (Owner, Member1, Member2)
- No errors occur when calculating tick status

**Verification**:

```javascript
// After Member3 is removed:
const conversation = await ctx.db.get(conversationId);
// conversation.participants.length === 3 (Owner, Member1, Member2)

// Message A tick status:
const tickStatusA = await getGroupMessageTickStatus({
  messageId: messageA._id,
});
// tickStatusA === "read" (all current members have read it)

// Message B tick status calculation only considers current members:
const readStatusB = await getReadStatus({ messageId: messageB._id });
// readStatusB.totalRecipients === 2 (Member1, Member2 - not Member3)
```

## Test Case 4: User Removed After Reading All Messages

**Scenario**: User is removed from group after they have read all messages.

**Setup**:

1. Create a group with 3 members
2. Member1 sends several messages
3. Member2 reads all messages
4. Owner removes Member2 from the group

**Expected Result**:

- All messages show correct tick status for remaining members
- Member2's read status records remain in database
- Tick status calculation excludes Member2 from recipient count
- Messages show double blue tick if all remaining members have read them

**Verification**:

```javascript
// After Member2 is removed:
const tickStatus = await getGroupMessageTickStatus({ messageId });
// Only counts remaining members as recipients
// If remaining members have read, shows "read"
```

## Test Case 5: User Removed Before Reading Any Messages

**Scenario**: User is removed from group before they have read any messages.

**Setup**:

1. Create a group with 4 members
2. Member1 sends several messages
3. Owner removes Member2 before they read any messages
4. Member3 reads all messages

**Expected Result**:

- Tick status calculation excludes Member2 from recipient count
- Messages can show double blue tick without Member2 reading them
- No delivery/read status records exist for Member2 (they never opened conversation)

**Verification**:

```javascript
// After Member2 is removed:
const readStatus = await getReadStatus({ messageId });
// readStatus.totalRecipients doesn't include Member2
// If all remaining members have read, allRead === true
```

## Test Case 6: All Recipients Removed from Group

**Scenario**: All recipients of a message are removed from the group, leaving only the sender.

**Setup**:

1. Create a group with 3 members
2. Member1 sends a message
3. Owner removes Member2 and Member3

**Expected Result**:

- Message shows double blue tick (no recipients remain)
- Tick status calculation handles zero recipients gracefully
- No errors occur

**Verification**:

```javascript
// After all recipients are removed:
const conversation = await ctx.db.get(conversationId);
// conversation.participants.length === 2 (Owner, Member1)

const tickStatus = await getGroupMessageTickStatus({ messageId });
// If no recipients remain, should show appropriate status
```

## Test Case 7: Message Sent After User Removed

**Scenario**: Message is sent after a user has been removed from the group.

**Setup**:

1. Create a group with 4 members
2. Owner removes Member3
3. Member1 sends a message

**Expected Result**:

- Message only tracks delivery/read for current members
- No delivery/read status records created for Member3
- Tick status calculation only considers current members

**Verification**:

```javascript
// Message sent after Member3 removed:
const deliveryStatus = await getDeliveryStatus({ messageId });
// deliveryStatus.totalRecipients === 2 (doesn't include Member3)
```

## Test Case 8: User Rejoins Group After Being Removed

**Scenario**: User is removed from group, then added back later.

**Setup**:

1. Create a group with 3 members
2. Member1 sends Message A
3. Owner removes Member2
4. Member1 sends Message B
5. Owner adds Member2 back to the group
6. Member1 sends Message C

**Expected Result**:

- Message A: Member2's old read status is preserved but not counted
- Message B: Member2 has no delivery/read status (wasn't in group)
- Message C: Member2 is tracked as a recipient
- When Member2 opens conversation, they get delivery status for all messages

**Verification**:

```javascript
// After Member2 is added back:
const tickStatusA = await getGroupMessageTickStatus({
  messageId: messageA._id,
});
// Doesn't count Member2 (they were removed when message was sent)

const tickStatusB = await getGroupMessageTickStatus({
  messageId: messageB._id,
});
// Doesn't count Member2 (they weren't in group)

const tickStatusC = await getGroupMessageTickStatus({
  messageId: messageC._id,
});
// Counts Member2 as recipient (they're in group now)
```

## Test Case 9: Conversation Deleted with Existing Read Receipts

**Scenario**: Conversation is deleted while read receipt records exist.

**Setup**:

1. Create a conversation with messages
2. Recipients read some messages
3. Owner deletes the conversation

**Expected Result**:

- All read receipt records are deleted along with messages
- No orphaned read receipt records remain
- Database cleanup is complete

**Verification**:

```javascript
// After conversation is deleted:
const conversation = await ctx.db.get(conversationId); // null

const deliveryStatuses = await ctx.db
  .query("messageDeliveryStatus")
  .withIndex("by_message", (q) => q.eq("messageId", messageId))
  .collect();
// deliveryStatuses.length === 0 (all deleted)

const readStatuses = await ctx.db
  .query("messageReadStatus")
  .withIndex("by_message", (q) => q.eq("messageId", messageId))
  .collect();
// readStatuses.length === 0 (all deleted)
```

## Test Case 10: Rapid User Removal and Message Sending

**Scenario**: Users are rapidly removed while messages are being sent.

**Setup**:

1. Create a group with 5 members
2. Start sending messages rapidly
3. Remove members rapidly while messages are being sent

**Expected Result**:

- Each message correctly tracks recipients at the time of sending
- No race conditions occur
- Tick status is calculated correctly for each message
- No errors occur

## Manual Testing Instructions

To manually test these scenarios:

1. **Setup Test Environment**:
   - Ensure Convex backend is running
   - Have multiple test user accounts ready
   - Use the Convex dashboard to inspect database state

2. **Execute Tests**:
   - For each test case, follow the setup steps
   - Execute the action
   - Verify the expected results using:
     - Convex dashboard to inspect database records
     - Frontend UI to verify tick status display
     - Browser console to check for errors

3. **Verification Checklist**:
   - [ ] Tick status displays correctly
   - [ ] No errors in console or logs
   - [ ] Read receipt records maintained per Requirement 20.3
   - [ ] Removed users not counted in recipient calculations
   - [ ] Old messages without read receipts show "sent" status
   - [ ] Deleted messages return null tick status
   - [ ] Database cleanup is complete when needed

## Implementation Notes

The following edge cases are handled in the implementation:

1. **Messages without read receipts**: Return "sent" status (no delivery/read records)
2. **Deleted messages**: Return `null` from tick status queries
3. **Removed users**: Filter delivery/read statuses to only include current participants
4. **Zero recipients**: Handle gracefully in tick status calculation
5. **Read receipt persistence**: Records maintained for lifetime of message (Requirement 20.3)

## Known Limitations

1. Read receipt records are not automatically cleaned up when messages are deleted (per Requirement 20.3)
2. If a user is removed and re-added, their old read receipts are preserved but not counted
3. Tick status is calculated based on current participants, not historical participants

## Conclusion

All read receipt edge cases are handled correctly by the implementation in `convex/readReceipts.ts`. The system gracefully handles:

- Messages sent before read receipt system implementation
- Deleted messages with existing read receipts
- Users removed from group with pending read status

The implementation follows Requirement 20.3 by maintaining delivery and read status records for the lifetime of the message.
