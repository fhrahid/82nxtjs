"use client";
import { useState, useEffect, useMemo } from 'react';
import RosterTable from '../Shared/RosterTable';
import ShiftView from '../ShiftView';

interface Props { id: string; }

export default function AdminDataTab({id}:Props) {
  const [adminData,setAdminData]=useState<any>(null);
  const [googleData,setGoogleData]=useState<any>(null);
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [resetting,setResetting]=useState(false);
  const [showShiftView,setShowShiftView]=useState(false);

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

  async function resetToGoogle() {
    if (!confirm('Reset admin data to Google spreadsheet data? This will remove all manual overrides.')) return;
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
    <div id={id} className="adm-dark-root">
      <h2 className="adm-title">Admin Data (Editable)</h2>
      <p className="adm-sub">
        Overrides Google sheet shifts. Click a shift to edit.
        <span className="blue-note"> Modified cells = blue.</span>
      </p>

      <div className="adm-bar">
        <button className="adm-btn nav" onClick={prevMonth} disabled={loading}>← Previous Month</button>
        <div className="adm-month">{monthLabel}</div>
        <div className="adm-bar-actions">
          <button className="adm-btn nav" onClick={nextMonth} disabled={loading}>Next Month →</button>
          <button className="adm-btn refresh" onClick={load} disabled={loading || saving}>
            {loading ? 'Loading…' : saving ? 'Saving…' : '🔄 Refresh'}
          </button>
          <button className="adm-btn view" onClick={()=>setShowShiftView(true)} disabled={loading || !adminData}>
            👁️ Shift View
          </button>
          <button className="adm-btn reset" onClick={resetToGoogle} disabled={loading || saving || resetting || !googleData}>
            {resetting ? 'Resetting…' : '↺ Reset to Google'}
          </button>
        </div>
      </div>

      <div className="adm-filters">
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
        <div className="adm-table-wrapper">
          <RosterTable
            headers={adminData.headers}
            teams={filteredTeams}
            originalTeams={googleData.teams}
            editable
            onUpdateShift={updateShift}
          />
        </div>
      )}

      {adminData && (
        <ShiftView
          open={showShiftView}
          onClose={()=>setShowShiftView(false)}
          roster={adminData}
          headers={adminData.headers || []}
        />
      )}

      <style jsx>{`
        .adm-dark-root {
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
          --blue-mod:#1b3e57;
          --blue-mod-border:#3f7aa9;
          color:var(--text);
        }
        .adm-title { margin:0 0 6px; font-size:1.35rem; font-weight:600; letter-spacing:.4px; }
        .adm-sub { margin:0 0 18px; font-size:.72rem; letter-spacing:.3px; color:var(--text-dim); }
        .blue-note { color:#61b5ff; font-weight:600; margin-left:4px; }

        .adm-bar {
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
        .adm-month { font-weight:600; letter-spacing:.5px; }
        .adm-bar-actions { display:flex; gap:10px; }

        .adm-btn {
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
        .adm-btn:hover { background:var(--accent-hover); }
        .adm-btn.nav { background:#1a4c78; border-color:#275d8e; }
        .adm-btn.nav:hover { background:#236193; }
        .adm-btn.refresh { background:var(--green); border-color:#2f8b60; }
        .adm-btn.refresh:hover { background:var(--green-hover); }
        .adm-btn.view { background:#3a6599; border-color:#5383bb; }
        .adm-btn.view:hover { background:#4a7ab0; }
        .adm-btn.reset { background:#8f3e3e; border-color:#a34b4b; }
        .adm-btn.reset:hover { background:#a54848; }
        .adm-btn:disabled { opacity:.55; cursor:not-allowed; }

        .adm-filters {
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

        .adm-table-wrapper {
          background:var(--panel);
          border:1px solid var(--border);
          border-radius:14px;
          padding:14px 14px 14px;
        }
      `}</style>
    </div>
  );
}