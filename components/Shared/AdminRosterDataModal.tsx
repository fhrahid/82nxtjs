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
  headers: string[];
  teams: Record<string, Employee[]>;
  onUpdateShift: (employeeId: string, dateIndex: number, newShift: string) => Promise<void>;
  selectedDate?: string; // to sync month with the tab
}

const SHIFT_OPTIONS = ['M2', 'M3', 'M4', 'D1', 'D2', 'DO', 'SL', 'CL', 'EL', 'HL'];

// Month helpers
const MONTH_MAP: Record<string, number> = {
  jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11
};
const MONTH_NAME: Record<number,string> = {
  0:"Jan",1:"Feb",2:"Mar",3:"Apr",4:"May",5:"Jun",6:"Jul",7:"Aug",8:"Sep",9:"Oct",10:"Nov",11:"Dec"
};
function detectMonth(headers: string[]): {monthIndex:number, name:string}|null {
  for (const h of headers) {
    const m = h.match(/[A-Za-z]+$/);
    if (m) {
      const key = m[0].slice(0,3).toLowerCase();
      if (MONTH_MAP[key] !== undefined) return {monthIndex: MONTH_MAP[key], name: MONTH_NAME[MONTH_MAP[key]]};
    }
  }
  return null;
}
function detectAvailableMonths(headers: string[]) {
  const s = new Set<string>();
  headers.forEach(h => {
    const m = h.match(/[A-Za-z]+$/);
    if (m) s.add(m[0].slice(0,3).toLowerCase());
  });
  return s;
}

// Solid, opaque surfaces (no transparency)
const STICKY_BG = '#0E141C';
const EMP_COL_W = 240;
const DATE_COL_W = 120;

type EditingCell = { empId: string; dateIdx: number } | null;
type PopPos = { top: number; left: number; placement: 'above'|'below' } | null;

export default function AdminRosterDataModal({ open, onClose, headers, teams, onUpdateShift, selectedDate }: Props) {
  // Filters
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const teamNames = useMemo(() => Object.keys(teams || {}), [teams]);
  const toggleTeam = (team: string) => setSelectedTeams(prev => prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]);
  const selectAllTeams = () => setSelectedTeams(teamNames);
  const clearAllTeams = () => setSelectedTeams([]);

  // NEW Employee search/select
  const [empQuery, setEmpQuery] = useState('');
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const clearSelectedEmployees = () => setSelectedEmpIds([]);

  // Month navigation
  const [monthOffset, setMonthOffset] = useState(0);

  // Align modal's month to the selectedDate from the tab
  useEffect(() => {
    if (!open) return;
    if (!selectedDate) return;
    const m = selectedDate.match(/[A-Za-z]+$/);
    if (!m) return;
    const key = m[0].slice(0,3).toLowerCase();
    const det = detectMonth(headers);
    if (!det || MONTH_MAP[key] === undefined) return;
    setMonthOffset(MONTH_MAP[key] - det.monthIndex);
  }, [open, selectedDate, headers]);

  // Inline editing
  const [saving, setSaving] = useState(false);
  const [editingCell, setEditingCell] = useState<EditingCell>(null);

  // Local optimistic schedule updates
  const [localSchedule, setLocalSchedule] = useState<Record<string, string[]>>({});

  // Smart popover positioning refs/state
  const scrollRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const anchorElRef = useRef<HTMLElement | null>(null);
  const [popPos, setPopPos] = useState<PopPos>(null);
  const [popReady, setPopReady] = useState(false);

  // Month, headers, and display dates
  const { displayHeaders, displayMonthName, displayDates, canGoPrev, canGoNext } = useMemo(() => {
    const det = detectMonth(headers);
    const availableMonths = detectAvailableMonths(headers);
    const now = new Date();
    let year = now.getFullYear();
    let monthIndex = (det ? det.monthIndex : now.getMonth()) + monthOffset;

    while (monthIndex < 0) { monthIndex += 12; year -= 1; }
    while (monthIndex > 11) { monthIndex -= 12; year += 1; }

    const monthName = MONTH_NAME[monthIndex];
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const currentMonthKey = monthName.toLowerCase().slice(0,3);

    // Filter headers for current month
    const displayHeaders = headers.filter(h => {
      const m = h.match(/[A-Za-z]+$/);
      if (!m) return false;
      return m[0].slice(0,3).toLowerCase() === currentMonthKey;
    });

    // Build pretty date labels
    const displayDates = displayHeaders.map(h => {
      const dayMatch = h.match(/^(\d+)/);
      const day = dayMatch ? parseInt(dayMatch[1]) : 0;
      const date = new Date(year, monthIndex, day || 1);
      const dayName = dayNames[date.getDay()];
      return { header: h, dayName, dateStr: `${day} ${monthNames[monthIndex]}` };
    });

    // Prev/Next availability
    const prevIdx = monthIndex === 0 ? 11 : monthIndex - 1;
    const nextIdx = monthIndex === 11 ? 0 : monthIndex + 1;
    const prevKey = MONTH_NAME[prevIdx].toLowerCase().slice(0,3);
    const nextKey = MONTH_NAME[nextIdx].toLowerCase().slice(0,3);

    return {
      displayHeaders,
      displayMonthName: `${monthNames[monthIndex]} ${year}`,
      displayDates,
      canGoPrev: availableMonths.has(prevKey),
      canGoNext: availableMonths.has(nextKey)
    };
  }, [headers, monthOffset]);

  // Flatten employees with team names
  const allEmployees: (Employee & { teamName?: string })[] = useMemo(() => {
    const out: (Employee & { teamName?: string })[] = [];
    Object.entries(teams || {}).forEach(([team, emps]) => {
      emps.forEach(e => out.push({ ...e, teamName: team }));
    });
    return out;
  }, [teams]);

  // Team filter first
  const teamFiltered = useMemo(() => {
    if (selectedTeams.length === 0) return allEmployees;
    return allEmployees.filter(e => e.teamName && selectedTeams.includes(e.teamName));
  }, [allEmployees, selectedTeams]);

  // Search suggestions
  const suggestions = useMemo(() => {
    const q = empQuery.trim().toLowerCase();
    if (!q) return [];
    return teamFiltered
      .filter(e => e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q))
      .slice(0, 10);
  }, [empQuery, teamFiltered]);

  // Final list to render: if selectedEmpIds present, only show those
  const filteredEmployees = useMemo(() => {
    if (selectedEmpIds.length === 0) return teamFiltered;
    const set = new Set(selectedEmpIds);
    return teamFiltered.filter(e => set.has(e.id));
  }, [teamFiltered, selectedEmpIds]);

  const headerIndexByDisplay = useMemo(
    () => displayHeaders.map(h => headers.indexOf(h)),
    [displayHeaders, headers]
  );

  function displayShift(code: string): string {
    if (!code) return '-';
    return SHIFT_MAP[code] || code;
  }

  // Popover positioning: compute position within the scroll container viewport
  const computePopoverPosition = useCallback(() => {
    if (!scrollRef.current || !popRef.current || !anchorElRef.current) return;
    const container = scrollRef.current;
    const pop = popRef.current;
    const anchor = anchorElRef.current;

    const contRect = container.getBoundingClientRect();
    const cellRect = anchor.getBoundingClientRect();

    // Make sure pop is measurable
    const prevVis = pop.style.visibility;
    const prevOp = pop.style.opacity;
    pop.style.visibility = 'hidden';
    pop.style.opacity = '0';
    pop.style.display = 'block';
    const popRect = pop.getBoundingClientRect();

    // Convert cell bounds to content coords
    const contentTop  = container.scrollTop  + (cellRect.top  - contRect.top);
    const contentLeft = container.scrollLeft + (cellRect.left - contRect.left);

    const cellBottom = contentTop + cellRect.height;
    const cellCenterX = contentLeft + cellRect.width/2;

    // Visible viewport in content coords
    const viewTop = container.scrollTop;
    const viewLeft = container.scrollLeft;
    const viewBottom = viewTop + container.clientHeight;
    const viewRight  = viewLeft + container.clientWidth;

    const margin = 8;

    // Prefer below; if not enough room, flip above
    let placement: 'above'|'below' = 'below';
    let top = cellBottom + margin;
    if (top + popRect.height > viewBottom) {
      placement = 'above';
      top = contentTop - popRect.height - margin;
      if (top < viewTop + margin) top = viewTop + margin;
    }

    // Center horizontally, clamp inside viewport
    let left = cellCenterX - popRect.width/2;
    if (left < viewLeft + margin) left = viewLeft + margin;
    if (left + popRect.width > viewRight - margin) left = viewRight - popRect.width - margin;

    setPopPos({ top, left, placement });

    // Restore
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

  function handleCellClick(e: React.MouseEvent<HTMLTableCellElement>, empId: string, dateIdx: number) {
    if (saving) return;
    anchorElRef.current = e.currentTarget;
    setPopReady(false);
    setEditingCell({ empId, dateIdx });
  }

  async function handleShiftSelect(shift: string) {
    if (!editingCell) return;
    setSaving(true);
    try {
      await onUpdateShift(editingCell.empId, editingCell.dateIdx, shift);
      // Optimistic local update
      setLocalSchedule(prev => ({
        ...prev,
        [editingCell.empId]: (() => {
          const prevArr = prev[editingCell.empId] || [];
          const newArr = [...prevArr];
          newArr[editingCell.dateIdx] = shift;
          return newArr;
        })()
      }));
    } catch (e) {
      console.error(e);
      alert('Failed to update shift');
    } finally {
      setSaving(false);
      setEditingCell(null);
    }
  }

  if (!open) return null;

  // Small legend for shift codes (3 rows x 4 columns)
  const legendCodes = SHIFT_OPTIONS;
  const legendItems = legendCodes.map(code => ({ code, label: SHIFT_MAP[code] || code }));

  return (
    <Modal open={open} onClose={onClose} title="Admin Roster Data" width="95vw">
      <div style={{padding: 20}}>
        <p style={{marginBottom: 10, color: 'var(--theme-text-dim)'}}>
          View and edit roster data for all employees. Click on any cell to change a shift.
        </p>

        {/* Team Filters */}
        <div style={{display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12}}>
          <span style={{fontWeight: 700, color: 'var(--theme-text-dim)'}}>Team Filters:</span>
          {teamNames.map(t => (
            <button
              key={t}
              className={`sv-chip ${selectedTeams.includes(t) ? 'active' : ''}`}
              onClick={() => toggleTeam(t)}
            >
              {t}
            </button>
          ))}
          <button className="btn tiny" onClick={selectAllTeams}>Select All</button>
          <button className="btn tiny" onClick={clearAllTeams}>Clear All</button>
        </div>

        {/* Legend + Search row (under team filters) */}
        <div style={{display:'flex', gap:16, alignItems:'flex-start', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap'}}>
          {/* Legend grid */}
          <div style={{
            flex: '1 1 600px',
            background:'var(--theme-card-bg)',
            border:'1px solid var(--theme-border)',
            borderRadius:8,
            padding:'8px 10px'
          }}>
            <div style={{fontSize:'.8rem', color:'var(--theme-text-dim)', marginBottom:6, fontWeight:600}}>Shift Mapping</div>
            <div style={{
              display:'grid',
              gridTemplateColumns:'repeat(4, minmax(0, 1fr))',
              gap:'6px 8px'
            }}>
              {legendItems.map(item=>(
                <div key={item.code} style={{
                  border:'1px solid var(--theme-border)',
                  borderRadius:8,
                  padding:'6px 8px',
                  fontSize:'.78rem',
                  color:'var(--theme-text)',
                  background:'#13202a'
                }}>
                  <strong style={{marginRight:6}}>{item.code}</strong>
                  <span style={{opacity:.9}}>{item.label}</span>
                </div>
              ))}
              {/* pad to keep grid symmetrical if fewer than 12 */}
              {Array.from({length: Math.max(0, 12-legendItems.length)}).map((_,i)=>(
                <div key={`pad-${i}`} style={{visibility:'hidden'}} />
              ))}
            </div>
          </div>

          {/* Search block */}
          <div style={{flex:'0 0 320px', display:'flex', gap:8, alignItems:'center'}}>
            <input
              placeholder="Search employee (name or ID)"
              value={empQuery}
              onChange={e=>setEmpQuery(e.target.value)}
              style={{padding:'9px 12px', border:'1px solid var(--theme-border)', borderRadius:8, background:'var(--theme-bg)', color:'var(--theme-text)', width:'100%'}}
            />
            <button className="btn tiny" onClick={clearSelectedEmployees} title="Clear selected employees">Clear Selected</button>
          </div>

          {/* Suggestions */}
          {empQuery.trim() && suggestions.length > 0 && (
            <div style={{width:'100%', display:'flex', gap:6, flexWrap:'wrap', marginTop:6}}>
              {suggestions.map(s=>(
                <button
                  key={s.id}
                  className="sv-chip"
                  onClick={() => setSelectedEmpIds(prev => prev.includes(s.id) ? prev : [...prev, s.id])}
                  title={`${s.name} (${s.id})${s.teamName ? ' • '+s.teamName : ''}`}
                >
                  ➕ {s.name} ({s.id})
                </button>
              ))}
            </div>
          )}

          {/* Selected chips */}
          {selectedEmpIds.length > 0 && (
            <div style={{width:'100%', display:'flex', gap:6, flexWrap:'wrap'}}>
              {selectedEmpIds.map(id=>{
                const emp = allEmployees.find(e=>e.id===id);
                return (
                  <span key={id} className="sv-chip active" style={{display:'inline-flex', alignItems:'center', gap:6}}>
                    {emp?.name || id}
                    <button className="btn tiny" onClick={()=> setSelectedEmpIds(prev => prev.filter(x=>x!==id))}>✕</button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Month Navigation + Info (legend moved above) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          padding: 10,
          background: 'var(--theme-card-bg)',
          borderRadius: 8
        }}>
          <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
            <button className="btn" onClick={() => setMonthOffset(v => v - 1)} disabled={!canGoPrev}>← Previous</button>
            <strong style={{fontSize: '1.05rem'}}>{displayMonthName}</strong>
            <button className="btn" onClick={() => setMonthOffset(v => v + 1)} disabled={!canGoNext}>Next →</button>
          </div>
          <div style={{display:'flex', gap: 12, color: 'var(--theme-text-dim)'}}>
            <div><strong>{filteredEmployees.length}</strong> Employees</div>
            <div><strong>{displayDates.length}</strong> Days</div>
          </div>
        </div>

        {/* Grid scroll container hosts sticky and popover */}
        <div className="adm-grid-scroll" ref={scrollRef}>
          <table className="adm-grid-table">
            <thead>
              <tr>
                {/* Corner: sticky on both axes */}
                <th className="adm-corner">Employee</th>
                {displayDates.map((d, idx) => (
                  <th key={idx} className="adm-head">
                    <div className="adm-head-day">{d.dayName.toUpperCase()}</div>
                    <div className="adm-head-date">{d.dateStr}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(emp => (
                <tr key={emp.id}>
                  {/* Left sticky employee column (no change-team here) */}
                  <td className="adm-emp">
                    <div style={{fontWeight: 700}}>{emp.name}</div>
                    <div style={{fontSize: '.8rem', color:'var(--theme-text-dim)'}}>
                      {emp.id}{emp.teamName ? ` • ${emp.teamName}` : ''}
                    </div>
                  </td>

                  {/* Date cells */}
                  {headerIndexByDisplay.map((hdrIdx) => {
                    const shift = localSchedule[emp.id]?.[hdrIdx] ?? emp.schedule[hdrIdx] ?? '';
                    const isActive = editingCell?.empId === emp.id && editingCell?.dateIdx === hdrIdx;
                    return (
                      <td
                        key={`${emp.id}-${hdrIdx}`}
                        className={`adm-cell ${shift ? 'has' : ''} ${isActive ? 'active' : ''}`}
                        onClick={(e)=>handleCellClick(e, emp.id, hdrIdx)}
                        title="Click to edit shift"
                      >
                        <div className="adm-shift">{displayShift(shift)}</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Floating smart popover for shift selection */}
          {editingCell && (
            <div
              ref={popRef}
              className="adm-pop"
              style={{
                position: 'absolute',
                top: (popPos?.top ?? 0),
                left: (popPos?.left ?? 0),
                visibility: popReady && popPos ? 'visible' : 'hidden',
                opacity: popReady && popPos ? 1 : 0,
                background: STICKY_BG,
                border: '2px solid var(--theme-primary)',
                borderRadius: 10,
                padding: 10,
                zIndex: 1000,
                minWidth: 220,
                maxWidth: 340,
                boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
                transition: 'opacity .12s ease'
              }}
              onClick={(e)=>e.stopPropagation()}
            >
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {SHIFT_OPTIONS.map(s => (
                  <button key={s} className="btn tiny" onClick={() => handleShiftSelect(s)} title={SHIFT_MAP[s] || s}>
                    {s}
                  </button>
                ))}
                <button className="btn tiny" onClick={() => handleShiftSelect('')} style={{gridColumn:'span 2', background:'#ff6b6b'}}>
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{display:'flex',justifyContent:'flex-end',marginTop:14}}>
          <button className="btn" onClick={onClose} disabled={saving}>Close</button>
        </div>
      </div>

      <style jsx>{`
        .sv-chip {
          padding: 6px 12px;
          font-size: .85rem;
          border-radius: 8px;
          background: #1d2935;
          border: 1px solid #324556;
          color: #d5dee6;
          cursor: pointer;
        }
        .sv-chip.active {
          background:#3a6599; border-color:#5e94d1; color:#fff; box-shadow:0 0 0 2px rgba(94,148,209,.28);
        }

        .adm-grid-scroll {
          overflow: auto;
          max-height: 520px;
          position: relative; /* anchor absolute popover */
          border: 1px solid var(--theme-border);
          border-radius: 10px;
        }

        .adm-grid-table {
          width: max-content;
          min-width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          table-layout: fixed;
        }

        .adm-grid-table thead th,
        .adm-grid-table tbody td {
          border-bottom: 1px solid var(--theme-border);
          border-right: 1px solid var(--theme-border);
          padding: 10px 8px;
          background: transparent;
          color: var(--theme-text);
          white-space: nowrap;
          vertical-align: middle;
        }
        .adm-grid-table thead th:first-child,
        .adm-grid-table tbody td:first-child {
          border-left: 1px solid var(--theme-border);
        }

        /* Sticky header cells (top) */
        .adm-head {
          position: sticky;
          top: 0;
          z-index: 40;
          background: ${STICKY_BG} !important;
          opacity: 1 !important;
          width: ${DATE_COL_W}px;
          min-width: ${DATE_COL_W}px;
          text-align: center;
        }
        .adm-head-day {
          font-size: .72rem; font-weight: 800; letter-spacing: .3px; color: #c2cfdb;
        }
        .adm-head-date {
          font-size: .7rem; color: var(--theme-text-dim);
        }

        /* Corner sticky (top-left) */
        .adm-corner {
          position: sticky;
          left: 0;
          top: 0;
          z-index: 60;
          background: ${STICKY_BG} !important;
          opacity: 1 !important;
          width: ${EMP_COL_W}px;
          min-width: ${EMP_COL_W}px;
          max-width: ${EMP_COL_W}px;
          box-shadow: 2px 0 0 rgba(0,0,0,.25);
        }

        /* First column sticky (left) */
        .adm-emp {
          position: sticky;
          left: 0;
          z-index: 50;
          background: ${STICKY_BG} !important;
          opacity: 1 !important;
          width: ${EMP_COL_W}px;
          min-width: ${EMP_COL_W}px;
          max-width: ${EMP_COL_W}px;
          box-shadow: 2px 0 0 rgba(0,0,0,.25);
        }

        /* Body cells */
        .adm-cell {
          width: ${DATE_COL_W}px;
          min-width: ${DATE_COL_W}px;
          text-align: center;
          position: relative;
          cursor: pointer;
        }
        .adm-cell.has { background: #15202E; }
        .adm-shift { font-size: .92rem; }

        /* Active cell highlight */
        .adm-cell.active {
          outline: 2px solid var(--theme-primary);
          outline-offset: -2px;
          z-index: 1;
        }

        /* Floating popover */
        .adm-pop { color: var(--theme-text); }
      `}</style>
    </Modal>
  );
}