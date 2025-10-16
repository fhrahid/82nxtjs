"use client";
import { useState, useEffect, useCallback } from 'react';

interface Props { id: string; }

export default function RosterSyncTab({id}: Props) {
  // Data Sync states
  const [googleStatus, setGoogleStatus] = useState('Not loaded');
  const [adminStatus, setAdminStatus] = useState('Not loaded');
  const [stats, setStats] = useState({employees: 0, teams: 0, dates: 0, modified: 0});
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [syncMessage, setSyncMessage] = useState<{text: string, type: 'success' | 'error'}>({text: '', type: 'success'});

  // Google Links states
  const [monthYear, setMonthYear] = useState('');
  const [link, setLink] = useState('');
  const [links, setLinks] = useState<Record<string, string>>({});
  const [linksLoading, setLinksLoading] = useState(false);

  // Reset states
  const [resetting, setResetting] = useState(false);
  const [hardResetting, setHardResetting] = useState(false);

  const load = useCallback(async function() {
    setLoading(true);
    try {
      const disp = await fetch('/api/admin/get-display-data').then(r => r.json());
      const gRes = await fetch('/api/admin/get-google-data');
      const aRes = await fetch('/api/admin/get-admin-data');
      const settingsRes = await fetch('/api/admin/get-settings');
      const g = gRes.ok ? await gRes.json() : null;
      const a = aRes.ok ? await aRes.json() : null;
      const settings = settingsRes.ok ? await settingsRes.json() : {autoSyncEnabled: false};
      setStats({
        employees: disp.allEmployees?.length || 0,
        teams: Object.keys(disp.teams || {}).length,
        dates: disp.headers?.length || 0,
        modified: await calcModified(g, a)
      });
      setGoogleStatus(g?.allEmployees?.length ? `${g.allEmployees.length} employees loaded` : 'Not loaded');
      setAdminStatus(a?.allEmployees?.length ? `${a.allEmployees.length} employees` : 'Not available');
      setAutoSyncEnabled(settings.autoSyncEnabled || false);
    } catch (e: any) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  async function calcModified(g: any, a: any) {
    if (!g || !a) return 0;
    let count = 0;
    for (const team of Object.keys(a.teams || {})) {
      if (!g.teams[team]) continue;
      for (const adm of a.teams[team]) {
        const goog = g.teams[team].find((e: any) => e.id === adm.id);
        if (goog) {
          for (let i = 0; i < adm.schedule.length; i++) {
            if (adm.schedule[i] !== goog.schedule[i] && adm.schedule[i] !== '') count++;
          }
        }
      }
    }
    return count;
  }

  const syncSheets = useCallback(async function() {
    setSyncing(true);
    setSyncMessage({text: '', type: 'success'});
    const res = await fetch('/api/admin/sync-google-sheets', {method: 'POST'}).then(r => r.json());
    setSyncing(false);
    setLastSyncTime(new Date().toLocaleTimeString());
    setSyncMessage({
      text: res.success ? res.message : res.error,
      type: res.success ? 'success' : 'error'
    });
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
      setSyncMessage({
        text: newValue ? 'Auto-sync enabled successfully' : 'Auto-sync disabled',
        type: 'success'
      });
    } catch (e) {
      console.error('Failed to toggle auto-sync:', e);
      setSyncMessage({
        text: 'Failed to update auto-sync setting',
        type: 'error'
      });
    }
  }

  async function loadLinks() {
    setLinksLoading(true);
    const res = await fetch('/api/admin/get-google-links');
    if (res.ok) setLinks(await res.json());
    setLinksLoading(false);
  }

  async function saveLink() {
    if (!monthYear || !link) {
      alert('Month Year & link required');
      return;
    }
    const res = await fetch('/api/admin/save-google-link', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({monthYear, googleLink: link})
    }).then(r => r.json());
    if (!res.success) alert(res.error);
    else {
      setMonthYear('');
      setLink('');
      loadLinks();
    }
  }

  async function removeLink(m: string) {
    if (!confirm(`Delete link for ${m}?`)) return;
    const res = await fetch('/api/admin/delete-google-link', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({monthYear: m})
    }).then(r => r.json());
    if (!res.success) alert(res.error);
    else loadLinks();
  }

  async function resetToGoogleOrCSV() {
    if (!confirm('Reset admin data to Google spreadsheet or CSV data? This will remove all manual overrides.')) return;
    setResetting(true);
    const res = await fetch('/api/admin/reset-to-google', {method: 'POST'}).then(r => r.json());
    setResetting(false);
    if (!res.success) {
      alert(res.error || 'Reset failed');
    } else {
      alert('Admin data reset successfully!');
      load();
    }
  }

  async function hardReset() {
    if (!confirm('⚠️ WARNING: This will permanently delete all roster data including admin_data.json, google_data.json, modified_shifts.json, and schedule_requests.json. Are you sure?')) {
      return;
    }
    if (!confirm('This action cannot be undone. Are you absolutely sure you want to proceed?')) {
      return;
    }

    setHardResetting(true);
    try {
      const res = await fetch('/api/admin/hard-reset', {method: 'POST'}).then(r => r.json());
      if (res.success) {
        alert(res.message);
        setSyncMessage({text: 'Data has been reset. Please refresh the page.', type: 'success'});
        load();
        loadLinks();
      } else {
        alert(res.error || 'Reset failed');
      }
    } catch (e) {
      alert('Reset failed');
      console.error(e);
    }
    setHardResetting(false);
  }

  useEffect(() => {
    load();
    loadLinks();
  }, [load]);

  // Auto-sync every 5 minutes if enabled
  useEffect(() => {
    if (!autoSyncEnabled) return;

    const interval = setInterval(() => {
      syncSheets();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [autoSyncEnabled, syncSheets]);

  // Auto-refresh links every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadLinks();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div id={id} className="tab-pane">
      <h2>Roster Sync Management</h2>
      <p>Sync data from Google Sheets, manage links, and reset roster data.</p>

      {/* Data Sync Section */}
      <div style={{marginBottom: '40px'}}>
        <h3 style={{fontSize: '1.3rem', marginBottom: '15px', color: 'var(--theme-primary, #5A9FD4)'}}>📊 Data Synchronization</h3>
        <div className="actions-row">
          <button onClick={syncSheets} disabled={syncing} className="btn primary">
            {syncing ? '⏳ Syncing...' : '🔄 Sync Google Sheets Now'}
          </button>
          <button
            onClick={toggleAutoSync}
            disabled={syncing}
            className={`btn ${autoSyncEnabled ? 'success' : 'secondary'}`}
          >
            {autoSyncEnabled ? '✓ Auto-Sync Enabled (5 min)' : '⏱ Enable Auto-Sync (5 min)'}
          </button>
        </div>
        {syncMessage.text && (
          <div style={{
            marginTop: '12px',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.9rem',
            background: syncMessage.type === 'success' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)',
            border: `2px solid ${syncMessage.type === 'success' ? '#4CAF50' : '#F44336'}`,
            color: syncMessage.type === 'success' ? '#6FD99F' : '#FF8A80',
            fontWeight: 500
          }}>
            {syncMessage.type === 'success' ? '✓' : '✗'} {syncMessage.text}
          </div>
        )}
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

      {/* Google Sheets Links Section */}
      <div style={{marginBottom: '40px'}}>
        <h3 style={{fontSize: '1.3rem', marginBottom: '15px', color: 'var(--theme-primary, #5A9FD4)'}}>🔗 Google Sheets Links</h3>
        <p style={{marginBottom: '15px'}}>Add or manage published CSV links for roster sources.</p>
        <div className="form-grid two">
          <div>
            <label>Month (YYYY-MM)</label>
            <input value={monthYear} onChange={e => setMonthYear(e.target.value)} placeholder="2025-10"/>
          </div>
          <div>
            <label>CSV Publish Link</label>
            <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://docs.google.com/.../pub?output=csv"/>
          </div>
        </div>
        <div className="actions-row">
          <button className="btn primary" onClick={saveLink}>💾 Save Link</button>
          <button className="btn" onClick={loadLinks}>🔄 Refresh</button>
        </div>
        {linksLoading && <div className="inline-loading">Loading links...</div>}
        <table className="data-table small">
          <thead>
            <tr>
              <th>Month</th>
              <th>Link</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(links).length === 0 && <tr><td colSpan={3}>No links added yet</td></tr>}
            {Object.entries(links).map(([m, l]) => (
              <tr key={m}>
                <td>{m}</td>
                <td className="truncate"><a href={l} target="_blank" rel="noreferrer">Open</a></td>
                <td><button className="btn danger tiny" onClick={() => removeLink(m)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="note-box">
          Publish Google Sheets to CSV via File → Share → Publish to web → select sheet → CSV.
        </div>
      </div>

      {/* Reset Operations Section */}
      <div style={{marginBottom: '40px'}}>
        <h3 style={{fontSize: '1.3rem', marginBottom: '15px', color: 'var(--theme-primary, #5A9FD4)'}}>↺ Reset Operations</h3>
        
        {/* Reset to Google/CSV */}
        <div style={{marginBottom: '25px'}}>
          <h4 style={{fontSize: '1.1rem', marginBottom: '10px'}}>Reset to Google/CSV Data</h4>
          <p style={{marginBottom: '12px', color: 'var(--theme-text-dim, #9FB7D5)'}}>
            Reset admin roster data to match the original Google Sheets or CSV data. This will remove all manual shift modifications.
          </p>
          <button
            className="btn"
            style={{backgroundColor: '#ff9800', color: 'white'}}
            onClick={resetToGoogleOrCSV}
            disabled={loading || syncing || resetting}
          >
            {resetting ? 'Resetting…' : '↺ Reset to Google/CSV'}
          </button>
        </div>

        {/* Hard Reset */}
        <div>
          <h4 style={{fontSize: '1.1rem', marginBottom: '10px', color: '#ff6b6b'}}>⚠️ Hard Reset (Danger Zone)</h4>
          <p style={{marginBottom: '12px', color: '#ff6b6b'}}>
            This will permanently delete ALL schedule data including:
          </p>
          <ul style={{marginBottom: '12px', marginLeft: '20px', color: 'var(--theme-text-dim, #9FB7D5)'}}>
            <li><code>admin_data.json</code> - Admin modified roster data</li>
            <li><code>google_data.json</code> - Google Sheets imported data</li>
            <li><code>modified_shifts.json</code> - Shift modification history</li>
            <li><code>schedule_requests.json</code> - All schedule requests</li>
          </ul>
          <div className="import-box" style={{borderColor: '#ff6b6b', marginTop: '10px'}}>
            <button
              className="btn"
              style={{backgroundColor: '#ff6b6b', color: 'white'}}
              disabled={hardResetting}
              onClick={hardReset}
            >
              {hardResetting ? 'Resetting...' : '🗑️ Hard Reset All Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
