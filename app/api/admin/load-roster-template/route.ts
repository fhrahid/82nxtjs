import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { ROSTER_TEMPLATES_DIR } from '@/lib/constants';

export async function POST(req: Request) {
  try {
    const { fileName } = await req.json();

    if (!fileName) {
      return NextResponse.json({ success: false, error: 'Missing fileName' }, { status: 400 });
    }

    // Security: prevent directory traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return NextResponse.json({ success: false, error: 'Invalid fileName' }, { status: 400 });
    }

    const filePath = path.join(ROSTER_TEMPLATES_DIR, fileName);
    
    // Read the CSV file
    const csvContent = await fs.readFile(filePath, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    if (records.length === 0) {
      return NextResponse.json({ success: false, error: 'Empty template file' }, { status: 400 });
    }

    // The new format has headers: Team,Name,ID,1Nov,2Nov,3Nov,...
    // We need to extract the month/year from the date headers and the filename
    const firstRecord = records[0];
    const columns = Object.keys(firstRecord);
    
    // Extract month and year from filename (e.g., "November-2025.csv")
    const fileNameWithoutExt = fileName.replace('.csv', '');
    const [monthName, yearStr] = fileNameWithoutExt.split('-');
    const year = parseInt(yearStr);
    
    if (!monthName || !yearStr || isNaN(year)) {
      return NextResponse.json({ success: false, error: 'Invalid filename format. Expected: MonthName-Year.csv' }, { status: 400 });
    }

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const month = monthNames.indexOf(monthName);

    if (month === -1) {
      return NextResponse.json({ success: false, error: 'Invalid month in filename' }, { status: 400 });
    }

    // Calculate month offset from current month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthOffset = (year - currentYear) * 12 + (month - currentMonth);

    // Calculate offset from today to the start of this month
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetMonthStart = new Date(year, month, 1);
    const offsetDays = Math.floor((targetMonthStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Get column names for dates (skip Team, Name, ID, Date row)
    // Date columns are like "1Nov", "2Nov", "3Nov"
    const dateColumns = columns.filter(col => 
      !['Team', 'Name', 'ID', 'Date'].includes(col) && col.trim()
    );

    // Build employees and schedule data
    const employees: any[] = [];
    const schedule: Record<string, string[]> = {};

    for (const record of records) {
      const team = record['Team'];
      const empName = record['Name'];
      const empId = record['ID'];

      if (!empId || !empName) continue;
      // Skip the date row (has "Date" in ID column)
      if (empId === 'Date') continue;

      // Create employee object
      employees.push({
        id: empId,
        name: empName,
        team: team || 'Unassigned',
        schedule: []
      });

      // Initialize 90-day schedule array
      const empSchedule = Array(90).fill('');
      
      // Map shifts from CSV to the correct date indices
      for (let dayInMonth = 0; dayInMonth < dateColumns.length; dayInMonth++) {
        const dateColumn = dateColumns[dayInMonth];
        const shift = record[dateColumn];
        const dateIdx = offsetDays + dayInMonth;
        
        // Only update if within 90-day window and has a shift value
        if (dateIdx >= 0 && dateIdx < 90 && shift && shift.trim()) {
          empSchedule[dateIdx] = shift.trim();
        }
      }

      schedule[empId] = empSchedule;
    }

    return NextResponse.json({
      success: true,
      data: {
        monthYear: `${monthName}-${year}`,
        monthName,
        year,
        monthOffset,
        employees,
        schedule
      }
    });
  } catch (e: any) {
    console.error('Error loading roster template:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
