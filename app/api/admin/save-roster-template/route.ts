import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { ROSTER_TEMPLATES_DIR } from '@/lib/constants';

export async function POST(req: Request) {
  try {
    const { schedule, monthYear, employees, monthOffset } = await req.json();

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

    // Parse month and year from monthYear (e.g., "November-2025")
    const [monthName, yearStr] = monthYear.split('-');
    const year = parseInt(yearStr);
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const month = monthNames.indexOf(monthName);

    // Convert schedule to CSV format with actual dates
    const csvLines: string[] = [];
    
    // Build header with actual dates for the month
    const lastDay = new Date(year, month + 1, 0).getDate();
    const dateHeaders: string[] = [];
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    
    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, month, d);
      dateHeaders.push(`${dayNames[date.getDay()]} ${d} ${monthName}`);
    }
    
    csvLines.push(['Employee ID', 'Employee Name', 'Team', 'Month', 'Year', ...dateHeaders].join(','));

    // Add employee rows
    const employeeMap = new Map(employees?.map((e: any) => [e.id, e]) || []);
    
    // Calculate the date index offset from today to the start of the target month
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetMonthStart = new Date(year, month, 1);
    const offsetDays = Math.floor((targetMonthStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    for (const [empId, shifts] of Object.entries(schedule as Record<string, string[]>)) {
      const emp: any = employeeMap.get(empId);
      const name = emp?.name || '';
      const team = emp?.team || '';
      const shiftArray = shifts as string[];
      
      // Extract only the shifts for this specific month
      const monthShifts: string[] = [];
      for (let d = 0; d < lastDay; d++) {
        const dateIdx = offsetDays + d;
        monthShifts.push(shiftArray[dateIdx] || '');
      }
      
      // Escape CSV values that contain commas
      const escapeCsv = (val: string) => val.includes(',') ? `"${val}"` : val;
      
      const row = [
        escapeCsv(empId),
        escapeCsv(name),
        escapeCsv(team),
        monthName,
        yearStr,
        ...monthShifts.map(s => escapeCsv(s || ''))
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
