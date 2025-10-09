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
  const [syncFromLinks,setSyncFromLinks]=useState(true);
  const [availableMonths,setAvailableMonths]=useState<string[]>([]);
  const [lastSyncTime,setLastSyncTime]=useState<string>('');
  const [uploadingCSV,setUploadingCSV]=useState(false);
  const [csvFile,setCsvFile]=useState<File|null>(null);
  const [csvMonthYear,setCsvMonthYear]=useState('');

  const load = useCallback(async function() {
    setLoading(true);
    try {
      const [disp, gRes, aRes, configRes] = await Promise.all([
        fetch('/api/admin/get-display-data').then(r=>r.json()),
        fetch('/api/admin/get-google-data'),
        fetch('/api/admin/get-admin-data'),
        fetch('/api/admin/get-sync-config').then(r=>r.json())
      ]);
      
      const g = gRes.ok ? await gRes.json() : null;
      const a = aRes.ok ? await aRes.json() : null;
      
      setStats({
        employees: disp.allEmployees?.length||0,
        teams: Object.keys(disp.teams||{}).length,
        dates: disp.headers?.length||0,
        modified: await calcModified(g,a)
      });
      setGoogleStatus(g?.allEmployees?.length? `${g.allEmployees.length} employees loaded` : 'Not loaded');
      setAdminStatus(a?.allEmployees?.length? `${a.allEmployees.length} employees` : 'Not available');
      
      // Load sync config
      if (configRes) {
        setAutoSyncEnabled(configRes.autoSyncEnabled || false);
        setSyncFromLinks(configRes.syncFromLinks !== undefined ? configRes.syncFromLinks : true);
        setAvailableMonths(configRes.availableMonths || []);
      }
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
    setAutoSyncEnabled(newValue);
    await fetch('/api/admin/set-sync-config', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({autoSyncEnabled: newValue})
    });
  }
  
  async function toggleSyncFromLinks() {
    const newValue = !syncFromLinks;
    setSyncFromLinks(newValue);
    await fetch('/api/admin/set-sync-config', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({syncFromLinks: newValue})
    });
  }
  
  // Removed: handleMonthChange - no longer needed as all months are loaded
  
  async function handleCSVUpload() {
    if (!csvFile || !csvMonthYear) {
      alert('Please select a CSV file and enter month/year');
      return;
    }
    setUploadingCSV(true);
    const formData = new FormData();
    formData.append('csv_file', csvFile);
    formData.append('monthYear', csvMonthYear);
    
    const res = await fetch('/api/admin/upload-csv', {
      method: 'POST',
      body: formData
    }).then(r=>r.json());
    
    setUploadingCSV(false);
    alert(res.success ? res.message : res.error);
    if (res.success) {
      setCsvFile(null);
      setCsvMonthYear('');
      load();
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
      <p>Sync data from Google Sheets or upload CSV files. All months are loaded automatically.</p>
      
      {/* Available Months Display */}
      {availableMonths.length > 0 && (
        <div style={{marginBottom: '20px', padding: '12px', background: '#f0f8ff', borderRadius: '8px'}}>
          <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333'}}>
            📅 Available Months ({availableMonths.length}):
          </label>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
            {availableMonths.map(month => (
              <span 
                key={month} 
                style={{
                  padding: '6px 12px', 
                  background: '#4a90e2', 
                  color: 'white', 
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                {month}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Sync Configuration */}
      <div style={{marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px'}}>
        <h3>Sync Configuration</h3>
        <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
          <button 
            onClick={toggleSyncFromLinks} 
            className={`btn ${syncFromLinks ? 'success' : 'secondary'}`}
          >
            {syncFromLinks ? '✓ Sync from Google Sheets Enabled' : '⏸ Sync from Google Sheets Disabled'}
          </button>
          <button 
            onClick={toggleAutoSync} 
            disabled={syncing}
            className={`btn ${autoSyncEnabled ? 'success' : 'secondary'}`}
          >
            {autoSyncEnabled ? '✓ Auto-Sync Enabled (5 min)' : '⏱ Enable Auto-Sync (5 min)'}
          </button>
        </div>
      </div>
      
      {/* Google Sheets Sync */}
      <div style={{marginBottom: '20px'}}>
        <h3>Google Sheets Sync</h3>
        <div className="actions-row">
          <button onClick={syncSheets} disabled={syncing || !syncFromLinks} className="btn primary">
            {syncing? '⏳ Syncing...' : '🔄 Sync Google Sheets Now'}
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
      </div>
      
      {/* CSV Upload */}
      <div style={{marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px'}}>
        <h3>CSV Upload</h3>
        <p style={{fontSize: '0.9rem', marginBottom: '10px'}}>Upload a CSV file for a specific month</p>
        <div style={{display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap'}}>
          <input 
            type="file" 
            accept=".csv"
            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            style={{padding: '5px'}}
          />
          <input 
            type="text" 
            placeholder="Month/Year (e.g., 2024-09)"
            value={csvMonthYear}
            onChange={(e) => setCsvMonthYear(e.target.value)}
            style={{padding: '8px', minWidth: '180px'}}
          />
          <button 
            onClick={handleCSVUpload} 
            disabled={uploadingCSV || !csvFile || !csvMonthYear}
            className="btn primary"
          >
            {uploadingCSV ? '⏳ Uploading...' : '📤 Upload CSV'}
          </button>
        </div>
      </div>
      
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