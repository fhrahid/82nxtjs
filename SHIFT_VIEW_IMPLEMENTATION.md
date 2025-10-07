# Shift View Modal Implementation for Admin Tabs

## Overview
This document describes the implementation of Shift View modals and Reset functionality for the Admin Data and Google Data tabs, mirroring the existing client-side Shift View functionality.

## Requirements Implemented

### 1. Shift View Modals
- ✅ Added "👁️ Shift View" button to **Admin Data Tab**
- ✅ Added "👁️ Shift View" button to **Google Data Tab**
- ✅ Both modals use the existing `ShiftView` component for consistent UI/UX
- ✅ Modals display roster data in a calendar-based interface with filtering capabilities

### 2. Reset to Google Functionality
- ✅ Added "↺ Reset to Google" button to **Admin Data Tab**
- ✅ Button resets admin data to original Google Spreadsheet data
- ✅ Includes confirmation dialog before resetting
- ✅ Uses existing `/api/admin/reset-to-google` endpoint
- ✅ Provides user feedback on success/failure

## Files Modified

### 1. `components/AdminTabs/AdminDataTab.tsx`
**Changes:**
- Imported `ShiftView` component
- Added state variables:
  - `showShiftView`: Controls modal visibility
  - `resetting`: Tracks reset operation state
- Added `resetToGoogle()` function:
  - Shows confirmation dialog
  - Calls `/api/admin/reset-to-google` API
  - Reloads data after successful reset
- Added two new buttons in the action bar:
  - **"👁️ Shift View"**: Opens modal with admin roster data
  - **"↺ Reset to Google"**: Resets admin data to Google data
- Added `ShiftView` modal component at the end of JSX
- Added CSS styling for new buttons:
  - `.adm-btn.view`: Blue color scheme for Shift View button
  - `.adm-btn.reset`: Red color scheme for Reset button

### 2. `components/AdminTabs/GoogleDataTab.tsx`
**Changes:**
- Imported `ShiftView` component
- Added `showShiftView` state variable
- Added "👁️ Shift View" button to actions row
- Added `ShiftView` modal component at the end of JSX

## Technical Details

### Button States
Both new buttons are properly disabled when:
- Data is loading (`loading` state)
- No data is available (`!adminData` or `!data`)
- For Reset button: while saving or resetting is in progress

### Button Styling
- **Shift View Button**: Blue theme (`#3a6599`) to match view/display actions
- **Reset Button**: Red theme (`#8f3e3e`) to indicate destructive action
- Both buttons maintain consistent styling with existing admin buttons
- Hover states and disabled states properly implemented

### Modal Integration
The `ShiftView` component is reused from the client-side implementation:
- Displays roster data in calendar format
- Allows date selection
- Provides shift filtering (M2, M3, M4, Evening, Off)
- Supports team filtering
- Shows employee cards with shift information
- Displays shift statistics

### API Integration
The Reset functionality uses the existing endpoint:
```typescript
POST /api/admin/reset-to-google
Response: { success: boolean, message?: string, error?: string }
```

## User Flow

### Opening Shift View Modal
1. User navigates to Admin Data or Google Data tab
2. Data loads automatically via API calls
3. "👁️ Shift View" button becomes enabled
4. User clicks button
5. Modal opens showing calendar and roster data
6. User can filter by date, shift type, and team
7. User closes modal when done

### Resetting Admin Data
1. User navigates to Admin Data tab
2. Admin and Google data load automatically
3. "↺ Reset to Google" button becomes enabled
4. User clicks button
5. Confirmation dialog appears: "Reset admin data to Google spreadsheet data? This will remove all manual overrides."
6. If user confirms:
   - API call is made to reset data
   - Loading state shown ("Resetting…")
   - Success/error message displayed
   - Data reloads automatically
7. If user cancels, no action taken

## Testing Recommendations

### Manual Testing
1. **Shift View - Admin Data**
   - Open Admin Data tab
   - Click "👁️ Shift View" button
   - Verify modal opens with admin roster data
   - Test date selection, filtering, and employee display
   - Close modal and verify state cleanup

2. **Shift View - Google Data**
   - Open Google Data tab
   - Click "👁️ Shift View" button
   - Verify modal opens with Google roster data (read-only)
   - Test functionality same as admin view

3. **Reset to Google**
   - Make some edits to admin data shifts
   - Click "↺ Reset to Google" button
   - Verify confirmation dialog appears
   - Cancel and verify no changes
   - Click again and confirm
   - Verify admin data resets to Google data
   - Verify all manual edits are removed

### Edge Cases
- Empty data state (buttons should be disabled)
- Loading state (buttons should be disabled)
- Network errors (error messages should display)
- Multiple rapid clicks (state management should prevent issues)

## Build Verification
✅ Build successful with no TypeScript errors
✅ No linting errors (excluding backup files)
✅ All dependencies resolved
✅ Production build generated successfully

## Screenshots
See PR description for UI screenshots showing the new buttons and features.

## Notes
- The implementation follows the existing code patterns in the repository
- Minimal changes were made to achieve the requirements
- No breaking changes to existing functionality
- The ShiftView component is reused without modification
- The existing reset API endpoint is used without changes
