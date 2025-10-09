"use client";
import { useState, useEffect, useCallback } from 'react';
interface Props { id: string; }
export default function DataSyncTab({id}:Props) {
  const [googleStatus,setGoogleStatus]=useState('Not loaded');
  const [adminStatus,setAdminStatus]=useState('Not loaded');
  const [stats,setStats]=useState({employees:0, teams:0, dates:0, modified:0});
  const [syncing,setSyncing]=useState(false);
  const [loading,setLoading]=useState(true);
  const [autoSyncEnabled,setAutoSyncEnabled]=useState(false);
  const [lastSyncTime,setLastSyncTime]=useState<string>('');

  const load = useCallback(async function() {
    setLoading(true);
    try {
      const disp = await fetch('/api/admin/get-display-data').then(r=>r.json());
      const gRes = await fetch('/api/admin/get-google-data');
      const aRes = await fetch('/api/admin/get-admin-data');
      const settingsRes = await fetch('/api/admin/get-settings');
      const g = gRes.ok ? await gRes.json() : null;
      const a = aRes.ok ? await aRes.json() : null;
      const settings = settingsRes.ok ? await settingsRes.json() : {autoSyncEnabled: false};
      setStats({
        employees: disp.allEmployees?.length||0,
        teams: Object.keys(disp.teams||{}).length,
        dates: disp.headers?.length||0,
        modified: await calcModified(g,a)
      });
      setGoogleStatus(g?.allEmployees?.length? `${g.allEmployees.length} employees loaded` : 'Not loaded');
      setAdminStatus(a?.allEmployees?.length? `${a.allEmployees.length} employees` : 'Not available');
      setAutoSyncEnabled(settings.autoSyncEnabled || false);
    } catch(e:any){
      console.error(e);
    }
    setLoading(false);
  }, []);

  async function calcModified(g:any,a:any) {
    if (!g || !a) return 0;
    let count=0;
    for (const team of Object.keys(a.teams||{})) {
      if (!g.teams[team]) continue;
      for (const adm of a.teams[team]) {
        const goog = g.teams[team].find((e:any)=>e.id===adm.id);
        if (goog) {
          for (let i=0;i<adm.schedule.length;i++) {
            if (adm.schedule[i]!==goog.schedule[i] && adm.schedule[i]!=='') count++;
          }
        }
      }
    }
    return count;
  }

  const syncSheets = useCallback(async function() {
    setSyncing(true);
    const res = await fetch('/api/admin/sync-google-sheets',{method:'POST'}).then(r=>r.json());
    setSyncing(false);
    setLastSyncTime(new Date().toLocaleTimeString());
    alert(res.success? res.message : res.error);
    load();
  }, [load]);

  async function toggleAutoSync() {
    const newValue = !autoSyncEnabled;
    try {
      await fetch('/api/admin/set-auto-sync', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({enabled: newValue})
      });
      setAutoSyncEnabled(newValue);
    } catch(e) {
      console.error('Failed to toggle auto-sync:', e);
      alert('Failed to update auto-sync setting');
    }
  }

  useEffect(()=>{ load(); },[load]);

  // Auto-sync every 5 minutes if enabled
  useEffect(() => {
    if (!autoSyncEnabled) return;
    
    const interval = setInterval(() => {
      syncSheets();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [autoSyncEnabled, syncSheets]);

  return (
    <div id={id} className="tab-pane">
      <h2>Data Sync Management</h2>
      <p>Sync data from Google Sheets and view system statistics.</p>
      <div className="actions-row">
        <button onClick={syncSheets} disabled={syncing} className="btn primary">
          {syncing? '⏳ Syncing...' : '🔄 Sync Google Sheets Now'}
        </button>
        <button 
          onClick={toggleAutoSync} 
          disabled={syncing}
          className={`btn ${autoSyncEnabled ? 'success' : 'secondary'}`}
        >
          {autoSyncEnabled ? '✓ Auto-Sync Enabled (5 min)' : '⏱ Enable Auto-Sync (5 min)'}
        </button>
      </div>
      {lastSyncTime && (
        <div style={{marginTop: '10px', fontSize: '0.85rem', color: 'var(--theme-text-dim, #9FB7D5)'}}>
          Last sync: {lastSyncTime}
        </div>
      )}
      {autoSyncEnabled && (
        <div style={{marginTop: '5px', fontSize: '0.85rem', color: 'var(--theme-success, #4CAF50)'}}>
          🔄 Auto-sync is active - syncing every 5 minutes
        </div>
      )}
      <div className="status-grid">
        <div className="status-card">
          <h4>Google Data</h4>
          <p>{googleStatus}</p>
        </div>
        <div className="status-card">
          <h4>Admin Data</h4>
          <p>{adminStatus}</p>
        </div>
        <div className="status-card">
          <h4>Employees</h4>
          <p>{stats.employees}</p>
        </div>
        <div className="status-card">
          <h4>Teams</h4>
          <p>{stats.teams}</p>
        </div>
        <div className="status-card">
          <h4>Date Columns</h4>
          <p>{stats.dates}</p>
        </div>
        <div className="status-card">
          <h4>Modified Shifts</h4>
          <p>{stats.modified}</p>
        </div>
      </div>
      {loading && <div className="inline-loading">Loading stats...</div>}
    </div>
  );
}