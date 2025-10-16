"use client";
import { useState, useEffect, useCallback } from 'react';
import RosterTemplateModal from '../Shared/RosterTemplateModal';

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

  // Roster Template states
  const [showRosterTemplate, setShowRosterTemplate] = useState(false);
  const [templateData, setTemplateData] = useState<any>(null);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  
  // Template Sync states
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [syncingTemplates, setSyncingTemplates] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<{fileName: string, monthYear: string} | null>(null);

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
      setAllEmployees(disp.allEmployees || []);
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
    if (!confirm('⚠️ WARNING: This will permanently delete ALL schedule data including:\n\n• Admin modified roster data\n• Google Sheets imported data\n• Shift modification history\n• All schedule requests\n\nAre you sure?')) {
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
        setSyncMessage({text: 'Data has been reset. Refreshing...', type: 'success'});
        // Force a hard refresh after deletion
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        alert(res.error || 'Reset failed');
        setHardResetting(false);
      }
    } catch (e) {
      alert('Reset failed');
      console.error(e);
      setHardResetting(false);
    }
  }

  async function handleSaveRosterTemplate(schedule: Record<string, string[]>) {
    // The actual save is now handled in RosterTemplateModal itself
    // This is just a placeholder for parent notification
    return Promise.resolve();
  }

  async function loadTemplates() {
    try {
      const res = await fetch('/api/admin/list-roster-templates');
      if (res.ok) {
        const data = await res.json();
        setAvailableTemplates(data.templates || []);
      }
    } catch (e) {
      console.error('Failed to load templates:', e);
    }
  }

  async function deleteTemplate(fileName: string, monthYear: string) {
    if (!confirm(`Are you sure you want to delete the template for ${monthYear}?`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/delete-roster-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName })
      });

      const result = await res.json();
      if (result.success) {
        alert(result.message);
        loadTemplates(); // Reload the templates list
      } else {
        alert(`Failed to delete template: ${result.error}`);
      }
    } catch (e) {
      console.error('Failed to delete template:', e);
      alert('Failed to delete template');
    }
  }

  async function editTemplate(fileName: string, monthYear: string) {
    try {
      const res = await fetch('/api/admin/load-roster-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName })
      });

      const result = await res.json();
      if (result.success) {
        setEditingTemplate({ fileName, monthYear: result.data.monthYear });
        setTemplateData(result.data);
        setShowRosterTemplate(true);
      } else {
        alert(`Failed to load template: ${result.error}`);
      }
    } catch (e) {
      console.error('Failed to load template:', e);
      alert('Failed to load template');
    }
  }

  async function syncSelectedTemplates() {
    if (selectedTemplates.length === 0) {
      alert('Please select at least one template to sync');
      return;
    }

    if (!confirm(`Sync ${selectedTemplates.length} template(s)? This will update the roster data with template schedules.`)) {
      return;
    }

    setSyncingTemplates(true);
    try {
      const res = await fetch('/api/admin/sync-roster-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateFiles: selectedTemplates })
      });

      const result = await res.json();
      if (result.success) {
        alert(result.message);
        setSelectedTemplates([]);
        setShowTemplateSelector(false);
        load(); // Reload data
      } else {
        alert(`Sync failed: ${result.error}`);
      }
    } catch (e) {
      console.error('Failed to sync templates:', e);
      alert('Failed to sync templates');
    }
    setSyncingTemplates(false);
  }

  function toggleTemplateSelection(fileName: string) {
    setSelectedTemplates(prev =>
      prev.includes(fileName) ? prev.filter(f => f !== fileName) : [...prev, fileName]
    );
  }

  useEffect(() => {
    load();
    loadLinks();
    loadTemplates();
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
          <button
            onClick={() => setShowRosterTemplate(true)}
            className="btn"
            style={{backgroundColor: '#9C27B0', color: 'white'}}
          >
            📋 Roster Template
          </button>
          <button
            onClick={() => { loadTemplates(); setShowTemplateSelector(!showTemplateSelector); }}
            className="btn"
            style={{backgroundColor: '#673AB7', color: 'white'}}
          >
            📁 Sync From Templates
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
        
        {/* Template Selector */}
        {showTemplateSelector && (
          <div style={{
            marginTop: '16px',
            padding: '20px',
            background: 'var(--theme-card-bg)',
            border: '2px solid #673AB7',
            borderRadius: '12px'
          }}>
            <h4 style={{marginTop: 0, marginBottom: '16px', color: '#9575CD', fontSize: '1.1rem'}}>
              📁 Select Templates to Sync
            </h4>
            {availableTemplates.length === 0 ? (
              <p style={{color: 'var(--theme-text-dim)', fontStyle: 'italic', marginBottom: '16px'}}>
                No saved templates found. Create a template using the &quot;Roster Template&quot; button above.
              </p>
            ) : (
              <>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginBottom: '16px'}}>
                  {availableTemplates.map(template => (
                    <div
                      key={template.fileName}
                      style={{
                        padding: '16px',
                        background: selectedTemplates.includes(template.fileName) 
                          ? 'linear-gradient(135deg, rgba(103, 58, 183, 0.25) 0%, rgba(149, 117, 205, 0.15) 100%)'
                          : 'var(--theme-bg)',
                        border: `2px solid ${selectedTemplates.includes(template.fileName) ? '#9575CD' : 'var(--theme-border)'}`,
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        position: 'relative' as const,
                        boxShadow: selectedTemplates.includes(template.fileName) 
                          ? '0 4px 12px rgba(103, 58, 183, 0.3)' 
                          : '0 2px 6px rgba(0, 0, 0, 0.1)'
                      }}
                      onMouseEnter={(e) => {
                        if (!selectedTemplates.includes(template.fileName)) {
                          e.currentTarget.style.borderColor = '#9575CD';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(103, 58, 183, 0.2)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!selectedTemplates.includes(template.fileName)) {
                          e.currentTarget.style.borderColor = 'var(--theme-border)';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.1)';
                        }
                      }}
                    >
                      <div onClick={() => toggleTemplateSelection(template.fileName)}>
                        {selectedTemplates.includes(template.fileName) && (
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            width: '24px',
                            height: '24px',
                            background: '#673AB7',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}>
                            ✓
                          </div>
                        )}
                        <div style={{
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          color: selectedTemplates.includes(template.fileName) ? '#B39DDB' : 'var(--theme-text)',
                          marginBottom: '8px'
                        }}>
                          {template.monthYear}
                        </div>
                        <div style={{
                          fontSize: '0.85rem',
                          color: 'var(--theme-text-dim)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}>
                          <div>📅 Modified: {new Date(template.modifiedAt).toLocaleDateString()}</div>
                          <div>💾 {(template.size / 1024).toFixed(1)} KB</div>
                        </div>
                      </div>
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--theme-border)'
                      }}>
                        <button
                          className="btn tiny"
                          onClick={(e) => {
                            e.stopPropagation();
                            editTemplate(template.fileName, template.monthYear);
                          }}
                          style={{
                            flex: 1,
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            backgroundColor: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn tiny danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTemplate(template.fileName, template.monthYear);
                          }}
                          style={{
                            flex: 1,
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            backgroundColor: '#F44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '8px'}}>
                  <button
                    className="btn"
                    onClick={() => setShowTemplateSelector(false)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn primary"
                    onClick={syncSelectedTemplates}
                    disabled={selectedTemplates.length === 0 || syncingTemplates}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      backgroundColor: selectedTemplates.length === 0 ? '#555' : '#673AB7',
                      opacity: selectedTemplates.length === 0 ? 0.5 : 1,
                      cursor: selectedTemplates.length === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {syncingTemplates ? '⏳ Syncing...' : `🔄 Sync ${selectedTemplates.length} Template(s)`}
                  </button>
                </div>
              </>
            )}
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
        
        {/* Reset to CSV Data */}
        <div style={{marginBottom: '25px'}}>
          <h4 style={{fontSize: '1.1rem', marginBottom: '10px'}}>Reset to CSV Data</h4>
          <p style={{marginBottom: '12px', color: 'var(--theme-text-dim, #9FB7D5)'}}>
            Reset admin roster data to the CSV or template data. This will remove all manual shift modifications and schedule requests.
          </p>
          <button
            className="btn"
            style={{backgroundColor: '#ff9800', color: 'white'}}
            onClick={resetToGoogleOrCSV}
            disabled={loading || syncing || resetting}
          >
            {resetting ? 'Resetting…' : '↺ Reset to CSV Data'}
          </button>
        </div>

        {/* Hard Reset */}
        <div>
          <h4 style={{fontSize: '1.1rem', marginBottom: '10px', color: '#ff6b6b'}}>⚠️ Hard Reset (Danger Zone)</h4>
          <p style={{marginBottom: '12px', color: '#ff6b6b'}}>
            This will permanently delete ALL schedule data including:
          </p>
          <ul style={{marginBottom: '12px', marginLeft: '20px', color: 'var(--theme-text-dim, #9FB7D5)'}}>
            <li>Admin modified roster data</li>
            <li>Google Sheets imported data</li>
            <li>Shift modification history</li>
            <li>All schedule requests</li>
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

      {/* Roster Template Modal */}
      <RosterTemplateModal
        open={showRosterTemplate}
        onClose={() => {
          setShowRosterTemplate(false);
          setTemplateData(null);
          setEditingTemplate(null);
          loadTemplates(); // Refresh templates list after closing
        }}
        employees={allEmployees}
        onSave={handleSaveRosterTemplate}
        templateData={templateData}
      />
    </div>
  );
}
