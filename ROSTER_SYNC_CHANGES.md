# Roster Sync Tab Changes

## Overview
This document summarizes the changes made to merge the Data Sync and Google Sheets tabs into a single "Roster Sync" tab, along with improvements to the Hard Reset functionality.

## Changes Implemented

### 1. New "Roster Sync" Tab
A new consolidated tab that combines:
- **Data Synchronization** (formerly "Data Sync" tab)
- **Google Sheets Links Management** (formerly "Google Sheets" tab)
- **Reset Operations** (moved from other tabs)

### 2. Tab Organization

**Before:**
1. Dashboard
2. Schedule Requests
3. Data Sync
4. Google Sheets
5. Roster Data
6. CSV Import
7. My Profile
8. Team Management
9. User Management

**After:**
1. Dashboard
2. Schedule Requests
3. **Roster Sync** ⭐ (New merged tab)
4. Roster Data
5. CSV Import
6. My Profile
7. Team Management
8. User Management

### 3. Roster Sync Tab Sections

#### Section 1: 📊 Data Synchronization
- **Sync Google Sheets Now** button - Manual sync trigger
- **Auto-Sync Toggle** - Enable/disable 5-minute automatic sync
- **Statistics Cards:**
  - Google Data status
  - Admin Data status
  - Employees count
  - Teams count
  - Date Columns count
  - Modified Shifts count
- Last sync time display
- Auto-sync status indicator

#### Section 2: 🔗 Google Sheets Links
- Add new Google Sheets link with month (YYYY-MM) and CSV URL
- View existing links in a table
- Delete links functionality
- Instructions for publishing Google Sheets as CSV

#### Section 3: ↺ Reset Operations
##### Reset to Google/CSV Data
- Resets admin roster data to match original Google Sheets or CSV data
- Removes all manual shift modifications
- Button moved from Roster Data tab

##### ⚠️ Hard Reset (Danger Zone)
- **Enhanced to delete 4 files** (previously only 2):
  1. `admin_data.json` - Admin modified roster data
  2. `google_data.json` - Google Sheets imported data
  3. `modified_shifts.json` - Shift modification history
  4. `schedule_requests.json` - All schedule requests
- Double confirmation dialog
- Clear warnings about permanent deletion
- Button moved from CSV Import tab

### 4. Files Modified

**New File:**
- `components/AdminTabs/RosterSyncTab.tsx` - Complete merged functionality

**Updated Files:**
- `app/api/admin/hard-reset/route.ts` - Now deletes 4 files instead of 2
- `components/AdminLayoutShell.tsx` - Updated tab navigation
- `app/admin/dashboard/page.tsx` - Replaced DataSyncTab and GoogleLinksTab with RosterSyncTab
- `components/AdminTabs/RosterDataTab.tsx` - Removed "Reset to Google/CSV" button
- `components/AdminTabs/CsvImportTab.tsx` - Removed "Hard Reset" section

### 5. Screenshots Captured
- `MANUAL_SCREENSHOTS/admin/17_roster_sync_tab_merged.png` - New Roster Sync tab
- `MANUAL_SCREENSHOTS/admin/18_roster_data_no_reset.png` - Roster Data tab without reset button
- `MANUAL_SCREENSHOTS/admin/19_csv_import_no_hard_reset.png` - CSV Import tab without hard reset

## Benefits

1. **Better Organization**: All roster synchronization features in one logical place
2. **Cleaner Navigation**: Reduced from 9 tabs to 8 tabs
3. **Comprehensive Reset**: Hard reset now properly cleans ALL data files, not just roster data
4. **Improved UX**: Reset operations grouped together with clear warnings
5. **Consistent Layout**: Three well-organized sections with clear headings

## Testing Workflow

### To Test Data Sync:
1. Go to Admin Panel → Roster Sync tab
2. Click "🔄 Sync Google Sheets Now"
3. Verify sync statistics update
4. Check "Last sync" time

### To Test Google Links:
1. Go to Admin Panel → Roster Sync tab
2. Scroll to "Google Sheets Links" section
3. Enter month (e.g., "2025-11") and CSV URL
4. Click "💾 Save Link"
5. Verify link appears in table
6. Test delete functionality

### To Test Reset to Google/CSV:
1. Go to Roster Data tab
2. Modify a shift
3. Go to Roster Sync tab → Reset Operations
4. Click "↺ Reset to Google/CSV"
5. Confirm the action
6. Verify modification is reverted

### To Test Hard Reset:
1. Go to Roster Sync tab → Reset Operations
2. Scroll to "Hard Reset (Danger Zone)"
3. Click "🗑️ Hard Reset All Data"
4. Confirm twice
5. Verify all 4 data files are deleted:
   - Check `data/admin_data.json` - should be deleted
   - Check `data/google_data.json` - should be deleted
   - Check `data/modified_shifts.json` - should be deleted
   - Check `data/schedule_requests.json` - should be deleted
6. Upload a new CSV to restore data

### Complete CSV Workflow Test:
1. **Hard Reset**: Go to Roster Sync → Hard Reset → Confirm deletion
2. **CSV Upload**: Go to CSV Import → Upload a roster CSV file
3. **Verify Import**: Check Roster Sync statistics show correct data
4. **Modify Shift**: Go to Roster Data → Select date → Click employee shift → Change it
5. **Test Reset**: Go to Roster Sync → Reset to Google/CSV → Verify modification reverted

## API Endpoint Updated

### `/api/admin/hard-reset` (POST)
**Before:**
```typescript
// Deleted only 2 files
deleteFile(GOOGLE_DATA_FILE);
deleteFile(ADMIN_DATA_FILE);
```

**After:**
```typescript
// Now deletes 4 files
deleteFile(GOOGLE_DATA_FILE);
deleteFile(ADMIN_DATA_FILE);
deleteFile(MODIFIED_SHIFTS_FILE);
deleteFile(SCHEDULE_REQUESTS_FILE);
```

**Response:**
```json
{
  "success": true,
  "message": "All roster data has been reset. Deleted: admin_data.json, google_data.json, modified_shifts.json, and schedule_requests.json"
}
```

## Migration Notes

- **Old tabs removed**: DataSyncTab and GoogleLinksTab components are no longer used but remain in the codebase for reference
- **Tab IDs changed**: `data-sync` and `google-links` replaced with `roster-sync`
- **No breaking changes**: All existing API endpoints remain unchanged
- **Auto-sync continues**: If auto-sync was enabled, it continues working in the new tab

## Future Improvements

Potential enhancements for consideration:
1. Add progress indicators for sync operations
2. Show sync history/logs
3. Allow scheduling syncs at specific times
4. Add email notifications for failed syncs
5. Export logs as CSV for audit purposes

---

**Status**: ✅ Complete and tested
**Version**: 1.0
**Date**: October 16, 2025
**Commit**: 4758748
