import AdminLayoutShell from '@/components/AdminLayoutShell';
import DashboardTab from '@/components/AdminTabs/DashboardTab';
import DataSyncTab from '@/components/AdminTabs/DataSyncTab';
import GoogleLinksTab from '@/components/AdminTabs/GoogleLinksTab';
import TeamManagementTab from '@/components/AdminTabs/TeamManagementTab';
import UserManagementTab from '@/components/AdminTabs/UserManagementTab';
import ProfileTab from '@/components/AdminTabs/ProfileTab';
import ScheduleRequestsTab from '@/components/AdminTabs/ScheduleRequestsTab';
import RosterDataTab from '@/components/AdminTabs/RosterDataTab';
import CsvImportTab from '@/components/AdminTabs/CsvImportTab';
import ModifiedShiftsTab from '@/components/AdminTabs/ModifiedShiftsTab';
import { getSessionUser, getSessionUserData } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default function AdminDashboardPage() {
  const user = getSessionUser();
  if (!user) redirect('/admin/login');
  
  const userData = getSessionUserData();
  const userRole = userData?.role || 'admin';

  return (
    <AdminLayoutShell adminUser={user} userRole={userRole}>
      <DashboardTab id="dashboard" />
      <ScheduleRequestsTab id="schedule-requests" />
      <TeamManagementTab id="team-management" />
      <UserManagementTab id="user-management" />
      <ProfileTab id="profile" currentUser={user} />
      <DataSyncTab id="data-sync" />
      <GoogleLinksTab id="google-links" />
      <RosterDataTab id="roster-data" />
      <CsvImportTab id="csv-import" />
    </AdminLayoutShell>
  );
}