"use client";
import { useEffect, useState } from 'react';

interface Props { id: string; }

interface Request {
  id: string;
  type: 'shift_change'|'swap';
  status: string;
  created_at: string;
  approved_at?: string | null;
  approved_by?: string | null;
  employee_id?: string;
  employee_name?: string;
  team: string;
  date: string;
  current_shift?: string;
  requested_shift?: string;
  requester_id?: string;
  requester_name?: string;
  target_employee_id?: string;
  target_employee_name?: string;
  requester_shift?: string;
  target_shift?: string;
  reason: string;
}

export default function ScheduleRequestsTab({id}:Props) {
  const [allRequests,setAllRequests]=useState<Request[]>([]);
  const [stats,setStats]=useState<any>({});
  const [loading,setLoading]=useState(false);
  const [filter,setFilter]=useState<'all'|'pending'|'approved'|'shift_change'|'swap'>('all');
  const [isMobile,setIsMobile]=useState(false);

  useEffect(()=>{
    const apply = () => setIsMobile(window.innerWidth <= 480);
    apply();
    window.addEventListener('resize', apply);
    return ()=>window.removeEventListener('resize', apply);
  },[]);

  async function load() {
    setLoading(true);
    try {
      const pendRes = await fetch('/api/schedule-requests/get-pending').then(r=>r.json()).catch(()=>null);
      if (pendRes?.success) {
        setStats((prev:any)=>({...prev, ...pendRes.stats}));
      }
      const allRes = await fetch('/api/schedule-requests/get-all').then(r=>r.json()).catch(()=>null);
      if (allRes?.success) {
        setAllRequests(allRes.all_requests);
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { 
    load(); 
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  function getFilteredRequests() {
    if (filter === 'all') return allRequests;
    if (filter === 'pending') return allRequests.filter(r => r.status === 'pending');
    if (filter === 'approved') return allRequests.filter(r => r.status === 'approved');
    if (filter === 'shift_change') return allRequests.filter(r => r.type === 'shift_change');
    if (filter === 'swap') return allRequests.filter(r => r.type === 'swap');
    return allRequests;
  }

  async function act(requestId:string, status:'approved'|'rejected') {
    if (!confirm(`Mark request ${requestId} as ${status}?`)) return;
    const res = await fetch('/api/schedule-requests/update-status',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({requestId, status})
    }).then(r=>r.json()).catch(()=>null);
    if (!res?.success) alert(res?.error || 'Action failed');
    load();
  }

  function formatDate(d?: string | null) {
    if (!d) return '-';
    try { return new Date(d).toLocaleString(); } catch { return d; }
  }

  function renderTableRow(r:Request) {
    const isShift = r.type==='shift_change';
    const employeeName = isShift ? r.employee_name : r.requester_name;
    const employeeId = isShift ? r.employee_id : r.requester_id;
    return (
      <tr key={r.id} className={r.status==='pending'?'pending-row':''}>
        <td>
          <div style={{fontSize: '0.85rem'}}>
            <div><strong>{employeeName || 'N/A'}</strong></div>
            <div style={{color: '#7E90A8', fontSize: '0.75rem'}}>{employeeId || 'N/A'}</div>
          </div>
        </td>
        <td>{r.type==='swap'? 'Swap':'Change'}</td>
        <td>{r.team}</td>
        <td>{r.date}</td>
        <td>
          {isShift
            ? `${r.current_shift} → ${r.requested_shift}`
            : `${r.requester_shift} (${r.requester_name}) ⇄ ${r.target_shift} (${r.target_employee_name})`}
        </td>
        <td className={`status ${r.status}`}>{r.status}</td>
        <td className="truncate reason-cell" title={r.reason}>{r.reason}</td>
        <td>{formatDate(r.created_at)}</td>
        <td>
          {r.approved_by ? (
            <div style={{fontSize: '0.75rem'}}>
              <div>{r.approved_by}</div>
              <div style={{color: '#7E90A8'}}>{formatDate(r.approved_at)}</div>
            </div>
          ) : (
            r.status === 'pending'
              ? (
                <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                  <button className="btn success tiny" onClick={()=>act(r.id,'approved')}>Approve</button>
                  <button className="btn danger tiny" onClick={()=>act(r.id,'rejected')}>Reject</button>
                </div>
              )
              : '-'
          )}
        </td>
      </tr>
    );
  }

  function renderCard(r:Request) {
    const isShift = r.type==='shift_change';
    const employeeName = isShift ? r.employee_name : r.requester_name;
    const employeeId = isShift ? r.employee_id : r.requester_id;
    return (
      <div key={r.id} className={`schedule-request-card status-${r.status}`}>
        <div className="card-row heading">
          <div className="employee-block">
            <div className="emp-name">{employeeName || 'N/A'}</div>
            <div className="emp-id">{employeeId || 'N/A'}</div>
          </div>
          <div className={`badge type-badge ${r.type}`}>{r.type==='swap'?'Swap':'Change'}</div>
        </div>

        <div className="card-grid">
          <div className="field">
            <span className="label">Team</span>
            <span className="value">{r.team}</span>
          </div>
          <div className="field">
            <span className="label">Date</span>
            <span className="value">{r.date}</span>
          </div>
          <div className="field">
            <span className="label">Shift(s)</span>
            <span className="value">
              {isShift
                ? `${r.current_shift} → ${r.requested_shift}`
                : `${r.requester_shift} ⇄ ${r.target_shift}`}
            </span>
          </div>
            <div className="field">
              <span className="label">Status</span>
              <span className={`value status-chip ${r.status}`}>{r.status}</span>
            </div>
            <div className="field span-2">
              <span className="label">Reason</span>
              <span className="value reason" title={r.reason}>{r.reason || '-'}</span>
            </div>
            <div className="field">
              <span className="label">Created</span>
              <span className="value">{formatDate(r.created_at)}</span>
            </div>
            <div className="field">
              <span className="label">Approved By</span>
              <span className="value">
                {r.approved_by
                  ? <>
                      <strong>{r.approved_by}</strong><br/>
                      <span className="dim">{formatDate(r.approved_at)}</span>
                    </>
                  : (r.status === 'pending'
                      ? <span className="dim">Awaiting</span>
                      : '-')}
              </span>
            </div>
        </div>

        {r.status === 'pending' && (
          <div className="card-actions">
            <button className="btn success tiny" onClick={()=>act(r.id,'approved')}>Approve</button>
            <button className="btn danger tiny" onClick={()=>act(r.id,'rejected')}>Reject</button>
          </div>
        )}
      </div>
    );
  }

  const filtered = getFilteredRequests();

  return (
    <div id={id} className="tab-pane schedule-requests-root">
      <h2>📋 Schedule Requests</h2>
      <p>Approve or reject shift change and swap requests submitted by employees.</p>

      <div className="stats-bar requests-stats">
        <div className="stat-chip">Pending: {stats.pending_count||0}</div>
        <div className="stat-chip">Approved: {stats.approved_count||0}</div>
        <div className="stat-chip">Shift Changes: {stats.total_shift_change||0}</div>
        <div className="stat-chip">Swaps: {stats.total_swap||0}</div>
        <button className="btn small" onClick={load}>🔄 Refresh</button>
      </div>

      <div className="filter-bar requests-filters" style={{marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap'}}>
        <button className={`btn small ${filter==='all'?'primary':''}`} onClick={()=>setFilter('all')}>All</button>
        <button className={`btn small ${filter==='pending'?'primary':''}`} onClick={()=>setFilter('pending')}>Pending</button>
        <button className={`btn small ${filter==='approved'?'primary':''}`} onClick={()=>setFilter('approved')}>Approved</button>
        <button className={`btn small ${filter==='shift_change'?'primary':''}`} onClick={()=>setFilter('shift_change')}>Changes</button>
        <button className={`btn small ${filter==='swap'?'primary':''}`} onClick={()=>setFilter('swap')}>Swaps</button>
      </div>

      <h3 className="sr-section-title">
        {filter === 'all' ? 'All Requests'
          : filter === 'pending' ? 'Pending Requests'
          : filter === 'approved' ? 'Approved Requests'
          : filter === 'shift_change' ? 'Shift Change Requests'
          : 'Swap Requests'}
      </h3>

      {!isMobile && (
        <div className="requests-scroll">
          <div className="table-wrapper">
            <table className="data-table schedule-requests-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Team</th>
                  <th>Date</th>
                  <th>Shift(s)</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Created</th>
                  <th>Approved By</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length===0 && <tr><td colSpan={9}>No requests found</td></tr>}
                {filtered.map(renderTableRow)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isMobile && (
        <div className="requests-card-list">
          {filtered.length===0 && <div className="no-requests-mobile">No requests found</div>}
          {filtered.map(renderCard)}
        </div>
      )}

      {loading && <div className="inline-loading">Loading requests...</div>}
      <div className="note-box requests-note">
        Approving a shift change updates the admin schedule; approving a swap swaps the two employees’ shifts for that date.
      </div>
    </div>
  );
}