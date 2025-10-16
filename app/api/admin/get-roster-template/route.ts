import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { ROSTER_TEMPLATES_DIR } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get('fileName');

    if (!fileName) {
      return NextResponse.json({ success: false, error: 'No file name provided' }, { status: 400 });
    }

    const filePath = path.join(ROSTER_TEMPLATES_DIR, fileName);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (e) {
      return NextResponse.json({ success: false, error: 'Template file not found' }, { status: 404 });
    }

    // Read and parse the CSV file
    const csvContent = await fs.readFile(filePath, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    // Extract schedule data
    const schedule: Record<string, string[]> = {};
    const employees: any[] = [];

    // Extract month/year from filename (e.g., "November-2025.csv")
    const monthYear = fileName.replace('.csv', '');
    const [monthName, yearStr] = monthYear.split('-');
    const year = parseInt(yearStr);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthIndex = monthNames.findIndex(m => m === monthName);

    if (monthIndex === -1) {
      return NextResponse.json({ success: false, error: 'Invalid month name in filename' }, { status: 400 });
    }

    // Calculate the first day of the target month as offset from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDayOfMonth = new Date(year, monthIndex, 1);
    const diffDays = Math.floor((firstDayOfMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Get all date column headers (exclude Team, Name, ID)
    const headers = Object.keys(records[0] || {});
    const dateHeaders = headers.filter(h => !['Team', 'Name', 'ID'].includes(h));

    for (const record of records) {
      const empId = record['ID'];
      const empName = record['Name'];
      const team = record['Team'];

      if (!empId) continue;

      // Create a 90-day schedule array
      const shifts: string[] = Array(90).fill('');
      
      // Map each date header to the correct position in the 90-day schedule
      dateHeaders.forEach((dateHeader, idx) => {
        const shift = record[dateHeader] || '';
        const dayOffset = diffDays + idx; // Position in 90-day schedule
        if (dayOffset >= 0 && dayOffset < 90) {
          shifts[dayOffset] = shift;
        }
      });

      schedule[empId] = shifts;
      employees.push({
        id: empId,
        name: empName || empId,
        team: team || 'Unassigned'
      });
    }

    return NextResponse.json({
      success: true,
      schedule,
      employees,
      monthYear,
      fileName
    });
  } catch (e: any) {
    console.error('Error getting roster template:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
