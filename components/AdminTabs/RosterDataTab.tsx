"use client";
import { useState, useEffect, useMemo } from 'react';
import RosterTable from '../Shared/RosterTable';
import ShiftView from '../ShiftView';

interface Props { id: string; }

export default function RosterDataTab({id}:Props) {
  const [adminData,setAdminData]=useState<any>(null);
  const [googleData,setGoogleData]=useState<any>(null);
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [resetting,setResetting]=useState(false);
  
  // Modal states
  const [showGoogleShiftView,setShowGoogleShiftView]=useState(false);
  const [showAdminShiftView,setShowAdminShiftView]=useState(false);

  const [teamFilter,setTeamFilter]=useState<string>('ALL');
  const [employeeFilter,setEmployeeFilter]=useState<string>('ALL');
  const [monthLabel,setMonthLabel]=useState<string>('Current Month');

  async function load() {
    setLoading(true);
    const aRes = await fetch('/api/admin/get-admin-data');
    const gRes = await fetch('/api/admin/get-google-data');
    if (aRes.ok) setAdminData(await aRes.json());
    if (gRes.ok) setGoogleData(await gRes.json());
    setLoading(false);
  }
  useEffect(()=>{ load(); },[]);

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

  const teamNames = useMemo(()=> adminData?.teams ? Object.keys(adminData.teams) : [], [adminData]);

  const employeeOptions = useMemo(()=>{
    if (!adminData?.teams) return [];
    let collected:any[] = [];
    Object.entries<any[]>(adminData.teams).forEach(([team, emps])=>{
      if (teamFilter!=='ALL' && team!==teamFilter) return;
      collected = collected.concat(emps);
    });
    return collected;
  },[adminData, teamFilter]);

  const filteredTeams = useMemo(()=>{
    if (!adminData?.teams) return {};
    const out: Record<string, any[]> = {};
    Object.entries<any[]>(adminData.teams).forEach(([team, emps])=>{
      if (teamFilter!=='ALL' && team!==teamFilter) return;
      const filteredEmps = employeeFilter==='ALL'
        ? emps
        : emps.filter(e=> e.id===employeeFilter);
      if (filteredEmps.length) out[team] = filteredEmps;
    });
    return out;
  },[adminData, teamFilter, employeeFilter]);

  function prevMonth() { setMonthLabel('Previous Month (stub)'); }
  function nextMonth() { setMonthLabel('Next Month (stub)'); }

  async function resetToGoogleOrCSV() {
    if (!confirm('Reset admin data to Google spreadsheet or CSV data? This will remove all manual overrides.')) return;
    setResetting(true);
    const res = await fetch('/api/admin/reset-to-google',{method:'POST'}).then(r=>r.json());
    setResetting(false);
    if (!res.success) {
      alert(res.error||'Reset failed');
    } else {
      alert('Admin data reset successfully!');
      load();
    }
  }

  return (
    <div id={id} className="roster-data-root">
      <h2 className="rd-title">Roster Data</h2>
      <p className="rd-sub">
        View and manage roster data from Google Sheets and CSV imports.
        <span className="blue-note"> Modified cells = blue.</span>
      </p>

      <div className="rd-bar">
        <button className="rd-btn nav" onClick={prevMonth} disabled={loading}>← Previous Month</button>
        <div className="rd-month">{monthLabel}</div>
        <div className="rd-bar-actions">
          <button className="rd-btn nav" onClick={nextMonth} disabled={loading}>Next Month →</button>
          <button className="rd-btn refresh" onClick={load} disabled={loading || saving}>
            {loading ? 'Loading…' : saving ? 'Saving…' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      <div className="rd-modals-row">
        <button 
          className="rd-modal-btn google" 
          onClick={()=>setShowGoogleShiftView(true)} 
          disabled={loading || !googleData}
        >
          📄 Google Roster Data View
        </button>
        <button 
          className="rd-modal-btn admin" 
          onClick={()=>setShowAdminShiftView(true)} 
          disabled={loading || !adminData}
        >
          📝 Admin Roster Data View (Editable)
        </button>
        <button 
          className="rd-modal-btn reset" 
          onClick={resetToGoogleOrCSV} 
          disabled={loading || saving || resetting || !googleData}
        >
          {resetting ? 'Resetting…' : '↺ Reset Data To Google/CSV'}
        </button>
      </div>

      <div className="rd-filters">
        <div className="f-group">
          <label>Filter by Team</label>
          <select
            value={teamFilter}
            onChange={e=>{
              setTeamFilter(e.target.value);
              setEmployeeFilter('ALL');
            }}
          >
            <option value="ALL">All Teams</option>
            {teamNames.map(t=> <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="f-group">
          <label>Filter by Employee</label>
          <select
            value={employeeFilter}
            onChange={e=>setEmployeeFilter(e.target.value)}
          >
            <option value="ALL">All Employees</option>
            {employeeOptions.map(emp=>(
              <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
            ))}
          </select>
        </div>
      </div>

      {(loading) && <div className="loading-box">Loading data…</div>}

      {!loading && adminData && googleData && (
        <div className="rd-table-wrapper">
          <RosterTable
            headers={adminData.headers}
            teams={filteredTeams}
            originalTeams={googleData.teams}
            editable
            onUpdateShift={updateShift}
          />
        </div>
      )}

      {/* Google Roster Data View Modal (Read-Only) */}
      {googleData && (
        <ShiftView
          open={showGoogleShiftView}
          onClose={()=>setShowGoogleShiftView(false)}
          roster={googleData}
          headers={googleData.headers || []}
        />
      )}

      {/* Admin Roster Data View Modal (Editable - shows admin data with click-to-edit) */}
      {adminData && (
        <ShiftView
          open={showAdminShiftView}
          onClose={()=>setShowAdminShiftView(false)}
          roster={adminData}
          headers={adminData.headers || []}
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
          --google:#3a6599;
          --google-hover:#4a7ab0;
          --admin:#5e4a94;
          --admin-hover:#7159b3;
          --danger:#8f3e3e;
          --text:#d7e3ed;
          --text-dim:#8ca2b5;
          --blue-mod:#1b3e57;
          --blue-mod-border:#3f7aa9;
          color:var(--text);
        }
        .rd-title { margin:0 0 6px; font-size:1.35rem; font-weight:600; letter-spacing:.4px; }
        .rd-sub { margin:0 0 18px; font-size:.72rem; letter-spacing:.3px; color:var(--text-dim); }
        .blue-note { color:#61b5ff; font-weight:600; margin-left:4px; }

        .rd-bar {
          background:var(--panel);
          border:1px solid var(--border);
          padding:12px 16px;
          border-radius:12px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:18px;
          margin-bottom:14px;
        }
        .rd-month { font-weight:600; letter-spacing:.5px; }
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
        .rd-btn:disabled { opacity:.55; cursor:not-allowed; }

        .rd-modals-row {
          display:flex;
          gap:12px;
          margin-bottom:14px;
          flex-wrap:wrap;
        }
        .rd-modal-btn {
          flex:1;
          min-width:200px;
          background:var(--google);
          border:1px solid #5383bb;
          color:#e8f3fa;
          padding:12px 16px;
          font-size:.7rem;
          border-radius:8px;
          cursor:pointer;
          font-weight:600;
          letter-spacing:.5px;
          transition:.18s;
          text-align:center;
        }
        .rd-modal-btn:hover { background:var(--google-hover); }
        .rd-modal-btn.admin { background:var(--admin); border-color:#8270b8; }
        .rd-modal-btn.admin:hover { background:var(--admin-hover); }
        .rd-modal-btn.reset { background:var(--danger); border-color:#a34b4b; }
        .rd-modal-btn.reset:hover { background:#a54848; }
        .rd-modal-btn:disabled { opacity:.55; cursor:not-allowed; }

        .rd-filters {
          background:var(--panel);
          border:1px solid var(--border);
          padding:14px 16px 12px;
          border-radius:12px;
          display:flex;
          flex-wrap:wrap;
          gap:32px;
          margin-bottom:16px;
        }
        .f-group { display:flex; flex-direction:column; gap:6px; min-width:220px; }
        .f-group label {
          font-size:.55rem;
          text-transform:uppercase;
          letter-spacing:.8px;
          color:var(--text-dim);
          font-weight:600;
        }
        .f-group select {
          background:#0e1a24;
          border:1px solid #304859;
          color:#d6e3ec;
          border-radius:8px;
          padding:8px 12px;
          font-size:.7rem;
          outline:none;
          cursor:pointer;
        }
        .f-group select:focus {
          border-color:#4b88c3;
          box-shadow:0 0 0 2px rgba(75,136,195,.35);
        }

        .loading-box {
          background:var(--panel);
          border:1px solid var(--border);
          padding:12px 14px;
          border-radius:10px;
          font-size:.7rem;
          color:var(--text-dim);
        }

        .rd-table-wrapper {
          background:var(--panel);
          border:1px solid var(--border);
          border-radius:14px;
          padding:14px 14px 14px;
        }
      `}</style>
    </div>
  );
}
