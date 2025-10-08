import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getGoogle, setAdmin, saveModified, saveRequests, loadAll } from '@/lib/dataStore';
import { writeJSON, deleteFile } from '@/lib/utils';
import { MODIFIED_SHIFTS_FILE, SCHEDULE_REQUESTS_FILE, ADMIN_DATA_FILE } from '@/lib/constants';

export async function POST() {
  const user = getSessionUser();
  if (!user) return NextResponse.json({success:false, error:'Unauthorized'},{status:401});
  const google = getGoogle();
  if (!google.headers.length) return NextResponse.json({success:false, error:'No Google data loaded'});
  
  // Clear modified shifts and schedule requests first
  writeJSON(MODIFIED_SHIFTS_FILE, {modifications:[], monthly_stats:{}});
  writeJSON(SCHEDULE_REQUESTS_FILE, {
    shift_change_requests: [],
    swap_requests: [],
    approved_count: 0,
    pending_count: 0
  });
  
  // Reset admin data to Google data (this ensures in-memory data is updated)
  setAdmin(google);
  
  // Reload all data to ensure everything is in sync
  loadAll();
  
  return NextResponse.json({success:true, message:'Admin data, schedule requests, and modified shifts have been reset to Google base roster.'});
}