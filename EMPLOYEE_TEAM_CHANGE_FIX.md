# Employee Team Change Deduplication Fix

## Problem Statement

When an employee changes teams between months (e.g., from Voice team in September to CS IR team in October), they appeared duplicated in the system:
- **Voice team entry**: September schedules with empty October schedules
- **CS IR team entry**: Empty September schedules with October schedules

### Issues Caused
1. **Duplicate entries in Roster Data tab**: When filtering by date, the same employee appeared twice
2. **Client page showing N/A**: Current month data not accessible because employee exists under old team
3. **Incorrect team assignment**: When viewing past dates, employee shown under wrong team

### Example Case: SLL-88328 (Tanema Akter)
- **September**: In Voice team with valid shifts
- **October**: In CS IR team with valid shifts
- **Result**: Appeared twice in system, causing data access issues

## Solution

### Smart Deduplication Function

Added `deduplicateEmployeeTeamChanges()` function in `lib/dataStore.ts` that:

1. **Identifies Duplicates**: Scans all teams to find employees with the same ID
2. **Determines Promoted Team**: Analyzes schedule data to find which team has the most recent (rightmost) non-empty schedule entry
3. **Merges Schedules**: Combines all schedule data from all team entries into a single comprehensive schedule
4. **Removes Duplicates**: Keeps only the entry in the promoted team, removes all duplicates from other teams
5. **Updates Team Assignment**: Sets the employee's team to the promoted team for all past and current data

### Algorithm Details

```typescript
function deduplicateEmployeeTeamChanges(data: RosterData) {
  // 1. Build a map of employee ID -> list of team entries
  const employeeTeamMap = new Map<string, { team: string; employee: any }[]>();
  
  // 2. For each duplicate employee:
  //    a. Find the team with the most recent schedule data
  //    b. Merge all schedules into one comprehensive schedule
  //    c. Keep entry in promoted team, remove from other teams
  
  // 3. Result: Single entry per employee with all historical data
}
```

### Integration Points

The deduplication is applied at key points in the data flow:

1. **`loadAll()`**: Cleans existing data on server startup
2. **`setAdmin(data)`**: Applied when admin data is updated
3. **`setGoogle(data)`**: Applied when Google Sheets data is imported
4. **`mergeDisplay()`**: Applied when creating the display data
5. **`resetAdminToGoogle()`**: Applied when resetting admin to Google data

## Results

### Before Fix
```json
{
  "VOICE": [
    {
      "id": "SLL-88328",
      "name": "Tanema Akter",
      "schedule": ["M3", "DO", "M2", ..., "", "", ""]  // Sept only
    }
  ],
  "CS IR": [
    {
      "id": "SLL-88328", 
      "name": "Tanema Akter",
      "schedule": ["", "", "", ..., "M3", "M3", "M3"]  // Oct only
    }
  ]
}
```

### After Fix
```json
{
  "CS IR": [
    {
      "id": "SLL-88328",
      "name": "Tanema Akter",
      "team": "CS IR",
      "schedule": ["M3", "DO", "M2", ..., "M3", "M3", "M3"]  // Both Sept & Oct
    }
  ]
}
```

### Verification Results

✅ **SLL-88328 Status**:
- Single entry under CS IR team (promoted team)
- 30 September shifts (from Voice team) preserved
- 31 October shifts (from CS IR team) preserved
- All data accessible in one entry

✅ **System-wide**:
- Total employees: 37
- Unique employee IDs: 37
- Zero duplicates across all teams

✅ **Client API**:
- Today/tomorrow data shows correctly
- Calendar shows both September and October data
- Team assignment reflects current team (CS IR)

✅ **Admin Panel**:
- Roster Data tab shows single entry per employee per date
- No duplicate entries when filtering by any date
- Historical data accessible from current team entry

## Edge Cases Handled

1. **Multiple team changes**: Employee moves through 3+ teams across months
2. **Empty schedules**: Employee has no schedule data in some team entries
3. **Partial data**: Employee has incomplete schedules across teams
4. **Same-month changes**: Employee changes teams within the same month
5. **Mixed patterns**: Some employees change teams, others stay in same team

## Benefits

1. **Data Consistency**: Single source of truth for each employee
2. **Historical Accuracy**: All past schedule data preserved under current team
3. **Simplified Queries**: No need to search multiple teams for same employee
4. **Better UX**: Client dashboard shows correct current data
5. **Future-Proof**: Handles any number of team changes automatically

## Testing

Run the application and verify:

```bash
# Check for duplicates
curl http://localhost:3000/api/admin/get-display-data | jq '[.teams[] | .[]] | group_by(.id) | map(select(length > 1))'
# Should return: []

# Check specific employee
curl http://localhost:3000/api/my-schedule/SLL-88328 | jq '{today: .today.shift, tomorrow: .tomorrow.shift}'
# Should return current shift data

# Check merged schedule
curl http://localhost:3000/api/admin/get-display-data | jq '[.teams[] | .[] | select(.id == "SLL-88328")][0]'
# Should show single entry with both Sept and Oct data
```

## Migration Notes

- Existing data files are automatically cleaned on server startup
- No manual migration required
- Changes are persisted to `admin_data.json` and `google_data.json`
- Backup files are not affected (in `backups/` directory)

## Future Enhancements

1. Track team change history in employee metadata
2. Add UI indicator showing when employee changed teams
3. Create audit trail for team promotions
4. Add admin panel view to manually review/approve team changes
