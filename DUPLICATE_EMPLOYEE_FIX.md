# Fix for Duplicate Employee Issue

## Problem Description

When employees had their teams changed (e.g., promotions from Voice to CS IR), the system was treating them as two different people:

1. **September CSV**: Tanema in VOICE team, Meena in TL team (28 employees total)
2. **October CSV**: Tanema in CS IR team, Meena in TL team (37 employees total)
3. **Issue**: System showed 11 new employees instead of 9 (counted Tanema and Meena as 2 new people)
4. **Search Issue**: Searching for "Tanema" showed 2 results (VOICE and CS IR)

## Root Cause

The `merge()` function in `lib/googleSync.ts` did not check for employees in other teams when merging data from multiple Google Sheets. When an employee changed teams:
- They remained in their old team (e.g., VOICE)
- They were also added to their new team (e.g., CS IR)
- This created duplicates in `allEmployees` array
- Search showed multiple results for the same employee

## Solution

### Changes Made

1. **lib/googleSync.ts** - Updated `merge()` function:
   - Added logic to check if employee exists in ANY other team
   - Remove employee from old team when adding to new team
   - Use Map-based deduplication when building `allEmployees`
   - Ensures each employee ID appears only once

2. **lib/rosterMerge.ts** - Updated `mergeCsvIntoGoogle()` function:
   - Applied same Map-based deduplication logic
   - Ensures consistency across CSV upload and Google Sheets sync

### Key Changes

#### Before (googleSync.ts):
```typescript
// Only checked if employee exists in CURRENT team
const existing = base.teams[team].find(e=>e.id===emp.id);
// Did not check or remove from other teams

// Built allEmployees without deduplication
const all:any[] = [];
Object.entries(base.teams).forEach(([team,emps])=>{
  emps.forEach(e=>{ all.push(e); });
});
base.allEmployees = all;
```

#### After (googleSync.ts):
```typescript
// Check if employee exists in ANY OTHER team and remove them
Object.entries(base.teams).forEach(([otherTeam, otherEmps])=>{
  if (otherTeam !== team) {
    const idx = otherEmps.findIndex(e=>e.id===emp.id);
    if (idx > -1) {
      base.teams[otherTeam].splice(idx, 1); // Remove from old team
    }
  }
});

// Build allEmployees with Map deduplication by employee ID
const employeeMap = new Map<string, any>();
Object.entries(base.teams).forEach(([team,emps])=>{
  emps.forEach(e=>{
    employeeMap.set(e.id, e); // Map ensures uniqueness
  });
});
base.allEmployees = Array.from(employeeMap.values());
```

## Testing

Created comprehensive tests to verify:

1. **Team Changes**: Employee moves from one team to another
   - ✅ Appears only once in `allEmployees`
   - ✅ Shows under current team only
   - ✅ Previous team is empty of that employee

2. **Multiple Team Changes**: Multiple employees change teams in same sync
   - ✅ All employees deduplicated correctly
   - ✅ Correct count of unique employees

3. **Data Corruption**: Even if input has duplicates
   - ✅ Map deduplication ensures clean output
   - ✅ No duplicates in final data

4. **Same Team**: Employee stays in same team across months
   - ✅ Schedule data merged correctly
   - ✅ No duplication within team

## Expected Behavior After Fix

1. **Search**: Searching for "Tanema" returns exactly 1 result
   - Shows current team: CS IR
   - Shows complete schedule (September + October dates)

2. **New Employee Count**: Correctly identifies truly new employees
   - Ignores team changes
   - Counts only employees with new IDs

3. **Admin Panel**: Shows each employee only once
   - Under their current team
   - With complete schedule history

4. **Client Dashboard**: Employee search works correctly
   - Single result per employee
   - Shows current team and full schedule

## Data Integrity

The fix ensures:
- ✅ Each employee ID appears exactly once in `allEmployees`
- ✅ Employee appears in only one team at a time
- ✅ Schedule data preserved across all months
- ✅ Team changes tracked by removing from old team, adding to new team

## Future Enhancements

For historical team tracking (showing "previously: Voice" label), consider:
- Extending Employee type with `teamHistory: Array<{team: string, startDate: string, endDate?: string}>`
- Update merge logic to record team changes with dates
- UI components to show historical team on date selection

This would require more extensive changes beyond the minimal fix for the duplicate issue.
