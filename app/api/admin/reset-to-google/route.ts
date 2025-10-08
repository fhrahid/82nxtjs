import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getGoogle, setAdmin, saveModified, saveRequests } from '@/lib/dataStore';
import { writeJSON } from '@/lib/utils';
import { MODIFIED_SHIFTS_FILE, SCHEDULE_REQUESTS_FILE } from '@/lib/constants';

export async function POST() {
  const user = getSessionUser();
  if (!user) return NextResponse.json({success:false, error:'Unauthorized'},{status:401});
  const google = getGoogle();
  if (!google.headers.length) return NextResponse.json({success:false, error:'No Google data loaded'});
  
  // Reset admin data to Google
  setAdmin(google);
  
  // Clear modified shifts
  writeJSON(MODIFIED_SHIFTS_FILE, {modifications:[], monthly_stats:{}});
  
  // Clear schedule requests
  writeJSON(SCHEDULE_REQUESTS_FILE, {
    shift_change_requests: [],
    swap_requests: [],
    approved_count: 0,
    pending_count: 0
  });
  
  return NextResponse.json({success:true, message:'Admin data, schedule requests, and modified shifts have been reset to Google base roster.'});
}