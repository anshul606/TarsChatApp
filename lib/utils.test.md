# Timestamp Formatting Utility Test Documentation

## Function: formatMessageTimestamp

**Requirements**: 4.1, 4.2, 4.3

## Test Cases

### Test Case 1: Today's Messages (Requirement 4.1)

**Input**: Current date timestamp at 2:30 PM
**Expected Output**: "2:30 PM"
**Validation**: Time only in 12-hour format with AM/PM

```typescript
const now = new Date();
now.setHours(14, 30, 0, 0);
const result = formatMessageTimestamp(now.getTime());
// Expected: "2:30 PM"
```

### Test Case 2: Previous Day This Year (Requirement 4.2)

**Input**: January 15, 2024 at 2:30 PM (assuming current year is 2024)
**Expected Output**: "Jan 15, 2:30 PM"
**Validation**: Month abbreviation, day, and time

```typescript
const date = new Date(2024, 0, 15, 14, 30, 0, 0); // Jan 15, 2024
const result = formatMessageTimestamp(date.getTime());
// Expected: "Jan 15, 2:30 PM"
```

### Test Case 3: Previous Year (Requirement 4.3)

**Input**: December 25, 2023 at 2:30 PM
**Expected Output**: "Dec 25, 2023, 2:30 PM"
**Validation**: Month abbreviation, day, year, and time

```typescript
const date = new Date(2023, 11, 25, 14, 30, 0, 0); // Dec 25, 2023
const result = formatMessageTimestamp(date.getTime());
// Expected: "Dec 25, 2023, 2:30 PM"
```

### Test Case 4: Morning Time

**Input**: Today at 9:15 AM
**Expected Output**: "9:15 AM"
**Validation**: Correct AM/PM designation

```typescript
const now = new Date();
now.setHours(9, 15, 0, 0);
const result = formatMessageTimestamp(now.getTime());
// Expected: "9:15 AM"
```

### Test Case 5: Midnight

**Input**: Today at 12:00 AM
**Expected Output**: "12:00 AM"
**Validation**: Midnight displays as 12:00 AM, not 0:00 AM

```typescript
const now = new Date();
now.setHours(0, 0, 0, 0);
const result = formatMessageTimestamp(now.getTime());
// Expected: "12:00 AM"
```

### Test Case 6: Noon

**Input**: Today at 12:00 PM
**Expected Output**: "12:00 PM"
**Validation**: Noon displays as 12:00 PM

```typescript
const now = new Date();
now.setHours(12, 0, 0, 0);
const result = formatMessageTimestamp(now.getTime());
// Expected: "12:00 PM"
```

## Implementation Details

The function uses JavaScript's `toLocaleTimeString` and `toLocaleString` methods with specific options to ensure consistent formatting across different locales.

### Logic Flow:

1. Convert timestamp to Date object
2. Check if message is from today (same date, month, year)
3. If today: Return time only
4. Check if message is from current year
5. If this year: Return month, day, and time
6. Otherwise: Return month, day, year, and time

### Locale Settings:

- Locale: 'en-US'
- Hour format: 12-hour with AM/PM
- Month format: Short (3-letter abbreviation)
- Minute format: 2-digit (e.g., "05" not "5")

## Manual Verification

To manually verify the function works correctly:

1. Open browser console on the app
2. Import the function: `import { formatMessageTimestamp } from '@/lib/utils'`
3. Test with various timestamps:

   ```javascript
   // Today
   console.log(formatMessageTimestamp(Date.now()));

   // Yesterday
   const yesterday = Date.now() - 24 * 60 * 60 * 1000;
   console.log(formatMessageTimestamp(yesterday));

   // Last year
   const lastYear = new Date();
   lastYear.setFullYear(lastYear.getFullYear() - 1);
   console.log(formatMessageTimestamp(lastYear.getTime()));
   ```

## Edge Cases Handled

1. **Timezone differences**: Uses local timezone for consistency
2. **Date boundaries**: Correctly identifies "today" even near midnight
3. **Year transitions**: Properly handles messages from previous years
4. **Leap years**: JavaScript Date handles leap years automatically
5. **DST transitions**: Local time formatting accounts for DST

## Browser Compatibility

The function uses standard JavaScript Date methods that are supported in all modern browsers:

- Chrome 24+
- Firefox 29+
- Safari 10+
- Edge (all versions)
