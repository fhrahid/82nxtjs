import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSettings } from '@/lib/dataStore';

export async function GET() {
  if (!getSessionUser()) return NextResponse.json({error:'Unauthorized'},{status:401});
  const settings = getSettings();
  return NextResponse.json(settings);
}
