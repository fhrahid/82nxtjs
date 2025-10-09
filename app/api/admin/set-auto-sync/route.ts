import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { setAutoSyncEnabled } from '@/lib/dataStore';

export async function POST(req: NextRequest) {
  if (!getSessionUser()) return NextResponse.json({error:'Unauthorized'},{status:401});
  const body = await req.json();
  const { enabled } = body;
  if (typeof enabled !== 'boolean') {
    return NextResponse.json({error:'Invalid request'},{status:400});
  }
  setAutoSyncEnabled(enabled);
  return NextResponse.json({success:true, autoSyncEnabled: enabled});
}
