import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { deleteFile } from '@/lib/utils';
import { GOOGLE_DATA_FILE, ADMIN_DATA_FILE } from '@/lib/constants';

export async function POST() {
  if (!getSessionUser()) return NextResponse.json({error:'Unauthorized'},{status:401});
  
  try {
    deleteFile(GOOGLE_DATA_FILE);
    deleteFile(ADMIN_DATA_FILE);
    
    return NextResponse.json({
      success: true,
      message: 'Schedule data has been reset. Google and Admin data files deleted.'
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message || 'Failed to reset data'
    }, {status: 500});
  }
}
