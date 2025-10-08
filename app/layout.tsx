import '../styles/admin-data-enhancements.css';
import '../styles/admin-login.css';
import './globals.css';
import '../styles/admin-modern.css';
import '../styles/viewer.css';
import '../styles/calendar.css';
import '../styles/modals.css';
import '../styles/requests.css';
import '../styles/modern-ui.css';
import '../styles/calendar-selector.css';
import '../styles/dashboard.css';
import '../styles/mini-schedule-calendar.css';

export const metadata = {
  title: 'Cartup CxP Roster',
  description: 'Roster Management System (Next.js)',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5'
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}