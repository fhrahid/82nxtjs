import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { deleteFile } from '@/lib/utils';
import { GOOGLE_DATA_FILE, ADMIN_DATA_FILE, MODIFIED_SHIFTS_FILE, SCHEDULE_REQUESTS_FILE } from '@/lib/constants';
import { reloadAll } from '@/lib/dataStore';

export const dynamic = 'force-dynamic';

export async function POST() {
  if (!getSessionUser()) return NextResponse.json({error:'Unauthorized'},{status:401});
  
  try {
    deleteFile(GOOGLE_DATA_FILE);
    deleteFile(ADMIN_DATA_FILE);
    deleteFile(MODIFIED_SHIFTS_FILE);
    deleteFile(SCHEDULE_REQUESTS_FILE);
    
    // Reload all data from disk to refresh in-memory cache
    reloadAll();
    
    return NextResponse.json({
      success: true,
      message: 'All roster data has been reset. Deleted: admin_data.json, google_data.json, modified_shifts.json, and schedule_requests.json'
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message || 'Failed to reset data'
    }, {status: 500});
  }
}
