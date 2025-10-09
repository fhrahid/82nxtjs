import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSyncConfig } from '@/lib/dataStore';

export async function GET() {
  if (!getSessionUser()) return NextResponse.json({error:'Unauthorized'},{status:401});
  const config = getSyncConfig();
  return NextResponse.json(config);
}
