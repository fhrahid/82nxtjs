import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

// This endpoint is deprecated - all months are now loaded automatically
export async function POST(req: Request) {
  if (!getSessionUser()) return NextResponse.json({error:'Unauthorized'},{status:401});
  return NextResponse.json({
    success: true, 
    message: 'Month selection is no longer needed - all months are loaded automatically'
  });
}
