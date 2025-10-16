import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getGoogle, setAdmin, saveModified, saveRequests, loadAll } from '@/lib/dataStore';
import { writeJSON, deleteFile } from '@/lib/utils';
import { MODIFIED_SHIFTS_FILE, SCHEDULE_REQUESTS_FILE, ADMIN_DATA_FILE } from '@/lib/constants';

export async function POST() {
  const user = getSessionUser();
  if (!user) return NextResponse.json({success:false, error:'Unauthorized'},{status:401});
  
  // Try to get Google data, but don't fail if it doesn't exist
  const google = getGoogle();
  
  // If no Google data is available, just clear the modifications and requests
  // The admin data will remain with whatever CSV/template data is present
  if (!google.headers.length) {
    // Clear modified shifts and schedule requests
    writeJSON(MODIFIED_SHIFTS_FILE, {modifications:[], monthly_stats:{}});
    writeJSON(SCHEDULE_REQUESTS_FILE, {
      shift_change_requests: [],
      swap_requests: [],
      approved_count: 0,
      pending_count: 0
    });
    
    // Reload all data to ensure everything is in sync
    loadAll();
    
    return NextResponse.json({success:true, message:'Modified shifts and schedule requests have been reset. Admin data remains with CSV/template data.'});
  }
  
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