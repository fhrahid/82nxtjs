"use client";
import { useState, useMemo, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import Modal from './Modal';
import { SHIFT_MAP } from '@/lib/constants';

interface Employee {
  id: string;
  name: string;
  schedule: string[];
  team?: string;
  [k:string]: any;
}

interface Props {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  onSave: (updatedSchedule: Record<string, string[]>) => Promise<void>;
  onAddEmployee?: (name: string, id: string, team: string) => Promise<void>;
  onChangeTeam?: (employeeId: string, newTeam: string) => Promise<void>;
}

const SHIFT_OPTIONS = ['M2', 'M3', 'M4', 'D1', 'D2', 'DO', 'SL', 'CL', 'EL', 'HL'];

const STICKY_BG = '#0E141C';
const CELL_BG_FILLED = '#15202E';
const EMP_COL_W = 240;
const DATE_COL_W = 120;

type EditingCell = { empId: string; dateIdx: number } | null;
type PopPos = { top: number; left: number; placement: 'above'|'below' } | null;

export default function RosterTemplateModal({ open, onClose, employees, onSave, onAddEmployee, onChangeTeam }: Props) {
  // States
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [monthOffset, setMonthOffset] = useState(1);
  const [schedule, setSchedule] = useState<Record<string, string[]>>({});
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [saving, setSaving] = useState(false);

  // Inline Add Employee (bottom bar)
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpId, setNewEmpId] = useState('');
  const [newEmpTeam, setNewEmpTeam] = useState('');

  // Keep "change team" here (Template modal)
  const [editingTeam, setEditingTeam] = useState<{empId: string, currentTeam: string} | null>(null);

  // Search/select employees (under team filters)
  const [empQuery, setEmpQuery] = useState('');
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const clearSelectedEmployees = () => setSelectedEmpIds([]);

  // Locally added employees (optimistic display even if no onAddEmployee provided)
  const [localAdds, setLocalAdds] = useState<Employee[]>([]);

  // Sticky grid & popover hooks (declare before any return)
  const scrollRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const anchorElRef = useRef<HTMLElement | null>(null);
  const [popPos, setPopPos] = useState<PopPos>(null);
  const [popReady, setPopReady] = useState(false);

  // Merge employees + localAdds, dedupe by id (prefer server/prop version)
  const allEmployees = useMemo(() => {
    const byId = new Map<string, Employee>();
    employees.forEach(e => byId.set(e.id, e));
    localAdds.forEach(e => { if (!byId.has(e.id)) byId.set(e.id, e); });
    return Array.from(byId.values());
  }, [employees, localAdds]);

  // Team list includes local adds
  const teamNames = useMemo(() => {
    const teams = new Set<string>();
    allEmployees.forEach(emp => { if (emp.team) teams.add(emp.team); });
    return Array.from(teams).sort();
  }, [allEmployees]);

  // Initialize or backfill schedule for all known employees
  useEffect(() => {
    if (allEmployees.length === 0) return;
    setSchedule(prev => {
      const next: Record<string, string[]> = { ...prev };
      allEmployees.forEach(emp => {
        if (!next[emp.id]) {
          // 90-day horizon like before
          next[emp.id] = Array(90).fill('');
        }
      });
      return next;
    });
  }, [allEmployees]);

  const selectAllTeams = () => setSelectedTeams(teamNames);
  const clearAllTeams = () => setSelectedTeams([]);
  const toggleTeam = (team: string) =>
    setSelectedTeams(prev => prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]);

  // Month view dates
  const { displayDates, displayMonthName, canGoPrev, canGoNext } = useMemo(() => {
    const now = new Date();
    const targetMonth = now.getMonth() + monthOffset;
    const targetYear = now.getFullYear() + Math.floor(targetMonth / 12);
    const adjustedMonth = ((targetMonth % 12) + 12) % 12;
    const lastDay = new Date(targetYear, adjustedMonth + 1, 0).getDate();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const dayNames   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const today = new Date(); today.setHours(0,0,0,0);
    const dates: {day:number; date:string; dayName:string; dateIdx:number}[] = [];
    for (let d = 1; d <= lastDay; d++) {
      const cur = new Date(targetYear, adjustedMonth, d);
      const diffDays = Math.floor((cur.getTime() - today.getTime()) / (1000*60*60*24));
      dates.push({ day:d, date:`${d} ${monthNames[adjustedMonth]}`, dayName:dayNames[cur.getDay()], dateIdx:diffDays });
    }
    return {
      displayDates: dates,
      displayMonthName: `${monthNames[adjustedMonth]} ${targetYear}`,
      canGoPrev: monthOffset > 1,
      canGoNext: monthOffset < 11
    };
  }, [monthOffset]);

  // Team and search filters apply over allEmployees
  const teamFiltered = useMemo(() => {
    if (selectedTeams.length === 0) return allEmployees;
    return allEmployees.filter(emp => emp.team && selectedTeams.includes(emp.team));
  }, [allEmployees, selectedTeams]);

  const suggestions = useMemo(() => {
    const q = empQuery.trim().toLowerCase();
    if (!q) return [];
    return teamFiltered.filter(e => e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)).slice(0, 10);
  }, [empQuery, teamFiltered]);

  const filteredEmployees = useMemo(() => {
    if (selectedEmpIds.length === 0) return teamFiltered;
    const set = new Set(selectedEmpIds);
    return teamFiltered.filter(e => set.has(e.id));
  }, [teamFiltered, selectedEmpIds]);

  // Popover positioning
  const computePopoverPosition = useCallback(() => {
    if (!scrollRef.current || !popRef.current || !anchorElRef.current) return;
    const container = scrollRef.current;
    const pop = popRef.current;
    const anchor = anchorElRef.current;

    const contRect = container.getBoundingClientRect();
    const cellRect = anchor.getBoundingClientRect();

    const prevVis = pop.style.visibility;
    const prevOp = pop.style.opacity;
    pop.style.visibility = 'hidden';
    pop.style.opacity = '0';
    pop.style.display = 'block';
    const popRect  = pop.getBoundingClientRect();

    const contentTop  = container.scrollTop  + (cellRect.top  - contRect.top);
    const contentLeft = container.scrollLeft + (cellRect.left - contRect.left);
    const cellBottom = contentTop + cellRect.height;
    const cellCenterX = contentLeft + cellRect.width/2;

    const viewTop = container.scrollTop;
    const viewLeft = container.scrollLeft;
    const viewBottom = viewTop + container.clientHeight;
    const viewRight  = viewLeft + container.clientWidth;

    const margin = 8;

    let placement: 'above'|'below' = 'below';
    let top = cellBottom + margin;
    if (top + popRect.height > viewBottom) {
      placement = 'above';
      top = contentTop - popRect.height - margin;
      if (top < viewTop + margin) top = viewTop + margin;
    }

    let left = cellCenterX - popRect.width/2;
    if (left < viewLeft + margin) left = viewLeft + margin;
    if (left + popRect.width > viewRight - margin) left = viewRight - popRect.width - margin;

    setPopPos({ top, left, placement });

    pop.style.visibility = prevVis;
    pop.style.opacity = prevOp;
  }, []);

  useLayoutEffect(() => {
    if (!editingCell) { setPopPos(null); setPopReady(false); return; }
    setPopReady(true);
    const raf = requestAnimationFrame(computePopoverPosition);
    const onScroll = () => computePopoverPosition();
    const onResize = () => computePopoverPosition();
    const container = scrollRef.current;
    container?.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      container?.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [editingCell, computePopoverPosition]);

  // Close popover when clicking outside
  useEffect(() => {
    if (!editingCell) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setEditingCell(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingCell]);

  // Handlers
  function handleCellClick(e: React.MouseEvent<HTMLTableCellElement>, empId: string, dateIdx: number) {
    anchorElRef.current = e.currentTarget;
    setPopReady(false);
    setEditingCell({empId, dateIdx});
  }
  function handleShiftSelect(shift: string) {
    if (!editingCell) return;
    setSchedule(prev => ({
      ...prev,
      [editingCell.empId]: prev[editingCell.empId].map((s, idx) => idx === editingCell.dateIdx ? shift : s)
    }));
    setEditingCell(null);
  }
  async function handleSave() {
    setSaving(true);
    try {
      // Save to CSV via API
      const response = await fetch('/api/admin/save-roster-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule,
          monthYear: displayMonthName.replace(' ', '-'), // e.g., "November-2025"
          employees: allEmployees,
          monthOffset
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`Template saved successfully as ${result.fileName}!`);
        // Also call the parent onSave if provided
        await onSave(schedule);
        onClose();
      } else {
        alert(`Failed to save template: ${result.error}`);
      }
    } catch (e) {
      alert('Failed to save roster template');
      console.error(e);
    }
    setSaving(false);
  }
  function displayShift(code: string): string { return !code ? '-' : (SHIFT_MAP[code] || code); }

  // Inline add employee (optimistic, with optional persistence)
  async function addInlineEmployee() {
    const name = newEmpName.trim();
    const id = newEmpId.trim();
    const team = newEmpTeam.trim();

    if (!name || !id || !team) {
      alert('Please fill Name, ID and Team');
      return;
    }
    // Prevent duplicates by ID
    if (allEmployees.some(e => e.id === id)) {
      alert('An employee with this ID already exists.');
      return;
    }

    // Optimistically show the new employee immediately
    const optimistic: Employee = { id, name, team, schedule: [] };
    setLocalAdds(prev => [...prev, optimistic]);

    // Ensure schedule exists
    setSchedule(prev => ({ ...prev, [id]: prev[id] ?? Array(90).fill('') }));

    // Clear inputs
    setNewEmpName(''); setNewEmpId(''); setNewEmpTeam('');

    // Try to persist if a handler is provided
    if (onAddEmployee) {
      try {
        await onAddEmployee(name, id, team);
        // Parent should re-render with the new employee from props later; until then our optimistic stays
      } catch (e) {
        console.error(e);
        alert('Failed to persist new employee to server. Showing locally only.');
      }
    }
  }

  // Change team handler entrypoint
  async function applyTeamChange(empId: string, newTeam: string) {
    try {
      if (onChangeTeam) {
        await onChangeTeam(empId, newTeam);
      }
      // Update locally (covers both optimistic and immediate reflection)
      // Try to update in localAdds first
      setLocalAdds(prev => prev.map(e => e.id === empId ? { ...e, team: newTeam } : e));
      // If not in localAdds, reflect in schedule view by reconstructing allEmployees via prop change on next render
      setEditingTeam(null);
    } catch (e) {
      alert('Failed to change team');
    }
  }

  if (!open) return null;

  const legendItems = SHIFT_OPTIONS.map(code => ({ code, label: SHIFT_MAP[code] || code }));

  // Bottom bar height used to pad the scroller so rows never hide under it
  const BOTTOM_BAR_H = 140;

  return (
    <Modal open={open} onClose={onClose} title="Roster Template" width="95vw">
      <div className="rtm-modal-root" style={{'--rtm-bottom-pad': `${BOTTOM_BAR_H + 12}px`} as React.CSSProperties}>
        <p className="rtm-intro">
          Create roster schedules for future months. Click on any cell to assign a shift.
        </p>

        {/* Team Filters */}
        <div className="rtm-filters">
          <div className="rtm-team-row">
            <strong>Team Filters:</strong>
            {teamNames.map(team => (
              <button key={team}
                className={`sv-chip ${selectedTeams.includes(team) ? 'active' : ''}`}
                onClick={() => toggleTeam(team)}>
                {team}
              </button>
            ))}
            <button className="btn tiny" onClick={selectAllTeams}>Select All</button>
            <button className="btn tiny" onClick={clearAllTeams}>Clear All</button>
          </div>

          {/* Legend + Search row (under team filters) */}
          <div className="rtm-legend-search-row">
            {/* Legend grid 3 rows x 4 cols */}
            <div className="rtm-legend">
              <div className="rtm-legend-title">Shift Mapping</div>
              <div className="rtm-legend-grid">
                {legendItems.map(item=>(
                  <div key={item.code} className="rtm-legend-cell" title={`${item.code} = ${item.label}`}>
                    <strong className="rtm-legend-code">{item.code}</strong>
                    <span className="rtm-legend-label">{item.label}</span>
                  </div>
                ))}
                {Array.from({length: Math.max(0, 12-legendItems.length)}).map((_,i)=>(
                  <div key={`pad-${i}`} className="rtm-legend-cell pad" />
                ))}
              </div>
            </div>

            {/* Search block */}
            <div className="rtm-search">
              <input
                placeholder="Search employee (name or ID)"
                value={empQuery}
                onChange={e=>setEmpQuery(e.target.value)}
              />
              <button className="btn tiny" onClick={clearSelectedEmployees}>Clear Selected</button>
            </div>

            {/* Suggestions */}
            {empQuery.trim() && suggestions.length>0 && (
              <div className="rtm-suggestions">
                {suggestions.map(s=>(
                  <button key={s.id} className="sv-chip" onClick={()=> setSelectedEmpIds(prev => prev.includes(s.id) ? prev : [...prev, s.id])}>
                    ➕ {s.name} ({s.id})
                  </button>
                ))}
              </div>
            )}

            {/* Selected chips */}
            {selectedEmpIds.length>0 && (
              <div className="rtm-selected">
                {selectedEmpIds.map(id=>{
                  const emp = allEmployees.find(e=>e.id===id);
                  return (
                    <span key={id} className="sv-chip active">
                      {emp?.name || id}
                      <button className="btn tiny" onClick={()=> setSelectedEmpIds(prev => prev.filter(x=>x!==id))}>✕</button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Month Navigation + Info */}
        <div className="rtm-month-row">
          <div className="rtm-month-left">
            <button className="btn" onClick={()=>setMonthOffset(v=>v-1)} disabled={!canGoPrev}>← Previous</button>
            <strong className="rtm-month-name">{displayMonthName}</strong>
            <button className="btn" onClick={()=>setMonthOffset(v=>v+1)} disabled={!canGoNext}>Next →</button>
          </div>
          <div className="rtm-month-info">
            <div><strong>{filteredEmployees.length}</strong> Employees</div>
            <div><strong>{displayDates.length}</strong> Days</div>
          </div>
        </div>

        {/* Grid (flex scroller with padding so sticky footer doesn't cover rows) */}
        <div className="rtm-grid-wrap" ref={scrollRef}>
          <table className="rtm-table">
            <thead>
              <tr>
                <th className="rtm-corner">Employee</th>
                {displayDates.map(d => (
                  <th key={d.dateIdx} className="rtm-head">
                    <div className="rtm-head-day">{d.dayName.toUpperCase()}</div>
                    <div className="rtm-head-date">{d.date}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(emp => (
                <tr key={emp.id}>
                  <td className="rtm-emp">
                    <div className="rtm-emp-name">{emp.name}</div>
                    <div className="rtm-emp-meta">
                      {emp.id}
                      {emp.team && (
                        <span
                          onClick={(e)=>{ e.stopPropagation(); if (onChangeTeam && emp.team) setEditingTeam({empId: emp.id, currentTeam: emp.team}); }}
                          className={`rtm-team-pill ${onChangeTeam ? 'clickable' : ''}`}
                          title={onChangeTeam ? 'Click to change team' : emp.team}
                        >
                          {emp.team}
                        </span>
                      )}
                    </div>
                  </td>
                  {displayDates.map(d => {
                    const shift = schedule[emp.id]?.[d.dateIdx] || '';
                    const isActive = editingCell?.empId === emp.id && editingCell?.dateIdx === d.dateIdx;
                    return (
                      <td key={`${emp.id}-${d.dateIdx}`} className={`rtm-cell ${shift ? 'has' : ''} ${isActive ? 'active' : ''}`}
                          onClick={(e)=>handleCellClick(e, emp.id, d.dateIdx)}>
                        <div className="rtm-shift">{displayShift(shift)}</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Floating chooser */}
          {editingCell && (
            <div
              ref={popRef}
              className="rtm-pop"
              style={{
                position:'absolute',
                top:(popPos?.top ?? 0),
                left:(popPos?.left ?? 0),
                visibility: popReady && popPos ? 'visible' : 'hidden',
                opacity: popReady && popPos ? 1 : 0,
                background: STICKY_BG,
                border:'2px solid var(--theme-primary)',
                borderRadius:10,
                padding:10,
                zIndex:1000,
                minWidth:220,
                maxWidth:320,
                boxShadow:'0 10px 30px rgba(0,0,0,.35)',
                transition:'opacity .12s ease'
              }}
              onClick={(e)=>e.stopPropagation()}
            >
              <div className="rtm-pop-grid">
                {SHIFT_OPTIONS.map(opt => (<button key={opt} className="btn tiny" onClick={()=>handleShiftSelect(opt)}>{opt}</button>))}
                <button className="btn tiny" onClick={()=>handleShiftSelect('')} style={{gridColumn:'span 2', background:'#ff6b6b'}}>Clear</button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom sticky utility bar (inline Add + actions) */}
        <div className="rtm-bottom-bar" style={{height: BOTTOM_BAR_H}}>
          <div className="rtm-add-inline">
            <div className="rtm-add-title">Add / Create Employee</div>
            <input
              placeholder="Name"
              value={newEmpName}
              onChange={e=>setNewEmpName(e.target.value)}
            />
            <input
              placeholder="Employee ID (e.g., SLL-XXXXX)"
              value={newEmpId}
              onChange={e=>setNewEmpId(e.target.value)}
            />
            <select value={newEmpTeam} onChange={e=>setNewEmpTeam(e.target.value)}>
              <option value="">Team</option>
              {teamNames.map(t => (<option key={t} value={t}>{t}</option>))}
            </select>
            <button
              className="btn primary"
              onClick={addInlineEmployee}
              disabled={!newEmpName || !newEmpId || !newEmpTeam}
              title={onAddEmployee ? 'Add and save employee' : 'Add locally (no server handler provided)'}
            >
              Add
            </button>
          </div>

          <div className="rtm-actions">
            <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="btn primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>

        {/* Change Team Dialog */}
        {editingTeam && onChangeTeam && (
          <div className="rtm-team-modal">
            <div className="rtm-team-card">
              <h3 style={{marginTop:0}}>Change Team</h3>
              <p className="rtm-team-current">Current team: <strong>{editingTeam.currentTeam}</strong></p>
              <div className="rtm-team-list">
                {teamNames.filter(t=>t!==editingTeam.currentTeam).map(team=>(
                  <button
                    key={team}
                    className="btn"
                    onClick={()=>applyTeamChange(editingTeam.empId, team)}
                  >
                    {team}
                  </button>
                ))}
              </div>
              <button className="btn" onClick={()=>setEditingTeam(null)} style={{marginTop:12, width:'100%'}}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .rtm-modal-root {
          display:flex;
          flex-direction:column;
          gap:12px;
          max-height: 82vh;
          min-height: 60vh;
          box-sizing: border-box;
        }
        .rtm-intro { margin:0 0 6px; color: var(--theme-text-dim); }

        .rtm-filters { display:flex; flex-direction:column; gap:10px; }
        .rtm-team-row { display:flex; flex-wrap:wrap; align-items:center; gap:10px; }
        .sv-chip { padding: 6px 12px; font-size: .85rem; border-radius: 8px; background: #1d2935; border: 1px solid #324556; color: #d5dee6; cursor: pointer; }
        .sv-chip.active { background:#3a6599; border-color:#5e94d1; color:#fff; box-shadow:0 0 0 2px rgba(94,148,209,.28); }

        .rtm-legend-search-row { display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap; justify-content:space-between; }
        .rtm-legend {
          flex: 1 1 600px;
          background: var(--theme-card-bg);
          border: 1px solid var(--theme-border);
          border-radius: 8px;
          padding: 8px 10px;
        }
        .rtm-legend-title { font-size:.8rem; color:var(--theme-text-dim); margin-bottom:6px; font-weight:600; }
        .rtm-legend-grid { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 6px 8px; }
        .rtm-legend-cell { border:1px solid var(--theme-border); border-radius:8px; padding:6px 8px; font-size:.78rem; color:var(--theme-text); background:#13202a; display:flex; gap:6px; align-items:center; min-height: 32px; }
        .rtm-legend-cell.pad { visibility:hidden; }
        .rtm-legend-code { font-weight:700; }
        .rtm-legend-label { opacity:.9; }

        .rtm-search { flex: 0 0 320px; display:flex; gap:8px; align-items:center; }
        .rtm-search input { padding:9px 12px; border:1px solid var(--theme-border); border-radius:8px; background:var(--theme-bg); color:var(--theme-text); width:100%; }
        .rtm-suggestions, .rtm-selected { width:100%; display:flex; gap:6px; flex-wrap:wrap; }

        .rtm-month-row { display:flex; align-items:center; justify-content:space-between; background: var(--theme-card-bg); border:1px solid var(--theme-border); border-radius:8px; padding:10px; }
        .rtm-month-left { display:flex; align-items:center; gap:15px; }
        .rtm-month-name { font-size:1.1rem; }
        .rtm-month-info { display:flex; gap:15px; font-size:.9rem; color:var(--theme-text-dim); }

        .rtm-grid-wrap {
          position: relative;
          flex: 1 1 auto;
          min-height: 0;
          overflow: auto;
          padding-bottom: var(--rtm-bottom-pad);
          border: 1px solid var(--theme-border);
          border-radius: 8px;
          background: transparent;
        }

        .rtm-table { width: max-content; min-width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; color: var(--theme-text); }
        .rtm-table thead th, .rtm-table tbody td { border-bottom: 1px solid var(--theme-border); border-right: 1px solid var(--theme-border); padding: 10px 8px; background: transparent; white-space: nowrap; vertical-align: middle; }
        .rtm-table thead th:first-child, .rtm-table tbody td:first-child { border-left: 1px solid var(--theme-border); }

        .rtm-head { position: sticky; top: 0; z-index: 40; background: ${STICKY_BG} !important; opacity: 1 !important; width: ${DATE_COL_W}px; min-width: ${DATE_COL_W}px; text-align: center; }
        .rtm-head-day { font-size: .72rem; font-weight: 800; letter-spacing: .3px; color: #c2cfdb; }
        .rtm-head-date { font-size: .7rem; color: var(--theme-text-dim); }

        .rtm-corner { position: sticky; left: 0; top: 0; z-index: 60; background: ${STICKY_BG} !important; opacity: 1 !important; width: ${EMP_COL_W}px; min-width: ${EMP_COL_W}px; max-width: ${EMP_COL_W}px; box-shadow: 2px 0 0 rgba(0,0,0,.25); }
        .rtm-emp { position: sticky; left: 0; z-index: 50; background: ${STICKY_BG} !important; opacity: 1 !important; width: ${EMP_COL_W}px; min-width: ${EMP_COL_W}px; maxWidth: ${EMP_COL_W}px; box-shadow: 2px 0 0 rgba(0,0,0,.25); }
        .rtm-emp-name { font-weight: 700; }
        .rtm-emp-meta { font-size:.8rem; color:var(--theme-text-dim); }
        .rtm-team-pill { margin-left:8px; padding:2px 6px; background: var(--theme-primary); color:#fff; border-radius:4px; font-size:.75rem; }
        .rtm-team-pill.clickable { cursor:pointer; }

        .rtm-cell { width: ${DATE_COL_W}px; min-width: ${DATE_COL_W}px; text-align: center; position: relative; cursor: pointer; }
        .rtm-cell.has { background: ${CELL_BG_FILLED}; }
        .rtm-shift { font-size: .92rem; }
        .rtm-cell.active { outline: 2px solid var(--theme-primary); outline-offset: -2px; z-index: 1; }

        .rtm-pop-grid { display:grid; grid-template-columns: 1fr 1fr; gap:8px; }

        .rtm-bottom-bar {
          position: sticky; bottom: 0;
          display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
          background: var(--theme-bg);
          border-top: 1px solid var(--theme-border);
          padding: 10px 12px;
          z-index: 200;
        }
        .rtm-add-inline {
          display: grid;
          grid-template-columns: auto 1fr 1fr 220px auto;
          align-items: center;
          gap: 8px;
          min-width: 580px;
          flex: 1 1 600px;
        }
        .rtm-add-title { font-size:.85rem; color: var(--theme-text-dim); font-weight: 600; }
        .rtm-add-inline input, .rtm-add-inline select {
          padding: 9px 10px;
          border: 1px solid var(--theme-border);
          border-radius: 8px;
          background: var(--theme-bg);
          color: var(--theme-text);
          width: 100%;
        }
        .rtm-actions { display:flex; align-items:center; gap:10px; }

        .rtm-team-modal { position: fixed; inset: 0; background: rgba(0,0,0,.7); display:flex; align-items:center; justify-content:center; z-index: 1000; }
        .rtm-team-card { background: var(--theme-card-bg); border-radius: 12px; padding: 30px; min-width: 350px; box-shadow: 0 8px 24px rgba(0,0,0,.4); }
        .rtm-team-current { color: var(--theme-text-dim); margin-bottom: 12px; }
        .rtm-team-list { display:flex; flex-direction:column; gap:8px; }
        .rtm-team-list .btn { padding: 12px; text-align: left; background: var(--theme-primary); color:#fff; }

        @media (max-width: 1100px) {
          .rtm-add-inline { grid-template-columns: auto 1fr 1fr 1fr auto; }
        }
        @media (max-width: 800px) {
          .rtm-legend-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .rtm-add-inline { grid-template-columns: 1fr; min-width: 0; }
          .rtm-add-title { margin-bottom: 4px; }
          .rtm-actions { width: 100%; justify-content: flex-end; }
        }
      `}</style>
    </Modal>
  );
}