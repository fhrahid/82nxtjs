import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { setSyncConfig } from '@/lib/dataStore';

export async function POST(req: Request) {
  if (!getSessionUser()) return NextResponse.json({error:'Unauthorized'},{status:401});
  try {
    const body = await req.json();
    setSyncConfig(body);
    return NextResponse.json({success: true});
  } catch (e: any) {
    return NextResponse.json({success: false, error: e.message});
  }
}
