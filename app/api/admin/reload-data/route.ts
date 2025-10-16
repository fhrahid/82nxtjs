import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { loadAll, getDisplay } from '@/lib/dataStore';

export async function POST() {
  const user = getSessionUser();
  if (!user) return NextResponse.json({success: false, error: 'Unauthorized'}, {status: 401});
  
  try {
    // Reload all data from disk into memory
    loadAll();
    
    // Get updated display data to verify
    const display = getDisplay();
    const employeeCount = display.allEmployees?.length || 0;
    const teamCount = Object.keys(display.teams || {}).length;
    
    return NextResponse.json({
      success: true,
      message: `Data reloaded successfully. ${employeeCount} employees across ${teamCount} teams.`,
      stats: {
        employees: employeeCount,
        teams: teamCount,
        headers: display.headers?.length || 0
      }
    });
  } catch (e: any) {
    console.error('Error reloading data:', e);
    return NextResponse.json({success: false, error: e.message}, {status: 500});
  }
}
