# Testing Guide for Duplicate Employee Fix

## Problem Fixed
Employees who changed teams across months (e.g., September to October) were appearing multiple times in:
- Employee search results
- Admin Data roster view
- Google Data roster view
- Calendar views

## What Was Fixed
Modified the data merge logic to properly handle employee team changes:
1. **lib/googleSync.ts** - `merge()` function now removes employees from old teams before adding to new team
2. **lib/dataStore.ts** - `setGoogle()` function now checks for employees across ALL teams and removes duplicates
3. Both functions now ensure employees appear only once, in their current team

## How to Test

### Test Scenario 1: Upload Two Monthly Rosters with Team Change

1. **Prepare Test Data**
   Create two CSV files:

   **september_roster.csv:**
   ```csv
   Team,Name,ID,1Sep,2Sep,3Sep,4Sep,5Sep
   VOICE,Tanema Akter,SLL-88328,M2,M3,D1,D2,DO
   VOICE,Other Employee,SLL-99999,D1,D1,D1,D1,D1
   ```

   **october_roster.csv:**
   ```csv
   Team,Name,ID,1Oct,2Oct,3Oct,4Oct,5Oct
   CS IR,Tanema Akter,SLL-88328,M3,M3,M3,DO,DO
   VOICE,Other Employee,SLL-99999,D1,D1,D1,D1,D1
   ```

2. **Upload September Data**
   - Login to admin panel
   - Go to "Google Data" tab
   - Upload september_roster.csv
   - Verify Tanema appears in VOICE team only

3. **Upload October Data**
   - Upload october_roster.csv
   - **Expected Result:** Tanema should now appear ONLY in CS IR team, NOT in VOICE team
   - Check both "Admin Data" and "Google Data" tabs
   - Verify total employee count is 2 (not 3)

4. **Search for Employee**
   - Go to Client Page
   - Search for "Tanema"
   - **Expected Result:** Should show exactly 1 result showing CS IR team

### Test Scenario 2: Sync Multiple Google Sheets

1. **Configure Google Sheets Links**
   - Add links for September and October sheets
   - Each sheet should have the employee in different teams

2. **Run Sync**
   - Click "Sync Google Sheets" button
   - **Expected Result:** No duplicate employees in the roster
   - Employee should appear in the most recently synced team only

### Test Scenario 3: Verify Search Functionality

1. **Search in Client Page**
   - Login as any employee
   - Use the employee search
   - Search for an employee who changed teams
   - **Expected Result:** 
     - Should appear exactly once
     - Should show current team assignment
     - Should be able to view their schedule for both months

### Verification Checklist

After any roster update, verify:
- [ ] No duplicate employee names in search results
- [ ] Each employee appears in only one team in Admin Data
- [ ] Each employee appears in only one team in Google Data
- [ ] Total employee count matches expected number
- [ ] Employee schedule shows data from all months
- [ ] Calendar view shows employee only once

### Developer Testing

Run the automated tests in `/tmp`:
```bash
# Test merge function
node /tmp/test_deduplication.js

# Test setGoogle function
node /tmp/test_setgoogle.js

# Test full CSV upload flow
node /tmp/test_full_flow.js
```

All tests should output "SUCCESS" messages with no duplicates detected.

## Expected Behavior After Fix

1. **Employee changes teams**: Old team entry is removed, only new team entry remains
2. **Search results**: Each employee appears exactly once
3. **Schedule data**: Employee retains schedule data from all months
4. **Team assignment**: Shows current (most recent) team assignment
5. **Historical data**: Can still view previous month schedules with note about previous team

## Code Changes Summary

### lib/googleSync.ts - merge() function
- Added logic to check if employee exists in other teams
- Removes employee from old team before adding to new team
- Ensures currentTeam and team properties are properly set

### lib/dataStore.ts - setGoogle() function  
- Added cross-team deduplication when syncing from Google to Admin data
- Removes employee from old team in Admin data when found in new team in Google data
- Updates team assignment properties when team changes

### Existing Safeguards
- `rebuildAllEmployees()` uses Map for deduplication by employee ID
- `rosterMerge.ts` already had deduplication logic for CSV uploads
- Frontend `getAllEmployees()` also uses Map-based deduplication

## Notes for User

The fix ensures that:
- When you search for "Tanema" in Client Page, you'll see her only once
- She'll be shown in the CS IR team (current assignment)  
- Her schedule will include both September and October data
- In Admin Data and Google Data, she appears only once in CS IR team
- The employee count will be accurate (37 instead of 39 in your case)

If you still see duplicates after applying this fix:
1. Re-sync Google Sheets to apply the fix to existing data
2. Or manually delete duplicate entries in Admin panel
3. The fix prevents new duplicates from being created going forward
