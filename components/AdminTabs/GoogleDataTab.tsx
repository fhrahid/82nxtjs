"use client";
import { useState, useEffect } from 'react';
import RosterTable from '../Shared/RosterTable';
import ShiftView from '../ShiftView';

interface Props { id: string; }

export default function GoogleDataTab({id}:Props) {
  const [data,setData]=useState<any>(null);
  const [loading,setLoading]=useState(false);
  const [showShiftView,setShowShiftView]=useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/get-google-data');
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(()=>{ load(); },[]);

  return (
    <div id={id} className="tab-pane">
      <h2>Google Data (Read Only)</h2>
      <p>Raw roster data as synchronized from Google Sheets.</p>
      <div className="actions-row">
        <button className="btn small" onClick={load}>🔄 Refresh</button>
        <button className="btn small primary" onClick={()=>setShowShiftView(true)} disabled={!data}>
          👁️ Shift View
        </button>
      </div>
      {loading && <div className="inline-loading">Loading Google data...</div>}
      {data &&
        <RosterTable
          headers={data.headers}
          teams={data.teams}
          editable={false}
        />
      }
      {data && (
        <ShiftView
          open={showShiftView}
          onClose={()=>setShowShiftView(false)}
          roster={data}
          headers={data.headers || []}
        />
      )}
    </div>
  );
}