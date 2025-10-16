"use client";
import { useState, useMemo, useEffect, useCallback } from 'react';
import MonthCompactCalendar from './Shared/MonthCompactCalendar';
import { SHIFT_MAP } from '@/lib/constants'; // mapping code -> timing/label

interface Props {
  open: boolean;
  onClose: () => void;
  roster: any;
  headers: string[];
}

/**
 * GOOD FILE (Version8) WITH ONLY THE REQUESTED CHANGE:
 * - In SHIFT FILTERS (MULTI-SELECT):
 *    * Show base shift codes with their time schedules: M2 (8 AM – 5 PM), M3 (...), M4 (...)
 *    * Merge D1 + D2 into one chip: Evening (D1/D2)
 *    * Merge DO/SL/CL/EL/HL into one chip: Off
 * - Filtering logic updated so:
 *    * Selecting Evening filters employees whose shift is D1 or D2
 *    * Selecting Off filters employees whose shift is any of DO, SL, CL, EL, HL
 *    * Selecting a base code still filters by that exact code
 * - Employee cards & stats remain as they were (stats still by raw code).
 * - No other layout / styling changes were made.
 */
export default function ShiftView({ open, onClose, roster, headers }: Props) {
  const [selectedDate, setSelectedDate] = useState('');
  // This state now stores BOTH raw codes (M2/M3/M4) and aggregate tokens: 'EVENING', 'OFF'
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  // Base (non-aggregated) codes we show individually
  const baseShiftCodes = ['M2','M3','M4'];
  const eveningGroup = ['D1','D2'];
  const offGroup = ['DO','SL','CL','EL','HL'];

  const teamList: string[] = useMemo(
    () => (roster?.teams ? Object.keys(roster.teams) : []),
    [roster]
  );

  useEffect(()=>{
    if (!open) {
      setSelectedDate('');
      setSelectedShifts([]);
      setSelectedTeams([]);
    }
  },[open]);

  const escHandler = useCallback((e:KeyboardEvent)=>{
    if (e.key === 'Escape' && open) onClose();
  },[open,onClose]);

  useEffect(()=>{
    window.addEventListener('keydown', escHandler);
    return ()=> window.removeEventListener('keydown', escHandler);
  },[escHandler]);

  const toggle = (arr:string[], val:string, setter:(v:string[])=>void) => {
    setter(arr.includes(val) ? arr.filter(v=>v!==val) : [...arr,val]);
  };

  function toggleShift(val:string) {
    toggle(selectedShifts, val, setSelectedShifts);
  }

  function toggleTeam(team:string) {
    toggle(selectedTeams, team, setSelectedTeams);
  }

  function displayShift(code: string): string {
    if (!code || code === 'N/A' || code === 'Empty') return 'N/A';
    return SHIFT_MAP[code] || code;
  }

  function codeMatchesFilters(rawShift:string) {
    if (!selectedShifts.length) return true;
    if (selectedShifts.includes(rawShift)) return true;                 // direct code
    if (selectedShifts.includes('EVENING') && eveningGroup.includes(rawShift)) return true;
    if (selectedShifts.includes('OFF') && offGroup.includes(rawShift)) return true;
    return false;
  }

  const filteredEmployees = useMemo(()=>{
    if (!selectedDate || !roster?.teams) return [];
    const dateIndex = headers.indexOf(selectedDate);
    if (dateIndex === -1) return [];
    const out:any[] = [];
    Object.entries(roster.teams).forEach(([teamName, emps]:[string, any])=>{
      if (selectedTeams.length && !selectedTeams.includes(teamName)) return;
      (emps as any[]).forEach(emp=>{
        const rawShift = emp.schedule[dateIndex] || '';
        if (!codeMatchesFilters(rawShift)) return;
        out.push({
          name: emp.name,
          id: emp.id,
          team: teamName,
          shift: rawShift || 'N/A'
        });
      });
    });
    return out;
  },[selectedDate, roster, headers, selectedShifts, selectedTeams]); // dependencies include new selectedShifts logic

  const shiftStats = useMemo(()=>{
    const counts: Record<string,number> = {};
    filteredEmployees.forEach(emp=>{
      const k = !emp.shift ? 'Empty' : emp.shift;
      counts[k] = (counts[k]||0)+1;
    });
    return counts;
  },[filteredEmployees]);

  if (!open) return null;

  return (
    <div className="modal-overlay sv-fullwidth">
      <div className="sv-dialog-wide">
        <div className="sv-header-wide">
          <h3>SHIFT VIEW</h3>
          <button className="sv-close" onClick={onClose}>✕</button>
        </div>
        <div className="sv-body-wide">
          <div className="sv-calendar-col-wide">
            <div className="sv-section-label-wide">Select Date from Calendar</div>
            <MonthCompactCalendar
              headers={headers}
              selectedDate={selectedDate}
              onSelect={(d)=> setSelectedDate(d)}
              showWeekdays
            />
          </div>
          <div className="sv-content-col-wide">
            {/* SHIFT FILTERS */}
            <div className="sv-filter-block-wide">
              <div className="sv-filter-title-wide">SHIFT FILTERS (MULTI-SELECT)</div>
              <div className="sv-chip-row-wide">
                {baseShiftCodes.map(code=>(
                  <button
                    key={code}
                    className={`sv-chip-wide ${selectedShifts.includes(code)?'active':''}`}
                    onClick={()=>toggleShift(code)}
                    title={`${code} = ${displayShift(code)}`}
                  >
                    {code} ({displayShift(code)})
                  </button>
                ))}
                <button
                  className={`sv-chip-wide ${selectedShifts.includes('EVENING')?'active':''}`}
                  onClick={()=>toggleShift('EVENING')}
                  title={`Evening includes: ${eveningGroup.join(', ')} → ${eveningGroup.map(c=>displayShift(c)).join(' / ')}`}
                >
                  Evening (D1/D2)
                </button>
                <button
                  className={`sv-chip-wide ${selectedShifts.includes('OFF')?'active':''}`}
                  onClick={()=>toggleShift('OFF')}
                  title={`Off includes: ${offGroup.join(', ')}`}
                >
                  Off
                </button>
                <button
                  className="sv-chip-wide clear"
                  onClick={()=>setSelectedShifts([])}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* TEAM FILTERS */}
            <div className="sv-filter-block-wide">
              <div className="sv-filter-title-wide">TEAM FILTERS (MULTI-SELECT)</div>
              <div className="sv-chip-row-wide">
                {teamList.map(team=>(
                  <button
                    key={team}
                    className={`sv-chip-wide ${selectedTeams.includes(team)?'active':''}`}
                    onClick={()=>toggleTeam(team)}
                  >{team}</button>
                ))}
                <button
                  className="sv-chip-wide clear"
                  onClick={()=>setSelectedTeams([])}
                >Clear</button>
              </div>
            </div>

            <div style={{marginTop:6}}>
              <button
                className="btn"
                style={{fontSize:'.85rem', padding:'9px 22px'}}
                onClick={()=>{
                  setSelectedDate('');
                  setSelectedShifts([]);
                  setSelectedTeams([]);
                }}
              >Reset All</button>
            </div>

            <div className="sv-results-wide">
              <h4 className="sv-subtitle-wide">
                {selectedDate ? `Employees for ${selectedDate}` : 'Select a date to view employees'}
              </h4>
              {selectedDate && filteredEmployees.length === 0 && (
                <div className="sv-empty-wide">No employees match the current filters.</div>
              )}
              {selectedDate && filteredEmployees.length > 0 && (
                <div className="sv-employee-grid-wide">
                  {filteredEmployees.map(emp=>(
                    <div
                      key={emp.id}
                      className="sv-emp-card-wide"
                      title={emp.shift ? `${emp.shift} → ${displayShift(emp.shift)}` : 'N/A'}
                    >
                      <div className="sv-emp-name-wide">{emp.name}</div>
                      <div className="sv-emp-meta-wide">{emp.id} • {emp.team}</div>
                      <div className="sv-emp-shift-wide">
                        {displayShift(emp.shift)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedDate && Object.keys(shiftStats).length > 0 && (
              <div className="sv-stats-wide">
                <h4 className="sv-subtitle-wide">Shift Stats</h4>
                <div className="sv-stats-row-wide">
                  {Object.entries(shiftStats).map(([code,count])=>{
                    const label = code === 'Empty' ? 'N/A' : displayShift(code);
                    return (
                      <div
                        key={code}
                        className="sv-stat-pill-wide"
                        title={code === 'Empty' ? 'No Shift Code' : `${code} → ${label}`}
                      >
                        <span className="sv-stat-key-wide">
                          {label}
                        </span>
                        <span className="sv-stat-val-wide">{count}</span>
                      </div>
                    );
                  })}
                  <div className="sv-stat-pill-wide total">
                    <span className="sv-stat-key-wide">Total</span>
                    <span className="sv-stat-val-wide">{filteredEmployees.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="sv-footer-wide">
          <button className="btn primary" style={{fontSize:'.9rem', padding:'10px 34px'}} onClick={onClose}>Close</button>
        </div>
      </div>

      {/* Original styles from Version8 left untouched below */}
      <style jsx global>{`
        .modal-overlay.sv-fullwidth {
          position:fixed;
          inset:0;
          display:flex;
          align-items:center;
          justify-content:center;
          background:rgba(0,0,0,.55);
          backdrop-filter:blur(5px);
          z-index:3000;
          padding:10px;
        }
        .sv-dialog-wide {
          width:clamp(1200px,92vw,1720px);
          max-height:94vh;
          background:#0e141c;
          border:1px solid #2d3b47;
          border-radius:18px;
          display:flex;
          flex-direction:column;
          box-shadow:0 16px 42px -10px rgba(0,0,0,.65);
          overflow:hidden;
          font-size:16px;
        }
        .sv-header-wide {
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:16px 28px 14px;
          border-bottom:1px solid #1c2731;
        }
        .sv-header-wide h3 {
          margin:0;
          font-size:1.05rem;
          letter-spacing:1.1px;
          font-weight:600;
          color:#e1e9ef;
        }
        .sv-close {
          background:#223346;
          border:1px solid #314a62;
          color:#dde7ef;
          padding:6px 12px;
          font-size:.8rem;
          border-radius:8px;
          cursor:pointer;
        }
        .sv-close:hover { background:#2f4c67; }

        .sv-body-wide {
          display:flex;
          gap:40px;
          padding:28px 32px 14px;
          overflow-y:auto;
        }
        .sv-calendar-col-wide {
          flex:0 0 300px;
          display:flex;
          flex-direction:column;
          gap:16px;
        }
        .sv-section-label-wide {
          font-size:.8rem;
          letter-spacing:1px;
          color:#a9bdd0;
          font-weight:600;
        }
        .sv-content-col-wide {
          flex:1;
          min-width:0;
          display:flex;
          flex-direction:column;
        }

        .sv-filter-block-wide { margin-bottom:20px; }
        .sv-filter-title-wide {
          font-size:.72rem;
          letter-spacing:1px;
          color:#8ea3b6;
          margin-bottom:10px;
          font-weight:700;
        }
        .sv-chip-row-wide { display:flex; flex-wrap:wrap; gap:10px; }
        .sv-chip-wide {
          padding:8px 16px;
          font-size:.75rem;
          border-radius:24px;
          background:#1d2935;
          border:1px solid #324556;
          color:#d5dee6;
          cursor:pointer;
          transition:.18s;
          font-weight:500;
        }
        .sv-chip-wide.active {
          background:#3a6599;
          border-color:#5e94d1;
          color:#fff;
          box-shadow:0 0 0 2px rgba(94,148,209,.28);
        }
        .sv-chip-wide.clear {
          background:transparent;
          border:1px dashed #334758;
          color:#94abbe;
        }
        .sv-chip-wide.clear:hover { border-color:#5d90c8; color:#d6e6f5; }

        .sv-results-wide { margin-top:4px; }
        .sv-subtitle-wide {
          margin:0 0 14px 0;
          font-size:1rem;
          letter-spacing:.6px;
          color:#b9cddd;
          font-weight:600;
        }
        .sv-empty-wide {
          background:#17232d;
          border:1px solid #223444;
          padding:18px;
          border-radius:12px;
          font-size:.8rem;
          color:#8fa5b9;
        }
        .sv-employee-grid-wide {
          display:grid;
          gap:18px 20px;
          grid-template-columns:repeat(auto-fill,minmax(250px,1fr));
        }
        .sv-emp-card-wide {
          background:#18242e;
          border:1px solid #2d3d4c;
          border-radius:14px;
          padding:14px 16px 16px;
          display:flex;
          flex-direction:column;
          gap:8px;
          transition:.18s;
        }
        .sv-emp-card-wide:hover {
          background:#20323f;
          border-color:#416077;
        }
        .sv-emp-name-wide { font-size:.95rem; font-weight:600; color:#e2ebf2; }
        .sv-emp-meta-wide { font-size:.7rem; color:#8ba0b2; letter-spacing:.3px; }
        .sv-emp-shift-wide {
          align-self:flex-start;
          background:#3a6599;
          padding:5px 12px;
          font-size:.7rem;
          border-radius:18px;
          letter-spacing:.6px;
          font-weight:600;
          color:#fff;
        }

        .sv-stats-wide { margin-top:26px; }
        .sv-stats-row-wide { display:flex; flex-wrap:wrap; gap:12px; }
        .sv-stat-pill-wide {
          background:#1f2c38;
          border:1px solid #314354;
          border-radius:12px;
          padding:10px 14px;
          display:flex;
          align-items:center;
          gap:12px;
          font-size:.75rem;
        }
        .sv-stat-pill-wide.total {
          background:#253848;
          border:1px dashed #3c5668;
        }
        .sv-stat-key-wide {
          background:#3b6ea7;
          padding:4px 10px;
          border-radius:14px;
          font-size:.65rem;
          letter-spacing:.5px;
          color:#fff;
          font-weight:600;
        }
        .sv-stat-val-wide { font-weight:700; font-size:.85rem; color:#e7eef5; }

        .sv-footer-wide {
          padding:16px 32px 24px;
          border-top:1px solid #1c2731;
          display:flex;
          justify-content:flex-end;
          background:linear-gradient(to top,#101a24,#101a24e0);
        }

        @media (min-width: 1500px) {
          .sv-body-wide { padding:32px 40px 16px; gap:48px; }
          .sv-calendar-col-wide { flex:0 0 320px; }
        }
        @media (max-width: 1250px) {
          .sv-dialog-wide { width:94vw; }
          .sv-body-wide { gap:32px; }
          .sv-calendar-col-wide { flex:0 0 280px; }
        }
        @media (max-width: 1000px) {
          .sv-body-wide { flex-direction:column; }
          .sv-calendar-col-wide { flex:0 0 auto; }
        }
      `}</style>
    </div>
  );
}