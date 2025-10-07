"use client";
import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { SHIFT_MAP } from '@/lib/constants';

interface Employee {
  id: string;
  name: string;
  schedule: string[];
  [k:string]: any;
}

interface Props {
  headers: string[];
  teams: Record<string, Employee[]>;
  originalTeams?: Record<string, Employee[]>;
  editable?: boolean;
  onUpdateShift?: (employeeId:string,dateIndex:number,newShift:string)=>void;
  viewMode?: 'month' | 'day';
  dayIndex?: number;
  shiftCodes?: string[];
  density?: 'comfortable' | 'compact';
}

const DEFAULT_SHIFT_CODES = ['M2','M3','M4','D1','D2','DO','SL','CL','EL','HL','']; // blank for clearing

export default function RosterTable({
  headers,
  teams,
  originalTeams,
  editable=false,
  onUpdateShift,
  viewMode='month',
  dayIndex=0,
  shiftCodes=DEFAULT_SHIFT_CODES,
  density='comfortable'
}:Props) {

  const [editCell,setEditCell]=useState<{emp:string,idx:number, top:number, left:number, width:number, height:number, teamKey:string}|null>(null);
  const [tempValue,setTempValue]=useState('');
  const scrollRef = useRef<HTMLDivElement|null>(null);
  const bottomScrollRef = useRef<HTMLDivElement|null>(null);
  const tableRefMap = useRef<Record<string, HTMLTableElement>>({});
  const [fullWidth,setFullWidth]=useState(0);
  const [hasOverflow,setHasOverflow]=useState(false);

  // Measure total scroll width & determine overflow
  const recalc = () => {
    const el = scrollRef.current;
    if (!el) return;
    setFullWidth(el.scrollWidth);
    setHasOverflow(el.scrollWidth > el.clientWidth);
  };

  useLayoutEffect(()=>{
    recalc();
  },[teams, headers, viewMode, density]);

  useEffect(()=>{
    const handle = () => recalc();
    window.addEventListener('resize', handle);
    return ()=> window.removeEventListener('resize', handle);
  },[]);

  // Sync main ↔ bottom scrollbar
  useEffect(()=>{
    const main = scrollRef.current;
    const bottom = bottomScrollRef.current;
    if (!main || !bottom) return;

    const onMain = () => {
      if (bottom.scrollLeft !== main.scrollLeft) bottom.scrollLeft = main.scrollLeft;
    };
    const onBottom = () => {
      if (main.scrollLeft !== bottom.scrollLeft) main.scrollLeft = bottom.scrollLeft;
    };
    main.addEventListener('scroll', onMain);
    bottom.addEventListener('scroll', onBottom);
    return ()=>{
      main.removeEventListener('scroll', onMain);
      bottom.removeEventListener('scroll', onBottom);
    };
  },[teams, headers, viewMode, hasOverflow]);

  // Reposition popover during resize/scroll
  useLayoutEffect(()=>{
    function handle() {
      if (!editCell) return;
      const { emp, idx, teamKey } = editCell;
      const table = tableRefMap.current[teamKey];
      if (!table) return;
      const cell = table.querySelector<HTMLTableCellElement>(`tr[data-emp="${emp}"] td[data-idx="${idx}"]`);
      if (!cell) return;
      const scRect = scrollRef.current?.getBoundingClientRect();
      const rect = cell.getBoundingClientRect();
      setEditCell(prev => prev ? {
        ...prev,
        top: rect.top - (scRect?.top||0) + (scrollRef.current?.scrollTop||0),
        left: rect.left - (scRect?.left||0) + (scrollRef.current?.scrollLeft||0),
        width: rect.width,
        height: rect.height
      } : null);
    }
    window.addEventListener('resize', handle);
    scrollRef.current?.addEventListener('scroll', handle, { passive: true });
    return ()=>{
      window.removeEventListener('resize', handle);
      scrollRef.current?.removeEventListener('scroll', handle);
    };
  },[editCell]);

  function startEdit(empId:string, idx:number, current:string, teamKey:string) {
    if (!editable) return;
    const table = tableRefMap.current[teamKey];
    if (!table) return;
    const cell = table.querySelector<HTMLTableCellElement>(`tr[data-emp="${empId}"] td[data-idx="${idx}"]`);
    if (!cell) return;
    const scRect = scrollRef.current?.getBoundingClientRect();
    const rect = cell.getBoundingClientRect();
    setEditCell({
      emp:empId,
      idx,
      teamKey,
      top: rect.top - (scRect?.top||0) + (scrollRef.current?.scrollTop||0),
      left: rect.left - (scRect?.left||0) + (scrollRef.current?.scrollLeft||0),
      width: rect.width,
      height: rect.height
    });
    setTempValue(current);
  }

  function commit() {
    if (editCell && onUpdateShift) {
      onUpdateShift(editCell.emp, editCell.idx, tempValue.toUpperCase().trim());
    }
    setEditCell(null);
    setTempValue('');
  }
  function cancel() {
    setEditCell(null);
    setTempValue('');
  }

  function shiftLabel(code:string) {
    if (!code) return '(blank)';
    const t = SHIFT_MAP[code];
    return t ? `${code} — ${t}` : code;
  }

  function monthCell(emp:Employee, idx:number, teamKey:string) {
    const value = emp.schedule[idx] || '';
    const cls = `shift-cell ${value ? 'filled':''} ${density==='compact'?'compact':''} ${editable?'editable':''}`;
    return (
      <td
        key={idx}
        data-idx={idx}
        className={cls}
        onClick={()=> editable && startEdit(emp.id, idx, value, teamKey)}
        title={editable ? 'Click to edit' : shiftLabel(value)}
      >
        {value}
      </td>
    );
  }

  function dayRow(emp:Employee, teamKey:string) {
    const idx = dayIndex;
    const value = emp.schedule[idx] || '';
    const cls = `single-day-cell ${value?'filled':''} ${editable?'editable':''} ${density==='compact'?'compact':''}`;
    return (
      <tr key={emp.id} data-emp={emp.id}>
        <td className="sticky-col name-col">{emp.name}</td>
        <td className="sticky-col id-col">{emp.id}</td>
        <td
          data-idx={idx}
          className={cls}
          onClick={()=> editable && startEdit(emp.id, idx, value, teamKey)}
          title={editable ? 'Click to edit' : shiftLabel(value)}
        >
          {value}
        </td>
      </tr>
    );
  }

  const teamEntries = Object.entries(teams);

  return (
    <div className={`roster-wrapper enhanced ${density}`}>
      {teamEntries.length===0 && <div className="empty">No matching employees</div>}

      <div className="horizontal-fade left" />
      <div className="horizontal-fade right" />

      {/* Main horizontal scroll region */}
      <div className="table-scroll" ref={scrollRef}>
        <div className="wide-content">
          {teamEntries.map(([team, employees])=>(
            <div key={team} className="team-block improved-block">
              <div className="team-header-row">
                <h3>{team}</h3>
                <span className="team-count">{employees.length} members</span>
              </div>

              <div className="table-inner">
                {viewMode==='month' && (
                  <table
                    className="roster-table full-month better"
                    ref={el=> { if (el) tableRefMap.current[team]=el; }}
                  >
                    <thead>
                      <tr>
                        <th className="sticky-col name-col">Name</th>
                        <th className="sticky-col id-col">ID</th>
                        {headers.map((h,i)=><th key={i} className="date-col">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map(emp=>(
                        <tr key={emp.id} data-emp={emp.id}>
                          <td className="sticky-col name-col">{emp.name}</td>
                          <td className="sticky-col id-col">{emp.id}</td>
                          {headers.map((_,idx)=>monthCell(emp, idx, team))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {viewMode==='day' && (
                  <table
                    className="roster-table single-day better"
                    ref={el=> { if (el) tableRefMap.current[team]=el; }}
                  >
                    <thead>
                      <tr>
                        <th className="sticky-col name-col">Name</th>
                        <th className="sticky-col id-col">ID</th>
                        <th className="day-col">{headers[dayIndex] || 'Day'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map(emp=> dayRow(emp, team))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ))}

          {editCell && (
            <div
              className="edit-popover"
              style={{
                top: editCell.top,
                left: editCell.left,
                minWidth: Math.max(170, editCell.width + 60)
              }}
            >
              <div className="edit-popover-inner">
                <div className="edit-popover-field">
                  <label>Shift</label>
                  <select
                    value={tempValue}
                    onChange={e=>setTempValue(e.target.value)}
                    autoFocus
                    onKeyDown={e=>{
                      if (e.key==='Enter') commit();
                      if (e.key==='Escape') cancel();
                    }}
                  >
                    {shiftCodes.map(code=>(
                      <option key={code} value={code}>{shiftLabel(code)}</option>
                    ))}
                  </select>
                </div>
                <div className="edit-popover-actions">
                  <button className="btn tiny primary" onClick={commit}>Save</button>
                  <button className="btn tiny" onClick={cancel}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* External bottom scrollbar (always visible if overflow) */}
      {hasOverflow && (
        <div className="bottom-scroll" ref={bottomScrollRef}>
          <div
            className="bottom-scroll-spacer"
            style={{ width: fullWidth, height: 1 }}
          />
        </div>
      )}
    </div>
  );
}