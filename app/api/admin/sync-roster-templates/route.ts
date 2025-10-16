import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { ROSTER_TEMPLATES_DIR, ADMIN_DATA_FILE } from '@/lib/constants';

export async function POST(req: Request) {
  try {
    const { templateFiles } = await req.json();

    if (!templateFiles || !Array.isArray(templateFiles) || templateFiles.length === 0) {
      return NextResponse.json({ success: false, error: 'No template files selected' }, { status: 400 });
    }

    // Read current admin data
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
        schedule: emp.schedule || []
      });
    });

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

        // Process each employee in the template
        for (const record of records) {
          const empId = record['Employee ID'];
          const empName = record['Employee Name'];
          const team = record['Team'];

          if (!empId) continue;

          // Get or create employee
          let employee = employeeMap.get(empId);
          if (!employee) {
            employee = {
              id: empId,
              name: empName || empId,
              team: team || 'Unassigned',
              schedule: []
            };
            employeeMap.set(empId, employee);
          } else {
            // Update name and team if provided in template
            if (empName) employee.name = empName;
            if (team) employee.team = team;
          }

          // Merge schedule data (Day1, Day2, ... Day90)
          for (let i = 1; i <= 90; i++) {
            const dayKey = `Day${i}`;
            const shift = record[dayKey];
            
            if (shift) {
              // Ensure schedule array is long enough
              while (employee.schedule.length < i) {
                employee.schedule.push('');
              }
              // Only update if there's a shift value in the template
              employee.schedule[i - 1] = shift;
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
      const today = new Date();
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

    // Save updated admin data
    await fs.writeFile(ADMIN_DATA_FILE, JSON.stringify(adminData, null, 2), 'utf-8');

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
