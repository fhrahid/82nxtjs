import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { ROSTER_TEMPLATES_DIR, ADMIN_DATA_FILE } from '@/lib/constants';
import { setAdmin, getAdmin, loadAll } from '@/lib/dataStore';

export async function POST(req: Request) {
  try {
    const { templateFiles } = await req.json();

    if (!templateFiles || !Array.isArray(templateFiles) || templateFiles.length === 0) {
      return NextResponse.json({ success: false, error: 'No template files selected' }, { status: 400 });
    }

    // Reload all data from disk to ensure we have the latest state
    // This is important if files were manually updated
    loadAll();

    // Read current admin data from disk
    let adminData: any = { allEmployees: [], teams: {}, headers: [] };
    try {
      const adminDataContent = await fs.readFile(ADMIN_DATA_FILE, 'utf-8');
      adminData = JSON.parse(adminDataContent);
    } catch (e) {
      console.log('No existing admin data, creating new');
    }

    // Keep track of employees and their schedules
    const employeeMap = new Map<string, any>();
    
    // Initialize with existing employees
    adminData.allEmployees?.forEach((emp: any) => {
      employeeMap.set(emp.id, {
        ...emp,
        schedule: Array.isArray(emp.schedule) ? [...emp.schedule] : []
      });
    });

    // Calculate today for date index mapping
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Process each template file
    for (const fileName of templateFiles) {
      const filePath = path.join(ROSTER_TEMPLATES_DIR, fileName);
      
      try {
        const csvContent = await fs.readFile(filePath, 'utf-8');
        const records = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });

        if (records.length === 0) continue;

        // The new format has headers: Team,Name,ID,1Nov,2Nov,3Nov,...
        // Extract month and year from filename (e.g., "November-2025.csv")
        const fileNameWithoutExt = fileName.replace('.csv', '');
        const [monthName, yearStr] = fileNameWithoutExt.split('-');
        
        if (!monthName || !yearStr) {
          console.error(`Template ${fileName} has invalid filename format. Expected: MonthName-Year.csv`);
          continue;
        }

        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const month = monthNames.indexOf(monthName);
        const year = parseInt(yearStr);

        if (month === -1 || isNaN(year)) {
          console.error(`Invalid month or year in template ${fileName}`);
          continue;
        }

        // Calculate the number of days in this month
        const lastDay = new Date(year, month + 1, 0).getDate();
        
        // Calculate offset from today to the start of this month
        const targetMonthStart = new Date(year, month, 1);
        const offsetDays = Math.floor((targetMonthStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Get column names for dates (skip Team, Name, ID, Date row)
        const firstRecord = records[0];
        const columns = Object.keys(firstRecord);
        const dateColumns = columns.filter(col => 
          !['Team', 'Name', 'ID', 'Date'].includes(col) && col.trim()
        );

        // Process each employee in the template
        for (const record of records) {
          const team = record['Team'];
          const empName = record['Name'];
          const empId = record['ID'];

          if (!empId || !empName) continue;
          // Skip the date row (has "Date" in ID column)
          if (empId === 'Date') continue;

          // Get or create employee
          let employee = employeeMap.get(empId);
          if (!employee) {
            employee = {
              id: empId,
              name: empName,
              team: team || 'Unassigned',
              schedule: []
            };
            employeeMap.set(empId, employee);
          } else {
            // Update name and team if provided in template
            if (empName) employee.name = empName;
            if (team) employee.team = team;
          }

          // Ensure schedule array is long enough (90 days)
          while (employee.schedule.length < 90) {
            employee.schedule.push('');
          }

          // Map template shifts to correct date indices
          for (let dayInMonth = 0; dayInMonth < lastDay && dayInMonth < dateColumns.length; dayInMonth++) {
            const dateColumn = dateColumns[dayInMonth];
            const shift = record[dateColumn];
            const dateIdx = offsetDays + dayInMonth;
            
            // Only update if within 90-day window and has a shift value
            if (dateIdx >= 0 && dateIdx < 90 && shift && shift.trim()) {
              employee.schedule[dateIdx] = shift.trim();
            }
          }
        }
      } catch (e) {
        console.error(`Error processing template ${fileName}:`, e);
        // Continue with other templates
      }
    }

    // Rebuild admin data structure
    const allEmployees = Array.from(employeeMap.values());
    
    // Rebuild teams
    const teams: Record<string, any[]> = {};
    allEmployees.forEach(emp => {
      const teamName = emp.team || 'Unassigned';
      if (!teams[teamName]) teams[teamName] = [];
      teams[teamName].push(emp);
    });

    // Generate headers if not present (90 days from today)
    if (!adminData.headers || adminData.headers.length === 0) {
      const headers: string[] = [];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      for (let i = 0; i < 90; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const day = date.getDate();
        const month = monthNames[date.getMonth()];
        headers.push(`${day} ${month}`);
      }
      adminData.headers = headers;
    }

    // Update admin data
    adminData.allEmployees = allEmployees;
    adminData.teams = teams;

    // Use setAdmin to properly update in-memory data and trigger mergeDisplay
    setAdmin(adminData);

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${templateFiles.length} template(s)`,
      employeesUpdated: allEmployees.length
    });
  } catch (e: any) {
    console.error('Error syncing roster templates:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
