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

    // Convert schedule to CSV format
    // Header: Employee ID, Employee Name, Team, Date1, Date2, ...
    const csvLines: string[] = [];
    
    // Build header with date columns (90 days)
    const dateHeaders = Array.from({ length: 90 }, (_, i) => `Day${i + 1}`);
    csvLines.push(['Employee ID', 'Employee Name', 'Team', ...dateHeaders].join(','));

    // Add employee rows
    const employeeMap = new Map(employees?.map((e: any) => [e.id, e]) || []);
    
    for (const [empId, shifts] of Object.entries(schedule as Record<string, string[]>)) {
      const emp: any = employeeMap.get(empId);
      const name = emp?.name || '';
      const team = emp?.team || '';
      const shiftArray = shifts as string[];
      
      // Escape CSV values that contain commas
      const escapeCsv = (val: string) => val.includes(',') ? `"${val}"` : val;
      
      const row = [
        escapeCsv(empId),
        escapeCsv(name),
        escapeCsv(team),
        ...shiftArray.map(s => escapeCsv(s || ''))
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
