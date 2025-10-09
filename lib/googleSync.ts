import fetch from 'node-fetch';
import { getGoogleLinks, setGoogle } from './dataStore';
import { RosterData } from './types';
import { extractMonthFromHeaders } from './utils';

export async function syncGoogleSheets(): Promise<{ employees:number; sheets:number; months: string[] }> {
  const links = getGoogleLinks();
  if (!Object.keys(links).length) throw new Error("No Google Sheets links configured");
  
  const monthsProcessed: string[] = [];
  let totalEmployees = 0;
  
  // Process each month's link separately
  for (const [monthYear, url] of Object.entries(links)) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`Failed to fetch sheet for ${monthYear}:`, res.statusText);
        continue;
      }
      const text = await res.text();
      const parsed = parseOne(text);
      
      // Detect month from headers if monthYear from link is not in standard format
      const detectedMonth = extractMonthFromHeaders(parsed.headers);
      const targetMonth = monthYear.match(/^\d{4}-\d{2}$/) ? monthYear : 
                          (detectedMonth ? convertMonthToYearMonth(detectedMonth, monthYear) : monthYear);
      
      // Save this month's data separately
      setGoogle(parsed, targetMonth);
      monthsProcessed.push(targetMonth);
      totalEmployees += parsed.allEmployees.length;
    } catch (e) {
      console.error(`Error loading sheet for ${monthYear}:`, url, e);
    }
  }
  
  if (monthsProcessed.length === 0) {
    throw new Error("No sheets were successfully synced");
  }
  
  return { 
    employees: totalEmployees, 
    sheets: monthsProcessed.length,
    months: monthsProcessed
  };
}

function convertMonthToYearMonth(monthName: string, fallback: string): string {
  // Try to extract year from fallback
  const yearMatch = fallback.match(/\d{4}/);
  const year = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();
  
  const monthMap: Record<string, string> = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };
  
  const monthNum = monthMap[monthName];
  return monthNum ? `${year}-${monthNum}` : fallback;
}

function parseOne(csvText: string): RosterData {
  const lines = csvText.split(/\r?\n/).map(l=>l.trim()).filter(l=>l);
  if (lines.length < 3) return { teams:{}, headers:[], allEmployees:[] };
  const headerLine = lines[1].split(',');
  const dateHeaders = headerLine.slice(3).map(h=>h.replace(/"/g,'').trim());

  const teams: Record<string, any[]> = {};
  let currentTeam = '';
  for (let i=2;i<lines.length;i++) {
    const cols = lines[i].split(',');
    if (cols.length < 4) continue;
    if (cols[0].trim()) currentTeam = cols[0].trim();
    if (!teams[currentTeam]) teams[currentTeam] = [];
    const employee = {
      name: cols[1].trim(),
      id: cols[2].trim(),
      team: currentTeam,
      currentTeam,
      schedule: cols.slice(3).map(s=>s.trim())
    };
    if (employee.name && employee.id) teams[currentTeam].push(employee);
  }
  const allEmployees: any[] = [];
  Object.values(teams).forEach(emps => emps.forEach(e=>allEmployees.push(e)));
  return { teams, headers: dateHeaders, allEmployees };
}

