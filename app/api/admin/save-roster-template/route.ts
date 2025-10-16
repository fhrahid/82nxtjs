import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { ROSTER_TEMPLATES_DIR } from '@/lib/constants';

export async function POST(req: Request) {
  try {
    const { schedule, monthYear, employees } = await req.json();

    if (!schedule || !monthYear) {
      return NextResponse.json({ success: false, error: 'Missing schedule or monthYear' }, { status: 400 });
    }

    // Ensure roster_templates directory exists
    try {
      await fs.mkdir(ROSTER_TEMPLATES_DIR, { recursive: true });
    } catch (e) {
      // Directory might already exist
    }

    // Format: MonthName-Year.csv (e.g., "November-2025.csv")
    const fileName = `${monthYear}.csv`;
    const filePath = path.join(ROSTER_TEMPLATES_DIR, fileName);

    // Convert schedule to CSV format that matches CSV Import expectations
    // CSV Import expects: Team, Name, ID, Date1, Date2, ...
    const csvLines: string[] = [];
    
    // Parse monthYear to generate date headers (e.g., "1Oct", "2Oct", ...)
    const [monthName, yearStr] = monthYear.split('-');
    const year = parseInt(yearStr);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthIndex = monthNames.findIndex(m => m === monthName);
    
    if (monthIndex === -1) {
      return NextResponse.json({ success: false, error: 'Invalid month name' }, { status: 400 });
    }

    // Generate date headers for the entire month
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const monthAbbr = monthName.substring(0, 3); // e.g., "Nov" from "November"
    const dateHeaders: string[] = [];
    for (let day = 1; day <= lastDay; day++) {
      dateHeaders.push(`${day}${monthAbbr}`);
    }
    
    // Build header: Team, Name, ID, Date1, Date2, ...
    csvLines.push(['Team', 'Name', 'ID', ...dateHeaders].join(','));

    // Add employee rows
    const employeeMap = new Map(employees?.map((e: any) => [e.id, e]) || []);
    
    for (const [empId, shifts] of Object.entries(schedule as Record<string, string[]>)) {
      const emp: any = employeeMap.get(empId);
      const name = emp?.name || '';
      const team = emp?.team || '';
      const shiftArray = shifts as string[];
      
      // Escape CSV values that contain commas
      const escapeCsv = (val: string) => val.includes(',') ? `"${val}"` : val;
      
      // Map shifts to the month's dates
      // Calculate day offset for the target month from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const firstDayOfMonth = new Date(year, monthIndex, 1);
      const diffDays = Math.floor((firstDayOfMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Extract shifts for this month's dates
      const monthShifts: string[] = [];
      for (let day = 1; day <= lastDay; day++) {
        const dateIdx = diffDays + day - 1; // Index in the 90-day schedule
        const shift = (dateIdx >= 0 && dateIdx < shiftArray.length) ? shiftArray[dateIdx] : '';
        monthShifts.push(escapeCsv(shift || ''));
      }
      
      const row = [
        escapeCsv(team),
        escapeCsv(name),
        escapeCsv(empId),
        ...monthShifts
      ];
      csvLines.push(row.join(','));
    }

    const csvContent = csvLines.join('\n');
    await fs.writeFile(filePath, csvContent, 'utf-8');

    return NextResponse.json({ 
      success: true, 
      message: `Template saved as ${fileName}`,
      fileName 
    });
  } catch (e: any) {
    console.error('Error saving roster template:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
