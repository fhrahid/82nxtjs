import { NextRequest, NextResponse } from 'next/server';
import { getDisplay, getModifiedShifts } from '@/lib/dataStore';
import { formatDateHeader } from '@/lib/utils';
import { SHIFT_MAP } from '@/lib/constants';

export async function GET(_: NextRequest, { params }:{params:{employeeId:string}}) {
  const employeeId = params.employeeId;
  const display = getDisplay();
  let employee: any = null;
  for (const [team,emps] of Object.entries(display.teams)) {
    const e = emps.find(emp=>emp.id===employeeId);
    if (e) { employee = e; break; }
  }
  if (!employee) return NextResponse.json({error:'Employee not found'},{status:404});
  const today = new Date();
  const tomorrow = new Date(Date.now()+86400000);
  const headers = display.headers;
  const todayLabel = headers.find(h=>h===formatDateHeader(today)) || headers.find(h=>h.includes(formatDateHeader(today)));
  const tomorrowLabel = headers.find(h=>h===formatDateHeader(tomorrow)) || headers.find(h=>h.includes(formatDateHeader(tomorrow)));

  function getShift(label:string|undefined) {
    if (!label) return { code: 'N/A', time: 'N/A' };
    const idx = headers.indexOf(label);
    if (idx===-1) return { code: 'N/A', time: 'N/A' };
    const code = employee.schedule[idx] || '';
    const shiftCode = code || 'N/A';
    const shiftTime = SHIFT_MAP[code] || code || 'N/A';
    return { code: shiftCode, time: shiftTime };
  }
  const todayShift = getShift(todayLabel);
  const tomorrowShift = getShift(tomorrowLabel);

  // upcoming work days next 7
  const upcoming: any[] = [];
  for (let i=0;i<7;i++) {
    const d = new Date(Date.now()+i*86400000);
    const lbl = formatDateHeader(d);
    const actual = headers.find(h=>h===lbl) || headers.find(h=>h.includes(lbl));
    if (actual) {
      const idx = headers.indexOf(actual);
      const sc = employee.schedule[idx]||'';
      if (sc && sc!=='DO') {
        const shiftTime = SHIFT_MAP[sc] || sc;
        upcoming.push({
          date: actual,
          day: d.toLocaleDateString('en-US',{weekday:'long'}),
          shift: shiftTime,
          shift_code: sc
        });
      }
    }
  }

  // time off next 30 days (current month only)
  const planned: any[] = [];
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  for (let i=0;i<30;i++) {
    const d = new Date(Date.now()+i*86400000);
    
    // Only include dates from current month
    if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) {
      continue;
    }
    
    const lbl = formatDateHeader(d);
    const actual = headers.find(h=>h===lbl) || headers.find(h=>h.includes(lbl));
    if (actual) {
      const idx = headers.indexOf(actual);
      const sc = employee.schedule[idx]||'';
      // Only include actual time off codes (DO, SL, CL, EL), exclude empty string and N/A
      if (['DO','SL','CL','EL'].includes(sc)) {
        const dow = d.getDay();
        const weekend = dow===0||dow===6;
        // Show leave on weekdays, or any leave type on weekends
        if (!weekend || ['SL','CL','EL'].includes(sc)) {
          const typeDisplay = SHIFT_MAP[sc] || sc;
          planned.push({
            date: actual,
            day: d.toLocaleDateString('en-US',{weekday:'long'}),
            type: typeDisplay,
            shift_code: sc
          });
        }
      }
    }
  }

  // shift changes from modified_shifts.json (current month only)
  const modifiedShifts = getModifiedShifts();
  const changes:any[] = [];
  
  // Get current month-year in format YYYY-MM
  const monthYearKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  
  // Filter modifications for this employee in current month
  const employeeModifications = modifiedShifts.modifications.filter(mod => 
    mod.employee_id === employeeId && mod.month_year === monthYearKey
  );
  
  // Convert modifications to changes format
  employeeModifications.forEach(mod => {
    const origTime = SHIFT_MAP[mod.old_shift] || mod.old_shift || 'N/A';
    const curTime = SHIFT_MAP[mod.new_shift] || mod.new_shift || 'N/A';
    changes.push({
      date: mod.date_header,
      original_shift: origTime,
      current_shift: curTime,
      original_code: mod.old_shift,
      current_code: mod.new_shift
    });
  });

  return NextResponse.json({
    success:true,
    employee: { name: employee.name, id: employee.id, team: employee.currentTeam||''},
    today: {date: todayLabel, shift: todayShift.time, shift_code: todayShift.code},
    tomorrow: {date: tomorrowLabel, shift: tomorrowShift.time, shift_code: tomorrowShift.code},
    upcoming_work_days: upcoming.slice(0,5),
    planned_time_off: planned.slice(0,10),
    shift_changes: changes.slice(0,10),
    summary: {
      next_work_days_count: upcoming.length,
      planned_time_off_count: planned.length,
      shift_changes_count: changes.length
    }
  });
}