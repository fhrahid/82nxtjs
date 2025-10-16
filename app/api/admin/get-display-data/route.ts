import { NextResponse } from 'next/server';
import { getDisplay } from '@/lib/dataStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getDisplay());
}