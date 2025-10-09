import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { syncGoogleSheets } from '@/lib/googleSync';
import { getSyncConfig } from '@/lib/dataStore';

export async function POST() {
  if (!getSessionUser()) return NextResponse.json({error:'Unauthorized'},{status:401});
  
  const config = getSyncConfig();
  if (!config.syncFromLinks) {
    return NextResponse.json({success:false, error:'Sync from Google Sheets is disabled. Please enable it in Sync Configuration.'});
  }
  
  try {
    const res = await syncGoogleSheets();
    return NextResponse.json({
      success:true, 
      message:`Google Sheets synced: ${res.employees} employees from ${res.sheets} sheet(s) for months: ${res.months.join(', ')}`
    });
  } catch (e:any) {
    return NextResponse.json({success:false, error:e.message});
  }
}