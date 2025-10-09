import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { setGoogle } from '@/lib/dataStore';
import { parseCsv, extractMonthFromHeaders } from '@/lib/utils';
import { RosterData } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!getSessionUser()) return NextResponse.json({error:'Unauthorized'},{status:401});
  
  const formData = await req.formData();
  const file = formData.get('csv_file') as File | null;
  const monthYear = formData.get('monthYear') as string | null;
  
  if (!file) return NextResponse.json({success:false,error:'No file uploaded'});
  if (!monthYear) return NextResponse.json({success:false,error:'Month/Year is required'});
  
  const text = await file.text();
  
  try {
    // Parse CSV directly into RosterData
    const parsed = parseCSVToRosterData(text);
    
    // Detect month from headers for validation
    const detectedMonth = extractMonthFromHeaders(parsed.headers);
    
    // Save to monthly file
    setGoogle(parsed, monthYear);
    
    return NextResponse.json({
      success:true, 
      message:`CSV imported successfully for ${monthYear}${detectedMonth ? ` (detected: ${detectedMonth})` : ''}!`
    });
  } catch (e:any) {
    return NextResponse.json({success:false, error:e.message});
  }
}

function parseCSVToRosterData(csvText: string): RosterData {
  const lines = csvText.split(/\r?\n/).map(l=>l.trim()).filter(l=>l);
  if (lines.length < 3) throw new Error('CSV file is too short');
  
  const headerLine = lines[1].split(',');
  const dateHeaders = headerLine.slice(3).map(h=>h.replace(/"/g,'').trim());

  const teams: Record<string, any[]> = {};
  let currentTeam = '';
  
  for (let i=2; i<lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 4) continue;
    if (cols[0].trim()) currentTeam = cols[0].trim();
    if (!currentTeam) continue;
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