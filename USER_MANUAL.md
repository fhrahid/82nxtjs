# Cartup CxP Roster Management System - User Manual

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Client-Side Manual (Employees)](#client-side-manual)
4. [Admin-Side Manual (Administrators)](#admin-side-manual)
5. [Troubleshooting](#troubleshooting)
6. [FAQ](#faq)

---

## 1. Introduction

This comprehensive manual provides step-by-step instructions for all features in the Cartup CxP Roster Management System. Screenshots are referenced throughout.

### System Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- Screen resolution: 1024x768 or higher recommended

---

## 2. Getting Started

### Accessing the System

**Client Portal**: `http://localhost:3000` (or your deployed URL)
**Admin Portal**: `http://localhost:3000/admin/login`

### Test Credentials

#### Client Side
- Employee ID: `SLL-88717`
- Name: Efat Anan Shekh
- Password: `cartup123`

#### Admin Side
- Username: `developer` or `istiaque`
- Password: `devneversleeps` or `cartup123`

---

## 3. Client-Side Manual (Employees)

### 3.1 Logging In

**Screenshot Reference**: `01-client-login-page.png`

#### Steps:
1. Navigate to the main portal URL
2. You'll see the login screen with three fields:
   - **Full Name**: Enter your full name (e.g., "Efat Anan Shekh")
   - **Employee ID**: Enter your ID in SLL-XXXXX format (e.g., "SLL-88717")
   - **Team Password**: Enter "cartup123" (shown on screen)
3. Click "🔓 Access Roster" button
4. System will remember you for future visits

#### Function:
- **Purpose**: Secure access to your personal schedule
- **How it works**: Validates your Employee ID format and password
- **Auto-login**: Your session is saved locally for convenience

---

### 3.2 Dashboard Overview

**Screenshot Reference**: `02-client-dashboard-main.png`

#### Main Components:

**A. Header Section**
- **Title**: "🛒 Cartup CxP Roster Viewer"
- **Subtitle**: "Employee Schedule Portal"
- **Developer Credit**: "Developed by Efat Anan Shekh"

**B. Control Bar**
- **Welcome Message**: Shows your name and ID
- **Logout Button**: Exit the system
- **Refresh Button**: Reload latest schedule data
- **Theme Button**: Toggle between themes (if available)

**C. Schedule Status**
- Green indicator: "Schedule Loaded"
- Instruction: "Select a date below to request a change or swap"

#### Function:
- **Purpose**: Central hub for all schedule operations
- **How it works**: Loads your schedule from the server automatically
- **Usage**: Starting point for all actions

---

### 3.3 Employee Information Card

**Screenshot Reference**: `02-client-dashboard-main.png` (top card)

#### Displays:
- Your full name
- Employee ID (prefixed with #)
- Team assignment badge (e.g., "VOICE")

#### Function:
- **Purpose**: Quick identity confirmation
- **How it works**: Pulls data from your login session
- **Usage**: Always visible for reference

---

### 3.4 Today & Tomorrow Shifts

**Screenshot Reference**: `02-client-dashboard-main.png`

#### Shows:
- **Today**: Date and shift time (e.g., "⏱ Today (11Oct): 8 AM – 5 PM")
- **Tomorrow**: Date and shift time (e.g., "⏱ Tomorrow (12Oct): 1 PM – 10 PM")

#### Function:
- **Purpose**: Quick view of immediate schedule
- **How it works**: Extracts today/tomorrow from full schedule
- **Usage**: First thing to check daily

---

### 3.5 Calendar Selector (Collapsible)

**Screenshot Reference**: `03-client-calendar-expanded.png`

#### How to Use:
1. Click "📅 Show Calendar" button
2. Calendar expands showing current month
3. Navigate months using ← and → arrows
4. Click any date to see shift details
5. Click "📅 Hide Calendar" to collapse

#### Features:
- **Color Coding**:
  - Darker background: Working days
  - Lighter background: Days off
- **Month Navigation**: Move between months
- **Date Selection**: Click to view specific date shift

#### Function:
- **Purpose**: Navigate your full monthly schedule
- **How it works**: Displays all scheduled days color-coded
- **Usage**: Planning ahead, checking specific dates

---

### 3.6 Action Buttons

**Screenshot Reference**: `02-client-dashboard-main.png` (button row)

Three main action buttons:

#### A. Request Shift Change
- Icon: 📝
- Opens modal to request a different shift for a date

#### B. Request Swap
- Icon: 🔄
- Opens modal to swap shifts with a coworker

#### C. Shift View
- Icon: 👁️
- Expands inline panel showing who's working when

---

### 3.7 Requesting a Shift Change

**Screenshot Reference**: `05-client-request-shift-change-modal.png`

#### Steps:
1. Click "Request Shift Change" button
2. Modal opens showing:
   - Your employee info
   - Your team
   - Mini calendar with color-coded days
3. **Select Date**:
   - Click on a date in the mini calendar
   - Green dates: You're working
   - Red dates: You're off
4. **Choose Requested Shift**:
   - Open the "Requested Shift" dropdown
   - Select desired shift (M2, M3, D1, D2, DO, SL, CL, EL, HL)
5. **Enter Reason**:
   - Type explanation in "Reason" field
   - Be clear and concise
6. Click "Submit Request"
7. Request is sent to admin for approval

#### Shift Codes:
- **M2**: 8 AM – 5 PM
- **M3**: 9 AM – 6 PM
- **M4**: 10 AM – 7 PM
- **D1**: 12 PM – 9 PM
- **D2**: 1 PM – 10 PM
- **DO**: Day Off
- **SL**: Sick Leave
- **CL**: Casual Leave
- **EL**: Emergency Leave
- **HL**: Holiday Leave

#### Function:
- **Purpose**: Request schedule modification
- **How it works**: Creates request in system for admin review
- **Usage**: When you need different shift/day off

---

### 3.8 Requesting a Shift Swap

#### Steps:
1. Click "Request Swap" button
2. Modal opens with mini calendar
3. **Select Your Date**: Click date you want to swap
4. **Search Team Member**:
   - Type coworker's name in search
   - Select from dropdown
5. **Review Swap**:
   - System shows both shifts for comparison
   - Your shift → Their shift
6. **Enter Reason**: Explain why you need the swap
7. Click "Submit Swap Request"
8. Both admin and the other employee are notified

#### Function:
- **Purpose**: Exchange shifts with a coworker
- **How it works**: Creates swap request requiring admin approval
- **Usage**: When you need someone to cover your shift

---

### 3.9 Employee Search

**Screenshot Reference**: `02-client-dashboard-main.png` (search section)

#### How to Use:
1. Locate "Search Other Employees" section
2. Click in the search box (🔍 icon)
3. Type employee name, ID, or team
4. Select employee from dropdown results
5. Page updates to show their schedule
6. Click "Back to My Schedule" to return

#### What Changes When Viewing Another Employee:
- Employee card shows their info
- Today/Tomorrow shows their shifts
- Calendar shows their schedule
- Stat cards show their statistics

#### Function:
- **Purpose**: View coworker schedules
- **How it works**: Fetches and displays selected employee's data
- **Usage**: Coordinating with team, checking availability

---

### 3.10 Statistics Cards

**Screenshot Reference**: `04-client-stat-card-expanded.png`

Three expandable cards at bottom:

#### A. 📅 Upcoming Days (Card 1)
- **Shows**: Number of upcoming work days
- **Click to Expand**: Detailed table with:
  - Date
  - Day of week
  - Shift time
- **Span**: Next 7 days by default

#### B. 🏖️ Planned Time Off (Card 2)
- **Shows**: Count of upcoming days off
- **Click to Expand**: List of:
  - DO (Day Off)
  - SL (Sick Leave)
  - CL (Casual Leave)
  - EL (Emergency Leave)
- **Span**: Next 30 days

#### C. 🔄 Shift Changes (Card 3)
- **Shows**: Number of approved modifications
- **Click to Expand**: Details of changes:
  - Original shift
  - Modified shift
  - Date
  - Approval status
- **Comparison**: "Vs original" schedule

#### Function:
- **Purpose**: Quick statistics overview
- **How it works**: Calculates from schedule data
- **Usage**: Planning, tracking changes

---

### 3.11 Shift View (Collapsible Panel)

#### How to Use:
1. Click "👁️ Shift View" button
2. Panel expands below (not a modal)
3. **Filter Options**:
   - **Date**: Select specific date
   - **Shift**: Filter by shift type (M2, M3, etc.)
   - **Team**: Filter by team name
4. **View Results**: See all employees matching filters
5. Click "Shift View" again to collapse

#### Function:
- **Purpose**: See who's working specific shifts
- **How it works**: Filters roster data by criteria
- **Usage**: Team coordination, finding coworkers

---

## 4. Admin-Side Manual (Administrators)

### 4.1 Admin Login

**Screenshot Reference**: `06-admin-login-page.png`

#### Steps:
1. Navigate to `/admin/login`
2. Enter credentials:
   - **Username**: "developer" or "istiaque"
   - **Password**: "devneversleeps" or "cartup123"
3. Click "Login to Admin Panel"
4. Redirected to dashboard

#### Security Features:
- Session expires after inactivity
- Failed login attempts logged
- Authorized personnel only

#### Function:
- **Purpose**: Secure admin access
- **How it works**: Validates credentials, creates session
- **Usage**: Admin/team leader entry point

---

### 4.2 Admin Dashboard Layout

#### Left Sidebar Navigation:
- **Dashboard** (Home icon): Analytics overview
- **Schedule Requests**: Pending approvals
- **Team Management**: Manage teams/employees
- **User Management**: Admin user CRUD
- **My Profile**: Personal settings
- **Data Sync**: Google Sheets integration
- **Roster Data**: View/edit schedules
- **Google Data**: Source data view
- **Modified Shifts**: Audit log
- **CSV Import**: Bulk upload
- **Google Sheets**: Link management

#### User Card (Bottom):
- Shows logged-in admin
- Role badge
- Logout button

---

### 4.3 Dashboard (Home)

#### Components:

**A. Swap Requests Overview**
- **Total**: All-time request count
- **Accepted**: Approved requests
- **Rejected**: Declined requests
- **Pending**: Awaiting action
- Visual bar chart

**B. Acceptance Rate**
- Percentage bar
- Color-coded (green = high)
- Formula: Accepted / Total

**C. Team Health Overview**
- Per-team cards showing:
  - Team name
  - Total employees
  - Working days count
  - Off days count
- Quick health check

**D. Recent Activity**
- Timeline of latest actions
- Request submissions
- Approvals/rejections
- System changes

#### Function:
- **Purpose**: At-a-glance system status
- **How it works**: Aggregates data from all sources
- **Usage**: Daily check-in, trend monitoring

---

### 4.4 Schedule Requests Management

#### Viewing Requests:

**Filter Options**:
- **All Requests**: Complete history
- **Pending Only**: Awaiting approval
- **Approved**: Accepted requests
- **Rejected**: Declined requests

**Request Card Shows**:
- Employee name and ID
- Team
- Request type (Change or Swap)
- Current shift
- Requested shift
- Reason provided
- Submission date/time
- Status badge

#### Taking Action:

**To Approve**:
1. Review request details
2. Click "✓ Approve" button
3. Request marked as approved
4. Employee notified
5. Schedule updated automatically

**To Reject**:
1. Review request
2. Click "✗ Reject" button
3. Optionally enter rejection reason
4. Request marked as rejected
5. Employee notified

#### Function:
- **Purpose**: Manage shift change/swap requests
- **How it works**: Queue system with approval workflow
- **Usage**: Daily processing of employee requests

---

### 4.5 Team Management

#### Viewing Teams:

**Team List Shows**:
- Team name
- Number of members
- Active schedules
- Team leader (if assigned)

**Employee List Shows**:
- Full name
- Employee ID
- Team assignment
- Current schedule status

#### Managing Employees:

**Add New Employee**:
1. Click "Add Employee" button
2. Fill form:
   - Full name
   - Employee ID
   - Team selection
   - Initial shift assignment
3. Click "Save"
4. Employee added to roster

**Edit Employee**:
1. Click edit icon on employee row
2. Modify details
3. Click "Update"
4. Changes saved

**View Employee Schedule**:
1. Click employee name
2. Full schedule displayed
3. Can make modifications

#### Function:
- **Purpose**: Manage workforce structure
- **How it works**: CRUD operations on team/employee data
- **Usage**: Onboarding, team reorganization

---

### 4.6 User Management

#### Admin User Operations:

**View Users**:
- Table showing all admin users
- Columns: Username, Full Name, Role, Created Date
- Action buttons per row

**Add New User**:
1. Fill form fields:
   - **Username**: Unique identifier
   - **Full Name**: Display name
   - **Password**: Default "change_me_123"
   - **Role**: Select "admin" or "manager"
2. Click "➕ Add User"
3. Alert confirms creation
4. User can login immediately

**Edit User**:
1. Click "Edit" button
2. Modify full name or role
3. Click "💾 Save"
4. Changes applied

**Delete User**:
1. Click "Delete" button
2. Confirm deletion
3. User removed
4. **Note**: Cannot delete yourself

#### Roles:
- **admin**: Full system access
- **manager**: Limited to team operations

#### Function:
- **Purpose**: Control admin access
- **How it works**: Manages admin_users.json
- **Usage**: Onboarding admins, access control

---

### 4.7 My Profile

#### View Information:
- Username (cannot change)
- Full name (editable)
- Role (cannot change own role)
- Account creation date
- Last login

#### Update Profile:
1. Edit "Full Name" field
2. Click "Update Profile"
3. Changes saved

#### Change Password:
1. Enter current password
2. Enter new password
3. Confirm new password
4. Click "Change Password"
5. Password updated
6. Re-login required

#### Function:
- **Purpose**: Self-service profile management
- **How it works**: Updates your admin user record
- **Usage**: Keeping info current, security

---

### 4.8 Data Sync

#### Google Sheets Sync:

**Manual Sync**:
1. Click "🔄 Sync Now" button
2. System fetches data from all configured Google Sheet CSV URLs
3. Progress indicator shows
4. Success message when complete
5. Data merged into google_data.json

**Auto-Sync**:
1. Toggle "Auto-Sync" switch
2. Select interval (1h, 6h, 12h, 24h)
3. System syncs automatically

**Sync Status**:
- Last sync timestamp
- Success/failure indicator
- Number of records updated

#### Function:
- **Purpose**: Keep roster data current from Google Sheets
- **How it works**: Fetches CSV, parses, merges with existing
- **Usage**: Regular updates from central source

---

### 4.9 Google Sheets Link Management

#### View Links:
- Table of configured CSV URLs
- Link name
- URL
- Status (active/inactive)
- Last used timestamp

#### Add Link:
1. Click "Add Link" button
2. Enter:
   - **Link Name**: Descriptive label
   - **CSV URL**: Published Google Sheet CSV URL
3. Click "Save"
4. Link ready for sync

#### Edit/Delete Links:
- Edit: Change name or URL
- Delete: Remove link (won't sync anymore)

#### Function:
- **Purpose**: Manage multiple data sources
- **How it works**: Stores URLs for sync process
- **Usage**: Adding/removing schedule sources

---

### 4.10 Roster Data (Admin Data Tab)

#### Features:

**View Schedule**:
- Full roster table
- Columns: Team, Name, ID, Date columns
- Each cell shows shift code
- Color-coded cells

**Edit Shifts**:
1. Click on any shift cell
2. Edit modal opens:
   - Shows employee and date
   - Current shift displayed
   - Dropdown to select new shift
3. Select new shift
4. Click "Save"
5. Shift updated in admin_data.json
6. Logged to modified_shifts.json

**Shift View Button**:
1. Click "👁️ Shift View" button
2. Modal opens with filters
3. View/search roster

**Reset to Google**:
1. Click "↺ Reset to Google" button
2. Confirmation dialog appears
3. Confirm to reset
4. Admin data overwritten with Google data
5. All modifications lost

#### Function:
- **Purpose**: Direct schedule editing
- **How it works**: Modifies admin layer, preserves Google source
- **Usage**: Quick fixes, manual adjustments

---

### 4.11 Google Data Tab

#### Features:
- **Read-Only View**: Cannot edit
- Shows source data from Google Sheets
- Same table format as Admin Data
- Shift View available

#### Function:
- **Purpose**: Reference original data
- **How it works**: Displays google_data.json
- **Usage**: Comparing changes, verification

---

### 4.12 Modified Shifts (Audit Log)

#### View Shows:
- **Employee**: Name and ID
- **Date**: When shift occurred
- **Original Shift**: From Google data
- **Modified Shift**: Admin change
- **Modified By**: Admin username
- **Timestamp**: When change was made
- **Month**: For grouping

#### Filters:
- Filter by month
- Filter by employee
- Filter by admin who made change

#### Statistics:
- Total modifications
- Per-employee counts
- Per-admin counts
- Monthly trends

#### Function:
- **Purpose**: Complete audit trail
- **How it works**: Logs every admin data modification
- **Usage**: Compliance, tracking changes

---

### 4.13 CSV Import

#### How to Import:

**Step 1: Download Template**
1. Click "Download CSV Template"
2. Template file downloads
3. Open in Excel/Google Sheets

**Template Format**:
```
Team,Name,ID,1Oct,2Oct,3Oct,...
Team A,John Doe,EMP001,M2,M2,M3,...
Team B,Jane Smith,EMP002,D1,DO,D1,...
```

**Step 2: Fill Template**
1. Add your employee data
2. Fill shift codes for each date
3. Save as CSV

**Step 3: Upload**
1. Click "Upload CSV" in admin
2. Select your file
3. Click "Import"
4. System validates format
5. Success: Data merged
6. Failure: Error message with details

#### Validation Checks:
- Required columns present
- Employee ID format
- Valid shift codes
- Date format consistency

#### Function:
- **Purpose**: Bulk schedule upload
- **How it works**: Parses CSV, merges with google_data.json
- **Usage**: Monthly schedule updates

---

## 5. Troubleshooting

### Common Issues

#### Cannot Login (Client)
- **Problem**: "Invalid password" message
- **Solution**: Ensure password is exactly "cartup123"
- **Check**: Employee ID format is SLL-XXXXX

#### Cannot Login (Admin)
- **Problem**: "Invalid credentials"
- **Solution**: Verify username and password
- **Check**: Check data/admin_users.json for valid accounts

#### Schedule Not Loading
- **Problem**: "Loading..." forever
- **Solution**: 
  1. Click Refresh button
  2. Check browser console for errors
  3. Verify data files exist in data/
  4. Restart dev server

#### Calendar Not Showing Shifts
- **Problem**: All dates appear blank
- **Solution**:
  1. Ensure google_data.json has data
  2. Check employee ID exists in roster
  3. Verify month matches data

#### Request Not Submitting
- **Problem**: "Submit" button disabled
- **Solution**:
  1. Select a date
  2. Choose a shift
  3. Enter reason (required)
  4. Check all fields filled

#### CSV Import Fails
- **Problem**: "Invalid format" error
- **Solution**:
  1. Use provided template
  2. Don't add extra columns
  3. Keep header row unchanged
  4. Use valid shift codes only
  5. Check for special characters

---

## 6. FAQ

### General

**Q: How often is data synced?**
A: Manual sync or auto-sync at configured interval (1-24 hours)

**Q: Can employees see other employees' requests?**
A: No, only their own requests

**Q: How long are requests kept?**
A: Indefinitely in schedule_requests.json (archive recommended)

### Client-Side

**Q: Can I cancel a submitted request?**
A: Not currently. Contact admin to cancel.

**Q: How do I know if my request was approved?**
A: Check "Shift Changes" stat card or contact admin

**Q: Can I request multiple shifts at once?**
A: No, submit separate requests for each

**Q: Why can't I swap with certain employees?**
A: System may filter incompatible shifts/teams

### Admin-Side

**Q: What happens if I approve conflicting requests?**
A: Last approval wins. Check carefully.

**Q: Can I undo an approval?**
A: No direct undo. Make manual correction in Roster Data.

**Q: What if Google Sheets sync fails?**
A: Check CSV URLs, network connection, CSV format

**Q: How do I restore from backup?**
A: Replace data/ folder contents with backup files

**Q: Can I export current schedule?**
A: Yes, use "Export CSV" in admin panel

---

## Keyboard Shortcuts

### Client-Side
- **F5**: Refresh schedule
- **Esc**: Close modals
- **Tab**: Navigate form fields

### Admin-Side
- **Ctrl/⌘ + Enter**: Submit active form
- **Esc**: Close modals
- **Ctrl/⌘ + S**: Save changes (where applicable)

---

## Best Practices

### For Employees
1. Check schedule daily
2. Submit requests at least 48 hours in advance
3. Provide clear reasons for changes
4. Coordinate swaps with coworkers first
5. Keep browser updated

### For Admins
1. Review requests daily
2. Sync Google Sheets regularly
3. Backup data weekly
4. Audit modified shifts monthly
5. Keep admin users to minimum necessary
6. Change default passwords immediately
7. Monitor Recent Activity dashboard

---

## Contact & Support

For technical issues:
- Check this manual first
- Review TESTING_GUIDE.md
- Contact system administrator
- Email: support@cartup.com (if configured)

For feature requests:
- Document the need
- Submit to development team
- Check roadmap in PRODUCT_DESCRIPTION.md

---

**Manual Version**: 1.0.0
**Last Updated**: October 2025
**Compatible with**: System v1.0.0
