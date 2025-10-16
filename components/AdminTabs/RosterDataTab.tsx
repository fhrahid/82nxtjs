"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import MonthCompactCalendar from '../Shared/MonthCompactCalendar';
import GoogleSheetsRosterModal from '../Shared/GoogleSheetsRosterModal';
import { SHIFT_MAP } from '@/lib/constants';

interface Props { id: string; }

export default function RosterDataTab({id}:Props) {
  const [adminData,setAdminData]=useState<any>(null);
  const [googleData,setGoogleData]=useState<any>(null);
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  
  // Shift view states (inline, not modal)
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  
  // Edit state
  const [editingShift, setEditingShift] = useState<{empId: string; empName: string; dateIndex: number} | null>(null);
  const [editShiftValue, setEditShiftValue] = useState('');
  
  // Google Sheets Roster Modal state
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState(false);

  async function load() {
    setLoading(true);
    const aRes = await fetch('/api/admin/get-admin-data');
    const gRes = await fetch('/api/admin/get-google-data');
    if (aRes.ok) setAdminData(await aRes.json());
    if (gRes.ok) setGoogleData(await gRes.json());
    setLoading(false);
  }
  useEffect(() => { 
    load(); 
  }, []);

  async function updateShift(employeeId:string,dateIndex:number,newShift:string) {
    setSaving(true);
    const original = findGoogleShift(employeeId,dateIndex);
    const res = await fetch('/api/admin/update-shift',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({employeeId,dateIndex,newShift,googleShift:original})
    }).then(r=>r.json());
    setSaving(false);
    if (!res.success) alert(res.error||'Update failed');
    else {
      // Close edit mode and reload
      setEditingShift(null);
      setEditShiftValue('');
    }
    load();
  }

  function findGoogleShift(employeeId:string, dateIndex:number) {
    if (!googleData?.teams) return '';
    for (const t of Object.keys(googleData.teams)) {
      const emp = googleData.teams[t].find((e:any)=>e.id===employeeId);
      if (emp) return emp.schedule[dateIndex] || '';
    }
    return '';
  }

  // Shift view constants and helpers
  const baseShiftCodes = ['M2','M3','M4'];
  const eveningGroup = ['D1','D2'];
  const offGroup = ['DO','SL','CL','EL','HL'];
  const allShiftCodes = ['M2','M3','M4','D1','D2','DO','SL','CL','EL','HL'];

  const teamList: string[] = useMemo(
    () => (adminData?.teams ? Object.keys(adminData.teams) : []),
    [adminData]
  );

  function displayShift(code: string): string {
    if (!code || code === 'N/A' || code === 'Empty') return 'N/A';
    return SHIFT_MAP[code] || code;
  }

  function codeMatchesFilters(rawShift:string) {
    if (!selectedShifts.length) return true;
    if (selectedShifts.includes(rawShift)) return true;
    if (selectedShifts.includes('EVENING') && eveningGroup.includes(rawShift)) return true;
    if (selectedShifts.includes('OFF') && offGroup.includes(rawShift)) return true;
    return false;
  }

  const toggle = (arr:string[], val:string, setter:(v:string[])=>void) => {
    setter(arr.includes(val) ? arr.filter(v=>v!==val) : [...arr,val]);
  };

  function toggleShift(val:string) {
    toggle(selectedShifts, val, setSelectedShifts);
  }

  function toggleTeam(team:string) {
    toggle(selectedTeams, team, setSelectedTeams);
  }

  const filteredEmployees = useMemo(()=>{
    if (!selectedDate || !adminData?.teams) return [];
    const dateIndex = adminData.headers.indexOf(selectedDate);
    if (dateIndex === -1) return [];
    const out:any[] = [];
    Object.entries(adminData.teams).forEach(([teamName, emps]:[string, any])=>{
      if (selectedTeams.length && !selectedTeams.includes(teamName)) return;
      (emps as any[]).forEach(emp=>{
        const rawShift = emp.schedule[dateIndex] || '';
        if (!codeMatchesFilters(rawShift)) return;
        out.push({
          name: emp.name,
          id: emp.id,
          team: teamName,
          shift: rawShift || 'N/A',
          dateIndex
        });
      });
    });
    return out;
  },[selectedDate, adminData, selectedShifts, selectedTeams]);

  const shiftStats = useMemo(()=>{
    const counts: Record<string,number> = {};
    filteredEmployees.forEach(emp=>{
      const k = !emp.shift || emp.shift === 'N/A' ? 'Empty' : emp.shift;
      counts[k] = (counts[k]||0)+1;
    });
    return counts;
  },[filteredEmployees]);

  function handleEmployeeShiftClick(emp: any) {
    // Start editing this employee's shift
    setEditingShift({
      empId: emp.id,
      empName: emp.name,
      dateIndex: emp.dateIndex
    });
    setEditShiftValue(emp.shift === 'N/A' ? '' : emp.shift);
  }

  function cancelEdit() {
    setEditingShift(null);
    setEditShiftValue('');
  }

  function saveEdit() {
    if (editingShift) {
      updateShift(editingShift.empId, editingShift.dateIndex, editShiftValue.toUpperCase().trim());
    }
  }



  return (
    <div id={id} className="roster-data-root">
      <h2 className="rd-title">Roster Data</h2>
      <p className="rd-sub">
        View and manage roster data. Click on any employee shift to edit it.
      </p>

      <div className="rd-bar">
        <div className="rd-bar-actions">
          <button className="rd-btn refresh" onClick={load} disabled={loading || saving}>
            {loading ? 'Loading…' : saving ? 'Saving…' : '🔄 Refresh'}
          </button>
          <button 
            className="rd-btn google-sheets" 
            onClick={() => setShowGoogleSheetsModal(true)} 
            disabled={loading || !googleData}
          >
            📊 Google Sheets Roster
          </button>
        </div>
      </div>

      {(loading) && <div className="loading-box">Loading data…</div>}

      {!loading && adminData && (
        <div className="rd-shift-view-container">
          <div className="sv-body-inline">
            <div className="sv-calendar-col">
              <div className="sv-section-label">Select Date from Calendar</div>
              <MonthCompactCalendar
                headers={adminData.headers || []}
                selectedDate={selectedDate}
                onSelect={(d)=> setSelectedDate(d)}
                showWeekdays
                showNavigation
              />
            </div>
            
            <div className="sv-content-col">
              {/* SHIFT FILTERS */}
              <div className="sv-filter-block">
                <div className="sv-filter-title">SHIFT FILTERS (MULTI-SELECT)</div>
                <div className="sv-chip-row">
                  {baseShiftCodes.map(code=>(
                    <button
                      key={code}
                      className={`sv-chip ${selectedShifts.includes(code)?'active':''}`}
                      onClick={()=>toggleShift(code)}
                      title={`${code} = ${displayShift(code)}`}
                    >
                      {code} ({displayShift(code)})
                    </button>
                  ))}
                  <button
                    className={`sv-chip ${selectedShifts.includes('EVENING')?'active':''}`}
                    onClick={()=>toggleShift('EVENING')}
                    title={`Evening includes: ${eveningGroup.join(', ')}`}
                  >
                    Evening (D1/D2)
                  </button>
                  <button
                    className={`sv-chip ${selectedShifts.includes('OFF')?'active':''}`}
                    onClick={()=>toggleShift('OFF')}
                    title={`Off includes: ${offGroup.join(', ')}`}
                  >
                    Off
                  </button>
                  <button
                    className="sv-chip clear"
                    onClick={()=>setSelectedShifts([])}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* TEAM FILTERS */}
              <div className="sv-filter-block">
                <div className="sv-filter-title">TEAM FILTERS (MULTI-SELECT)</div>
                <div className="sv-chip-row">
                  {teamList.map(team=>(
                    <button
                      key={team}
                      className={`sv-chip ${selectedTeams.includes(team)?'active':''}`}
                      onClick={()=>toggleTeam(team)}
                    >{team}</button>
                  ))}
                  <button
                    className="sv-chip clear"
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
                >Reset All Filters</button>
              </div>

              <div className="sv-results">
                <h4 className="sv-subtitle">
                  {selectedDate ? `Employees for ${selectedDate}` : 'Select a date to view employees'}
                </h4>
                {selectedDate && filteredEmployees.length === 0 && (
                  <div className="sv-empty">No employees match the current filters.</div>
                )}
                {selectedDate && filteredEmployees.length > 0 && (
                  <div className="sv-employee-grid">
                    {filteredEmployees.map(emp=>(
                      <div
                        key={emp.id}
                        className="sv-emp-card"
                        onClick={() => handleEmployeeShiftClick(emp)}
                        title="Click to edit shift"
                      >
                        <div className="sv-emp-name">{emp.name}</div>
                        <div className="sv-emp-meta">{emp.id} • {emp.team}</div>
                        <div className="sv-emp-shift">
                          {displayShift(emp.shift)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedDate && Object.keys(shiftStats).length > 0 && (
                <div className="sv-stats">
                  <h4 className="sv-subtitle">Shift Stats</h4>
                  <div className="sv-stats-row">
                    {Object.entries(shiftStats).map(([code,count])=>{
                      const label = code === 'Empty' ? 'N/A' : displayShift(code);
                      return (
                        <div
                          key={code}
                          className="sv-stat-pill"
                          title={code === 'Empty' ? 'No Shift Code' : `${code} → ${label}`}
                        >
                          <span className="sv-stat-key">
                            {label}
                          </span>
                          <span className="sv-stat-val">{count}</span>
                        </div>
                      );
                    })}
                    <div className="sv-stat-pill total">
                      <span className="sv-stat-key">Total</span>
                      <span className="sv-stat-val">{filteredEmployees.length}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Shift Modal */}
      {editingShift && (
        <div className="edit-modal-overlay" onClick={cancelEdit}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>Edit Shift</h3>
              <button className="close-btn" onClick={cancelEdit}>✕</button>
            </div>
            <div className="edit-modal-body">
              <div className="edit-info">
                <p><strong>Employee:</strong> {editingShift.empName} ({editingShift.empId})</p>
                <p><strong>Date:</strong> {adminData.headers[editingShift.dateIndex]}</p>
              </div>
              <div className="edit-form-group">
                <label>Select Shift</label>
                <select 
                  value={editShiftValue} 
                  onChange={(e) => setEditShiftValue(e.target.value)}
                  autoFocus
                >
                  <option value="">(blank)</option>
                  {allShiftCodes.map(c => (
                    <option key={c} value={c}>{c} ({displayShift(c)})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="edit-modal-footer">
              <button 
                className="btn primary" 
                onClick={saveEdit}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button 
                className="btn" 
                onClick={cancelEdit}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Sheets Roster Modal */}
      {googleData && (
        <GoogleSheetsRosterModal
          open={showGoogleSheetsModal}
          onClose={() => setShowGoogleSheetsModal(false)}
          headers={googleData.headers || []}
          teams={googleData.teams || {}}
        />
      )}

      <style jsx>{`
        .roster-data-root {
          --panel:#121d27;
          --panel-alt:#182734;
          --border:#253745;
          --accent:#1f5d94;
          --accent-hover:#2d77b9;
          --green:#1e6b47;
          --green-hover:#258558;
          --danger:#8f3e3e;
          --text:#d7e3ed;
          --text-dim:#8ca2b5;
          color:var(--text);
        }
        .rd-title { margin:0 0 6px; font-size:1.35rem; font-weight:600; letter-spacing:.4px; }
        .rd-sub { margin:0 0 18px; font-size:.72rem; letter-spacing:.3px; color:var(--text-dim); }

        .rd-bar {
          background:var(--panel);
          border:1px solid var(--border);
          padding:12px 16px;
          border-radius:12px;
          display:flex;
          align-items:center;
          justify-content:flex-end;
          gap:18px;
          margin-bottom:14px;
        }
        .rd-bar-actions { display:flex; gap:10px; }

        .rd-btn {
          background:var(--accent);
          border:1px solid #2d6ca3;
          color:#e8f3fa;
          padding:8px 15px;
          font-size:.65rem;
          border-radius:7px;
          cursor:pointer;
          font-weight:600;
          letter-spacing:.5px;
          transition:.18s;
        }
        .rd-btn:hover { background:var(--accent-hover); }
        .rd-btn.nav { background:#1a4c78; border-color:#275d8e; }
        .rd-btn.nav:hover { background:#236193; }
        .rd-btn.refresh { background:var(--green); border-color:#2f8b60; }
        .rd-btn.refresh:hover { background:var(--green-hover); }
        .rd-btn.google-sheets { background:#3a6599; border-color:#5383bb; }
        .rd-btn.google-sheets:hover { background:#4a7ab0; }
        .rd-btn.reset { background:var(--danger); border-color:#a34b4b; }
        .rd-btn.reset:hover { background:#a54848; }
        .rd-btn:disabled { opacity:.55; cursor:not-allowed; }

        .loading-box {
          background:var(--panel);
          border:1px solid var(--border);
          padding:12px 14px;
          border-radius:10px;
          font-size:.7rem;
          color:var(--text-dim);
        }

        .rd-shift-view-container {
          background:var(--panel);
          border:1px solid var(--border);
          border-radius:14px;
          padding:20px;
        }

        .sv-body-inline {
          display:flex;
          gap:40px;
        }

        .sv-calendar-col {
          flex:0 0 300px;
          display:flex;
          flex-direction:column;
          gap:16px;
        }

        .sv-section-label {
          font-size:.8rem;
          letter-spacing:1px;
          color:#a9bdd0;
          font-weight:600;
        }

        .sv-content-col {
          flex:1;
          min-width:0;
          display:flex;
          flex-direction:column;
        }

        .sv-filter-block { margin-bottom:20px; }
        .sv-filter-title {
          font-size:.72rem;
          letter-spacing:1px;
          color:#8ea3b6;
          margin-bottom:10px;
          font-weight:700;
        }
        .sv-chip-row { display:flex; flex-wrap:wrap; gap:10px; }
        .sv-chip {
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
        .sv-chip.active {
          background:#3a6599;
          border-color:#5e94d1;
          color:#fff;
          box-shadow:0 0 0 2px rgba(94,148,209,.28);
        }
        .sv-chip.clear {
          background:transparent;
          border:1px dashed #334758;
          color:#94abbe;
        }
        .sv-chip.clear:hover { border-color:#5d90c8; color:#d6e6f5; }

        .sv-results { margin-top:4px; }
        .sv-subtitle {
          margin:0 0 14px 0;
          font-size:1rem;
          letter-spacing:.6px;
          color:#b9cddd;
          font-weight:600;
        }
        .sv-empty {
          background:#17232d;
          border:1px solid #223444;
          padding:18px;
          border-radius:12px;
          font-size:.8rem;
          color:#8fa5b9;
        }
        .sv-employee-grid {
          display:grid;
          gap:18px 20px;
          grid-template-columns:repeat(auto-fill,minmax(250px,1fr));
        }
        .sv-emp-card {
          background:#18242e;
          border:1px solid #2d3d4c;
          border-radius:14px;
          padding:14px 16px 16px;
          display:flex;
          flex-direction:column;
          gap:8px;
          transition:.18s;
          cursor:pointer;
        }
        .sv-emp-card:hover {
          background:#20323f;
          border-color:#416077;
          box-shadow:0 2px 8px rgba(0,0,0,.3);
        }
        .sv-emp-name { font-size:.95rem; font-weight:600; color:#e2ebf2; }
        .sv-emp-meta { font-size:.7rem; color:#8ba0b2; letter-spacing:.3px; }
        .sv-emp-shift {
          align-self:flex-start;
          background:#3a6599;
          padding:5px 12px;
          font-size:.7rem;
          border-radius:18px;
          letter-spacing:.6px;
          font-weight:600;
          color:#fff;
        }

        .sv-stats { margin-top:26px; }
        .sv-stats-row { display:flex; flex-wrap:wrap; gap:12px; }
        .sv-stat-pill {
          background:#1f2c38;
          border:1px solid #314354;
          border-radius:12px;
          padding:10px 14px;
          display:flex;
          align-items:center;
          gap:12px;
          font-size:.75rem;
        }
        .sv-stat-pill.total {
          background:#253848;
          border:1px dashed #3c5668;
        }
        .sv-stat-key {
          background:#3b6ea7;
          padding:4px 10px;
          border-radius:14px;
          font-size:.65rem;
          letter-spacing:.5px;
          color:#fff;
          font-weight:600;
        }
        .sv-stat-val { font-weight:700; font-size:.85rem; color:#e7eef5; }

        /* Edit Modal Styles */
        .edit-modal-overlay {
          position:fixed;
          inset:0;
          background:rgba(0,0,0,.6);
          backdrop-filter:blur(4px);
          display:flex;
          align-items:center;
          justify-content:center;
          z-index:9999;
        }
        .edit-modal {
          background:#0e141c;
          border:1px solid #2d3b47;
          border-radius:12px;
          width:90%;
          max-width:500px;
          box-shadow:0 8px 32px rgba(0,0,0,.7);
        }
        .edit-modal-header {
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:16px 20px;
          border-bottom:1px solid #1c2731;
        }
        .edit-modal-header h3 {
          margin:0;
          font-size:1.1rem;
          color:#e1e9ef;
          font-weight:600;
        }
        .close-btn {
          background:#223346;
          border:1px solid #314a62;
          color:#dde7ef;
          padding:4px 10px;
          font-size:.9rem;
          border-radius:6px;
          cursor:pointer;
        }
        .close-btn:hover { background:#2f4c67; }
        
        .edit-modal-body {
          padding:20px;
        }
        .edit-info {
          margin-bottom:16px;
          font-size:.85rem;
          color:#b9cddd;
        }
        .edit-info p {
          margin:6px 0;
        }
        .edit-form-group {
          display:flex;
          flex-direction:column;
          gap:8px;
        }
        .edit-form-group label {
          font-size:.75rem;
          letter-spacing:.5px;
          color:#94a9bc;
          font-weight:600;
        }
        .edit-form-group select {
          background:#0e1a24;
          border:1px solid #304859;
          color:#d6e3ec;
          border-radius:8px;
          padding:10px 12px;
          font-size:.85rem;
          outline:none;
          cursor:pointer;
        }
        .edit-form-group select:focus {
          border-color:#4b88c3;
          box-shadow:0 0 0 2px rgba(75,136,195,.35);
        }
        
        .edit-modal-footer {
          padding:16px 20px;
          border-top:1px solid #1c2731;
          display:flex;
          gap:10px;
          justify-content:flex-end;
        }

        @media (max-width: 1000px) {
          .sv-body-inline { flex-direction:column; }
          .sv-calendar-col { flex:0 0 auto; }
        }

        @media (max-width: 768px) {
          .rd-bar { 
            flex-direction: column;
            gap: 12px;
          }
          .rd-bar-actions {
            width: 100%;
            flex-direction: column;
            gap: 8px;
          }
          .rd-btn {
            width: 100%;
            text-align: center;
          }
          .sv-employee-grid {
            grid-template-columns: 1fr;
          }
          .sv-chip-row {
            gap: 6px;
          }
          .sv-chip {
            padding: 6px 12px;
            font-size: 0.7rem;
          }
        }

        @media (max-width: 480px) {
          .roster-data-root {
            padding: 0;
          }
          .rd-title {
            font-size: 1.1rem;
          }
          .rd-sub {
            font-size: 0.68rem;
          }
          .rd-shift-view-container {
            padding: 12px;
          }
          .sv-section-label {
            font-size: 0.75rem;
          }
          .sv-filter-title {
            font-size: 0.68rem;
          }
          .sv-subtitle {
            font-size: 0.9rem;
          }
          .sv-emp-card {
            padding: 10px 12px;
          }
          .edit-modal {
            width: 95% !important;
            max-width: 95% !important;
          }
        }
      `}</style>
    </div>
  );
}
