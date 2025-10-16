"use client";
import { useState, useMemo } from 'react';

interface Employee {
  id: string;
  name: string;
  schedule: string[];
  team?: string;
  [k:string]: any;
}

interface Props {
  headers: string[];
  teams: Record<string, Employee[]>;
  originalTeams?: Record<string, Employee[]>;
  editable?: boolean;
  onUpdateShift?: (employeeId:string,dateIndex:number,newShift:string)=>void;
}

const SHIFT_CODES = ['','M2','M3','M4','D1','D2','DO','SL','CL','EL','HL'];

// Column width constants (make them big enough so overflow ALWAYS occurs)
const NAME_COL_W = 210;
const ID_COL_W   = 130;
const TEAM_COL_W = 120;
const DATE_COL_W = 120;
const EXTRA_FORCE = 800; // extra width to guarantee horizontal scroll on ultra-wide & zoomed out screens

export default function RosterTable({
  headers,
  teams,
  originalTeams,
  editable=false,
  onUpdateShift
}:Props) {

  const [editing,setEditing]=useState<{emp:string; idx:number} | null>(null);
  const [temp,setTemp]=useState('');

  // Build original lookup to highlight modifications
  const originalLookup = useMemo(()=>{
    const map: Record<string,string[]> = {};
    if (originalTeams) {
      Object.values(originalTeams).forEach(list=>{
        list.forEach(e=> { map[e.id] = e.schedule || []; });
      });
    }
    return map;
  },[originalTeams]);

  function startEdit(emp:Employee, idx:number) {
    if (!editable) return;
    setEditing({emp:emp.id, idx});
    setTemp(emp.schedule[idx] || '');
  }
  function save() {
    if (editing && onUpdateShift) {
      onUpdateShift(editing.emp, editing.idx, temp.toUpperCase().trim());
    }
    cancel();
  }
  function cancel() {
    setEditing(null);
    setTemp('');
  }

  function cellClasses(emp:Employee, idx:number) {
    const cur = emp.schedule[idx] || '';
    const orig = originalLookup[emp.id]?.[idx] || '';
    const modified = orig !== undefined && orig !== cur;
    const isEditing = editing && editing.emp===emp.id && editing.idx===idx;
    return [
      'shift-cell',
      modified ? 'mod' : '',
      isEditing ? 'editing':''
    ].filter(Boolean).join(' ');
  }

  // Compute min width so scroll definitely appears
  const minWidth = (headers.length * DATE_COL_W) + NAME_COL_W + ID_COL_W + TEAM_COL_W + EXTRA_FORCE;

  return (
    <div className="roster-scroll">
      <table className="roster-table" style={{minWidth}}>
        <thead>
          <tr>
            <th className="sticky name-col" style={{minWidth:NAME_COL_W}}>Employee</th>
            <th className="sticky id-col" style={{left:NAME_COL_W, minWidth:ID_COL_W}}>ID</th>
            <th className="sticky team-col" style={{left:NAME_COL_W+ID_COL_W, minWidth:TEAM_COL_W}}>Team</th>
            {headers.map((h,i)=>(
              <th key={i} className="date-col" style={{minWidth:DATE_COL_W}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(teams).map(([teamName, emps])=>(
            emps.map(emp=>(
              <tr key={emp.id}>
                <td className="sticky name-col" style={{minWidth:NAME_COL_W}}>{emp.name}</td>
                <td className="sticky id-col" style={{left:NAME_COL_W, minWidth:ID_COL_W}}>{emp.id}</td>
                <td className="sticky team-col" style={{left:NAME_COL_W+ID_COL_W, minWidth:TEAM_COL_W}}>{teamName}</td>
                {headers.map((_,idx)=>{
                  const isEditing = editing && editing.emp===emp.id && editing.idx===idx;
                  return (
                    <td
                      key={idx}
                      className={cellClasses(emp, idx)}
                      style={{minWidth:DATE_COL_W}}
                      onClick={()=> !isEditing && startEdit(emp, idx)}
                      title="Click to edit"
                    >
                      {isEditing ? (
                        <div className="edit-inline">
                          <select
                            value={temp}
                            onChange={e=>setTemp(e.target.value)}
                            autoFocus
                            onKeyDown={e=>{
                              if (e.key==='Enter') save();
                              if (e.key==='Escape') cancel();
                            }}
                          >
                            {SHIFT_CODES.map(c=> <option key={c} value={c}>{c || '(blank)'}</option>)}
                          </select>
                          <div className="edit-actions">
                            <button className="ok" onClick={save}>✔</button>
                            <button className="cx" onClick={cancel}>✖</button>
                          </div>
                        </div>
                      ) : (
                        emp.schedule[idx] || ''
                      )}
                    </td>
                  );
                })}
              </tr>
            ))
          ))}
        </tbody>
      </table>

      <style jsx>{`
        .roster-scroll {
          /* This container creates the native scrollbars */
          overflow:auto;
          width:100%;
          max-height:65vh;
          background:#0f1822;
          border:1px solid #1f2e3b;
          border-radius:10px;
          position:relative;
        }
        .roster-scroll::-webkit-scrollbar { height:16px; width:16px; }
        .roster-scroll::-webkit-scrollbar-track { background:#0b141c; }
        .roster-scroll::-webkit-scrollbar-thumb {
          background:#254253;
          border-radius:10px;
          border:3px solid #0b141c;
        }
        .roster-scroll::-webkit-scrollbar-thumb:hover { background:#2f5770; }

        table.roster-table {
          border-collapse:separate;
          border-spacing:0;
          font-size:.7rem;
          color:#d1dae2;
          width:max-content;
          table-layout:auto;
        }

        thead th {
          position:sticky;
          top:0;
          background:#182a37;
          color:#85abc7;
          font-weight:600;
          font-size:.58rem;
          letter-spacing:.65px;
          padding:10px 10px;
          border-bottom:1px solid #284152;
          text-transform:uppercase;
          white-space:nowrap;
          z-index:6;
        }

        tbody td {
          background:#122431;
          padding:9px 8px;
          border-bottom:1px solid #223a4a;
          border-right:1px solid #223a4a;
          text-align:center;
          white-space:nowrap;
          cursor:pointer;
          transition:background .13s, color .13s;
          font-weight:500;
          letter-spacing:.4px;
        }
        tbody tr:nth-child(odd) td { background:#10202b; }
        tbody tr:hover td { background:#1a3442; }
        tbody tr:last-child td { border-bottom:none; }

        .sticky {
          position:sticky;
          left:0;
          z-index:10;
          background:#182a37 !important;
          box-shadow:2px 0 0 #223b4a;
        }
        .id-col { z-index:11; }
        .team-col { z-index:12; }

        .shift-cell.mod {
          background:#1b3e57 !important;
          border:1px solid #3f7aa9;
          box-sizing:border-box;
          color:#d3ecff;
          font-weight:600;
        }
        .shift-cell.mod.editing {
          background:#255371 !important;
          border-color:#54a2d6;
        }
        .shift-cell.editing { padding:4px 4px; }

        .edit-inline {
          display:flex;
          align-items:center;
          justify-content:center;
          gap:6px;
        }
        .edit-inline select {
          background:#0e1d27;
          color:#e3edf4;
          border:1px solid #35586f;
          font-size:.62rem;
          padding:4px 6px;
          border-radius:4px;
          outline:none;
        }
        .edit-inline select:focus {
          border-color:#4a8bc5;
          box-shadow:0 0 0 2px rgba(74,139,197,.35);
        }
        .edit-actions {
          display:flex;
          gap:4px;
        }
        .edit-actions button {
          border:0;
          font-size:.58rem;
          padding:4px 6px;
          border-radius:4px;
          cursor:pointer;
          font-weight:600;
          letter-spacing:.35px;
          color:#f2f8fc;
        }
        .edit-actions .ok { background:#247148; }
        .edit-actions .ok:hover { background:#2c8957; }
        .edit-actions .cx { background:#7c3535; }
        .edit-actions .cx:hover { background:#944343; }
      `}</style>
    </div>
  );
}