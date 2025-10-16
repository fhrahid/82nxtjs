import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { ROSTER_TEMPLATES_DIR, ADMIN_DATA_FILE } from '@/lib/constants';
import { reloadAll } from '@/lib/dataStore';

export const dynamic = 'force-dynamic';

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

    // Collect all date headers from templates
    const allDateHeaders = new Set<string>();

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

        // Get date headers from CSV (exclude Team, Name, ID)
        const headers = Object.keys(records[0]);
        const dateHeaders = headers.filter(h => !['Team', 'Name', 'ID'].includes(h));
        dateHeaders.forEach(h => allDateHeaders.add(h));

        // Process each employee in the template
        for (const record of records) {
          const empId = record['ID'];
          const empName = record['Name'];
          const team = record['Team'];

          if (!empId) continue;

          // Get or create employee
          let employee = employeeMap.get(empId);
          if (!employee) {
            employee = {
              id: empId,
              name: empName || empId,
              team: team || 'Unassigned',
              currentTeam: team || 'Unassigned',
              schedule: []
            };
            employeeMap.set(empId, employee);
          } else {
            // Update name and team if provided in template
            if (empName) employee.name = empName;
            if (team) {
              employee.team = team;
              employee.currentTeam = team;
            }
          }

          // Update schedule with template data
          dateHeaders.forEach(dateHeader => {
            const shift = record[dateHeader];
            if (shift) {
              // Store the shift with the date header as key
              if (!employee.templateShifts) employee.templateShifts = {};
              employee.templateShifts[dateHeader] = shift;
            }
          });
        }
      } catch (e) {
        console.error(`Error processing template ${fileName}:`, e);
        // Continue with other templates
      }
    }

    // Convert date headers to sorted array
    const sortedDateHeaders = Array.from(allDateHeaders).sort((a, b) => {
      // Extract day number and month for comparison
      const getDateValue = (header: string) => {
        const match = header.match(/^(\d+)([A-Za-z]+)$/);
        if (!match) return 0;
        const day = parseInt(match[1]);
        const month = match[2];
        const monthMap: Record<string, number> = {
          'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
          'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
        };
        return (monthMap[month] || 0) * 100 + day;
      };
      return getDateValue(a) - getDateValue(b);
    });

    // Update admin data headers to include all date headers
    // Remove duplicate headers and merge with existing
    const existingHeaderSet = new Set(adminData.headers || []);
    sortedDateHeaders.forEach(h => {
      if (!existingHeaderSet.has(h)) {
        adminData.headers.push(h);
      }
    });

    // Rebuild employee schedules to match the headers
    const allEmployees = Array.from(employeeMap.values()).map(emp => {
      const schedule: string[] = [];
      adminData.headers.forEach((header: string) => {
        if (emp.templateShifts && emp.templateShifts[header]) {
          schedule.push(emp.templateShifts[header]);
        } else if (emp.schedule && emp.schedule[adminData.headers.indexOf(header)]) {
          schedule.push(emp.schedule[adminData.headers.indexOf(header)]);
        } else {
          schedule.push('');
        }
      });
      return {
        id: emp.id,
        name: emp.name,
        team: emp.team,
        currentTeam: emp.currentTeam || emp.team,
        schedule
      };
    });
    
    // Rebuild teams - ensure no duplicates by ID
    const teams: Record<string, any[]> = {};
    const addedIds = new Set<string>();
    
    allEmployees.forEach(emp => {
      // Skip if already added (prevents duplicates)
      if (addedIds.has(emp.id)) {
        console.warn(`Duplicate employee ID ${emp.id} detected during team rebuild, skipping duplicate`);
        return;
      }
      
      const teamName = emp.team || 'Unassigned';
      if (!teams[teamName]) teams[teamName] = [];
      teams[teamName].push(emp);
      addedIds.add(emp.id);
    });

    // Update admin data
    adminData.allEmployees = allEmployees;
    adminData.teams = teams;

    // Save updated admin data
    await fs.writeFile(ADMIN_DATA_FILE, JSON.stringify(adminData, null, 2), 'utf-8');

    // Reload all data from disk to refresh in-memory cache
    reloadAll();

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
