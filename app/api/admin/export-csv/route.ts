import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getAdmin } from '@/lib/dataStore';

export async function POST(req: NextRequest) {
  if (!getSessionUser()) return NextResponse.json({error:'Unauthorized'},{status:401});
  
  const body = await req.json();
  const { months } = body; // Array of month names like ['Sep', 'Oct'] or null for all
  
  const adminData = getAdmin();
  if (!adminData || !adminData.headers || adminData.headers.length === 0) {
    return NextResponse.json({error: 'No data available'}, {status: 400});
  }
  
  let filteredHeaders: string[] = [];
  let filteredIndices: number[] = [];
  
  if (!months || months.length === 0) {
    // Export all months
    filteredHeaders = adminData.headers;
    filteredIndices = adminData.headers.map((_, i) => i);
  } else {
    // Filter headers by selected months
    adminData.headers.forEach((header, idx) => {
      // Extract month from header (e.g., "1Sep" -> "Sep")
      const monthMatch = header.match(/[A-Za-z]+/);
      if (monthMatch && months.includes(monthMatch[0])) {
        filteredHeaders.push(header);
        filteredIndices.push(idx);
      }
    });
  }
  
  if (filteredHeaders.length === 0) {
    return NextResponse.json({error: 'No data found for selected months'}, {status: 400});
  }
  
  // Build CSV
  const headerRow = `Team,Name,ID,${filteredHeaders.join(',')}`;
  const dateRow = `,,Date,${filteredHeaders.map(() => '').join(',')}`;
  const rows: string[] = [headerRow, dateRow];
  
  // Add employee data
  Object.entries(adminData.teams).forEach(([teamName, employees]) => {
    employees.forEach((emp: any) => {
      const schedule = filteredIndices.map(idx => emp.schedule[idx] || '');
      const row = `${teamName},${emp.name},${emp.id},${schedule.join(',')}`;
      rows.push(row);
    });
  });
  
  const csv = rows.join('\n');
  const monthsSuffix = months && months.length > 0 ? `_${months.join('_')}` : '_all';
  
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=admin_schedule${monthsSuffix}.csv`
    }
  });
}
