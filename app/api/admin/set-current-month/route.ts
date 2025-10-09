import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { setCurrentMonth } from '@/lib/dataStore';

export async function POST(req: Request) {
  if (!getSessionUser()) return NextResponse.json({error:'Unauthorized'},{status:401});
  try {
    const { monthYear } = await req.json();
    if (!monthYear) {
      return NextResponse.json({success: false, error: 'monthYear is required'});
    }
    setCurrentMonth(monthYear);
    return NextResponse.json({success: true, message: `Switched to ${monthYear}`});
  } catch (e: any) {
    return NextResponse.json({success: false, error: e.message});
  }
}
