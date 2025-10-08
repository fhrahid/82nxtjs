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
  
  // Delete the files completely
  deleteFile(MODIFIED_SHIFTS_FILE);
  deleteFile(SCHEDULE_REQUESTS_FILE);
  deleteFile(ADMIN_DATA_FILE);
  
  // Reload all data - this will sync admin_data from google_data
  loadAll();
  
  return NextResponse.json({success:true, message:'Admin data, schedule requests, and modified shifts have been deleted and reset to Google base roster.'});
}