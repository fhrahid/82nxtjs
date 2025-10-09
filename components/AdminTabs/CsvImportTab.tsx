"use client";
import { useState, useEffect } from 'react';

interface Props { id: string; }

export default function CsvImportTab({id}:Props) {
  const [file,setFile]=useState<File|null>(null);
  const [uploading,setUploading]=useState(false);
  const [message,setMessage]=useState('');
  const [monthInfo,setMonthInfo]=useState('');
  const [exporting,setExporting]=useState(false);
  const [resetting,setResetting]=useState(false);
  const [availableMonths,setAvailableMonths]=useState<string[]>([]);
  const [selectedMonths,setSelectedMonths]=useState<string[]>([]);
  const [exportAll,setExportAll]=useState(true);

  useEffect(() => {
    loadAvailableMonths();
  }, []);

  async function loadAvailableMonths() {
    try {
      const res = await fetch('/api/admin/get-admin-data');
      if (res.ok) {
        const data = await res.json();
        if (data.headers && data.headers.length > 0) {
          const monthsSet = new Set<string>();
          const validMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          data.headers.forEach((h: string) => {
            const match = h.match(/[A-Za-z]+/);
            if (match && validMonths.includes(match[0])) {
              monthsSet.add(match[0]);
            }
          });
          setAvailableMonths(Array.from(monthsSet));
        }
      }
    } catch (e) {
      console.error('Failed to load months:', e);
    }
  }

  async function upload() {
    if (!file) { setMessage('Select a CSV file first'); return; }
    setUploading(true); setMessage('');
    const form = new FormData();
    form.append('csv_file', file);
    const res = await fetch('/api/admin/upload-csv',{method:'POST', body:form}).then(r=>r.json());
    setUploading(false);
    if (res.success) {
      setMessage(res.message);
      const m = (res.message||'').match(/for (.*)!/);
      if (m) setMonthInfo(m[1]);
      loadAvailableMonths(); // Refresh available months after upload
    } else setMessage(res.error||'Upload failed');
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const months = exportAll ? [] : selectedMonths;
      const res = await fetch('/api/admin/export-csv', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({months})
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.headers.get('Content-Disposition')?.split('filename=')[1] || 'admin_schedule.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setMessage('CSV exported successfully!');
      } else {
        const err = await res.json();
        setMessage(err.error || 'Export failed');
      }
    } catch (e) {
      setMessage('Export failed');
      console.error(e);
    }
    setExporting(false);
  }

  async function hardReset() {
    if (!confirm('⚠️ WARNING: This will permanently delete google_data.json and admin_data.json. All schedule data will be lost. Are you sure?')) {
      return;
    }
    if (!confirm('This action cannot be undone. Are you absolutely sure you want to proceed?')) {
      return;
    }
    
    setResetting(true);
    try {
      const res = await fetch('/api/admin/hard-reset', {method: 'POST'}).then(r => r.json());
      if (res.success) {
        alert(res.message);
        setMessage('Data has been reset. Please refresh the page.');
        loadAvailableMonths();
      } else {
        alert(res.error || 'Reset failed');
      }
    } catch (e) {
      alert('Reset failed');
      console.error(e);
    }
    setResetting(false);
  }

  function toggleMonth(month: string) {
    if (selectedMonths.includes(month)) {
      setSelectedMonths(selectedMonths.filter(m => m !== month));
    } else {
      setSelectedMonths([...selectedMonths, month]);
    }
  }

  return (
    <div id={id} className="tab-pane">
      <h2>CSV Import</h2>
      <p>Import roster data from a CSV file (template-compatible). This updates Google base data and merges into Admin if absent.</p>
      <div className="import-box">
        <label className="file-label">
          <input type="file" accept=".csv" onChange={e=>setFile(e.target.files?.[0]||null)}/>
          {file? `Selected: ${file.name}` : 'Choose CSV File'}
        </label>
        <div className="actions-row">
          <button className="btn primary" disabled={!file||uploading} onClick={upload}>
            {uploading? 'Uploading...' : '📤 Upload CSV'}
          </button>
          <a className="btn" href="/api/admin/download-template" target="_blank" rel="noreferrer">📥 Download Template</a>
        </div>
        {message && <div className="import-message">{message}</div>}
        {monthInfo && <div className="success-box">Detected Month: {monthInfo}</div>}
      </div>
      <div className="note-box">
        The importer replaces only matching date columns for the detected month; older months remain intact.
      </div>

      <div style={{marginTop: '30px'}}>
        <h2>CSV Export</h2>
        <p>Export Admin Final Schedule data to CSV format.</p>
        <div className="import-box">
          <div style={{marginBottom: '15px'}}>
            <label style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px'}}>
              <input 
                type="radio" 
                checked={exportAll} 
                onChange={() => {setExportAll(true); setSelectedMonths([]);}}
              />
              <span>Export All Months</span>
            </label>
            <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <input 
                type="radio" 
                checked={!exportAll} 
                onChange={() => setExportAll(false)}
              />
              <span>Select Specific Months</span>
            </label>
          </div>

          {!exportAll && availableMonths.length > 0 && (
            <div style={{marginBottom: '15px'}}>
              <div style={{fontSize: '0.9rem', marginBottom: '8px', fontWeight: 500}}>Select Months:</div>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                {availableMonths.map(month => (
                  <button
                    key={month}
                    onClick={() => toggleMonth(month)}
                    className={`btn ${selectedMonths.includes(month) ? 'primary' : 'secondary'}`}
                    style={{padding: '6px 12px', fontSize: '0.85rem'}}
                  >
                    {selectedMonths.includes(month) ? '✓ ' : ''}{month}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="actions-row">
            <button 
              className="btn primary" 
              disabled={exporting || (!exportAll && selectedMonths.length === 0)} 
              onClick={exportCsv}
            >
              {exporting ? 'Exporting...' : '📥 Export CSV'}
            </button>
          </div>
        </div>
      </div>

      <div style={{marginTop: '30px'}}>
        <h2>Hard Reset</h2>
        <p style={{color: '#ff6b6b'}}>⚠️ Danger Zone: This will permanently delete all schedule data.</p>
        <div className="import-box" style={{borderColor: '#ff6b6b'}}>
          <p>This action will delete <code>google_data.json</code> and <code>admin_data.json</code> files, resetting all schedules to empty state.</p>
          <div className="actions-row">
            <button 
              className="btn" 
              style={{backgroundColor: '#ff6b6b', color: 'white'}}
              disabled={resetting} 
              onClick={hardReset}
            >
              {resetting ? 'Resetting...' : '🗑️ Hard Reset All Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}