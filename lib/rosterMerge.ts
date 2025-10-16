import { RosterData, Employee } from './types';
import { normalizeDateHeader, extractMonthFromHeaders } from './utils';
import { VALID_SHIFT_CODES } from './constants';

/**
 * Validates if a header string looks like a valid date header (e.g., "1Oct", "15-Jan", "20 Dec")
 * Headers should contain a day number and month name
 */
function isValidDateHeader(header: string): boolean {
  if (!header || !header.trim()) return false;
  // Check if header contains both digits and letters (day + month)
  const hasDigit = /\d/.test(header);
  const hasLetter = /[a-zA-Z]/.test(header);
  // Check for common month abbreviations
  const monthPattern = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;
  const hasMonth = monthPattern.test(header);
  return hasDigit && hasLetter && hasMonth;
}

/**
 * Validates if an employee row has at least some valid shift data
 * Returns true if the row contains at least one valid shift code
 */
function hasValidShiftData(shifts: string[]): boolean {
  if (!shifts || shifts.length === 0) return false;
  // Check if at least one shift is a valid shift code (or is empty/whitespace for flexibility)
  const validShifts = shifts.filter(s => {
    const trimmed = s.trim().toUpperCase();
    return trimmed === '' || VALID_SHIFT_CODES.includes(trimmed);
  });
  // Must have at least one non-empty valid shift
  const hasNonEmptyValidShift = shifts.some(s => {
    const trimmed = s.trim().toUpperCase();
    return trimmed !== '' && VALID_SHIFT_CODES.includes(trimmed);
  });
  return hasNonEmptyValidShift;
}

export function mergeCsvIntoGoogle(existing: RosterData, rawRows: string[][]) {
  // rawRows as parsed CSV: first row headers row, second maybe date row convention
  if (rawRows.length < 2) throw new Error("CSV too short");

  // FIRST ROW: Team,Name,ID,Dates...
  const headerRow = rawRows[0];
  const dateHeadersRaw = headerRow.slice(3).filter(h=>h.trim());
  
  // Validate headers - only include valid date headers
  const validDateHeaders = dateHeadersRaw.filter(h => isValidDateHeader(h));
  if (validDateHeaders.length === 0) {
    throw new Error("No valid date headers found in CSV. Headers must contain day and month (e.g., '1Oct', '15-Jan')");
  }
  
  const normalized = validDateHeaders.map(normalizeDateHeader);
  const detectedMonth = extractMonthFromHeaders(validDateHeaders);
  const newHeaders = mergeHeaders(existing.headers, normalized, detectedMonth);

  const importedTeams: Record<string, Employee[]> = {};
  let skippedRows = 0;
  
  for (let i=1;i<rawRows.length;i++) {
    const row = rawRows[i];
    if (row.length < 3) continue;
    const [team, name, emp_id, ...shifts] = row.map(v=>v.trim());
    if (!team || !name || !emp_id) continue;
    
    // Extract only shifts corresponding to valid date headers
    const validShifts = validDateHeaders.map((_, idx) => {
      // Get the shift value from the original position in dateHeadersRaw
      const originalIdx = dateHeadersRaw.indexOf(validDateHeaders[idx]);
      return shifts[originalIdx] || '';
    });
    
    // Validate employee has valid shift data
    if (!hasValidShiftData(validShifts)) {
      skippedRows++;
      continue; // Skip this employee row as it has no valid shift data
    }
    
    if (!importedTeams[team]) importedTeams[team] = [];
    importedTeams[team].push({
      name,
      id: emp_id,
      team,
      currentTeam: team,
      schedule: validShifts.slice(0, normalized.length)
    });
  }
  
  if (skippedRows > 0) {
    console.log(`Skipped ${skippedRows} row(s) with invalid or missing shift data`);
  }

  // apply merges
  Object.entries(importedTeams).forEach(([team, emps])=>{
    if (!existing.teams[team]) existing.teams[team] = [];
    emps.forEach(imp=>{
      // First, check if employee exists in ANY team and remove them if found in a different team
      let foundInOtherTeam = false;
      Object.entries(existing.teams).forEach(([otherTeam, otherEmps])=>{
        if (otherTeam !== team) {
          const idx = otherEmps.findIndex(e=>e.id===imp.id);
          if (idx > -1) {
            // Employee found in different team, remove them
            existing.teams[otherTeam].splice(idx, 1);
            foundInOtherTeam = true;
          }
        }
      });
      
      const existingEmp = existing.teams[team].find(e=>e.id===imp.id);
      if (existingEmp) {
        // Update existing employee in current team - update name, team, and schedule
        existingEmp.name = imp.name; // Always update name to latest from CSV
        existingEmp.currentTeam = team;
        existingEmp.team = team;
        while (existingEmp.schedule.length < newHeaders.length) existingEmp.schedule.push('');
        normalized.forEach((hdr,i)=>{
          const idx = newHeaders.indexOf(hdr);
          if (idx>-1 && imp.schedule[i]) {
            existingEmp.schedule[idx] = imp.schedule[i];
          }
        });
      } else {
        // Add new employee to current team
        const newEmp: Employee = {
          name: imp.name,
          id: imp.id,
          currentTeam: team,
          team,
          schedule: Array(newHeaders.length).fill('')
        };
        normalized.forEach((hdr,i)=>{
          const idx = newHeaders.indexOf(hdr);
          if (idx>-1 && imp.schedule[i]) {
            newEmp.schedule[idx] = imp.schedule[i];
          }
        });
        existing.teams[team].push(newEmp);
      }
    });
  });

  // rebuild allEmployees
  const all: Employee[] = [];
  Object.entries(existing.teams).forEach(([team, emps])=>{
    emps.forEach(e=>{
      e.currentTeam = team;
      all.push(e);
    });
  });
  existing.allEmployees = all;
  existing.headers = newHeaders;
  return { normalized, detectedMonth };
}

function mergeHeaders(existing: string[], newMonthHeaders: string[], detectedMonth: string|null): string[] {
  if (!detectedMonth) return Array.from(new Set([...existing, ...newMonthHeaders]));
  const filtered = existing.filter(h=>!h.toLowerCase().includes(detectedMonth.toLowerCase()));
  return [...filtered, ...newMonthHeaders];
}