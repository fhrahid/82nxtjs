import AdminLayoutShell from '@/components/AdminLayoutShell';
import DashboardTab from '@/components/AdminTabs/DashboardTab';
import RosterSyncTab from '@/components/AdminTabs/RosterSyncTab';
import TeamManagementTab from '@/components/AdminTabs/TeamManagementTab';
import UserManagementTab from '@/components/AdminTabs/UserManagementTab';
import ProfileTab from '@/components/AdminTabs/ProfileTab';
import ScheduleRequestsTab from '@/components/AdminTabs/ScheduleRequestsTab';
import RosterDataTab from '@/components/AdminTabs/RosterDataTab';
import CsvImportTab from '@/components/AdminTabs/CsvImportTab';
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
      <RosterSyncTab id="roster-sync" />
      <RosterDataTab id="roster-data" />
      <CsvImportTab id="csv-import" />
      <TeamManagementTab id="team-management" />
      <UserManagementTab id="user-management" />
      <ProfileTab id="profile" currentUser={user} />
    </AdminLayoutShell>
  );
}