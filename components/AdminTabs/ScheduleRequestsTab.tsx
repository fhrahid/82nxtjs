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
  const [pending,setPending]=useState<Request[]>([]);
  const [allRequests,setAllRequests]=useState<Request[]>([]);
  const [stats,setStats]=useState<any>({});
  const [loading,setLoading]=useState(false);
  const [viewAll,setViewAll]=useState(false);
  const [filter,setFilter]=useState<'all'|'pending'|'approved'|'shift_change'|'swap'>('all');

  async function load() {
    setLoading(true);
    const pendRes = await fetch('/api/schedule-requests/get-pending').then(r=>r.json());
    if (pendRes.success) {
      setPending(pendRes.pending_requests);
      setStats(pendRes.stats);
    }
    const allRes = await fetch('/api/schedule-requests/get-all').then(r=>r.json());
    if (allRes.success) setAllRequests(allRes.all_requests);
    setLoading(false);
  }

  function getFilteredRequests() {
    if (filter === 'all') return allRequests;
    if (filter === 'pending') return allRequests.filter(r => r.status === 'pending');
    if (filter === 'approved') return allRequests.filter(r => r.status === 'approved');
    if (filter === 'shift_change') return allRequests.filter(r => r.type === 'shift_change');
    if (filter === 'swap') return allRequests.filter(r => r.type === 'swap');
    return allRequests;
  }

  async function act(id:string, status:'approved'|'rejected') {
    if (!confirm(`Mark request ${id} as ${status}?`)) return;
    const res = await fetch('/api/schedule-requests/update-status',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({requestId:id, status})
    }).then(r=>r.json());
    if (!res.success) alert(res.error);
    load();
  }

  function renderRow(r:Request, pending:boolean) {
    const isShift = r.type==='shift_change';
    const employeeName = isShift ? r.employee_name : r.requester_name;
    const employeeId = isShift ? r.employee_id : r.requester_id;
    
    return (
      <tr key={r.id} className={pending?'pending-row':''}>
        <td>
          <div style={{fontSize: '0.85rem'}}>
            <div><strong>{employeeName || 'N/A'}</strong></div>
            <div style={{color: '#7E90A8', fontSize: '0.75rem'}}>{employeeId || 'N/A'}</div>
          </div>
        </td>
        <td>{r.type==='swap'? 'Swap':'Change'}</td>
        <td>{r.team}</td>
        <td>{r.date}</td>
        {isShift
          ? <td>{r.current_shift} → {r.requested_shift}</td>
          : <td>{r.requester_shift} ({r.requester_name}) ⇄ {r.target_shift} ({r.target_employee_name})</td>}
        <td className={`status ${r.status}`}>{r.status}</td>
        <td className="truncate reason-cell" title={r.reason}>{r.reason}</td>
        <td>{new Date(r.created_at).toLocaleString()}</td>
        <td>
          {r.approved_by ? (
            <div style={{fontSize: '0.75rem'}}>
              <div>{r.approved_by}</div>
              <div style={{color: '#7E90A8'}}>{r.approved_at ? new Date(r.approved_at).toLocaleString() : ''}</div>
            </div>
          ) : (
            pending ? (
              <>
                <button className="btn success tiny" onClick={()=>act(r.id,'approved')}>Approve</button>
                <button className="btn danger tiny" onClick={()=>act(r.id,'rejected')}>Reject</button>
              </>
            ) : '-'
          )}
        </td>
      </tr>
    );
  }

  useEffect(()=>{ load(); },[]);

  return (
    <div id={id} className="tab-pane">
      <h2>📋 Schedule Requests</h2>
      <p>Approve or reject shift change and swap requests submitted by employees.</p>
      <div className="stats-bar">
        <div className="stat-chip">Pending: {stats.pending_count||0}</div>
        <div className="stat-chip">Approved: {stats.approved_count||0}</div>
        <div className="stat-chip">Shift Changes: {stats.total_shift_change||0}</div>
        <div className="stat-chip">Swaps: {stats.total_swap||0}</div>
        <button className="btn small" onClick={load}>🔄 Refresh</button>
        <button className="btn small" onClick={()=>setViewAll(!viewAll)}>{viewAll? 'Hide All':'View All'}</button>
      </div>

      {/* Filter Buttons */}
      <div className="filter-bar" style={{marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap'}}>
        <button 
          className={`btn small ${filter==='all'?'primary':''}`} 
          onClick={()=>setFilter('all')}
        >
          All Requests
        </button>
        <button 
          className={`btn small ${filter==='pending'?'primary':''}`} 
          onClick={()=>setFilter('pending')}
        >
          Pending
        </button>
        <button 
          className={`btn small ${filter==='approved'?'primary':''}`} 
          onClick={()=>setFilter('approved')}
        >
          Approved
        </button>
        <button 
          className={`btn small ${filter==='shift_change'?'primary':''}`} 
          onClick={()=>setFilter('shift_change')}
        >
          Shift Changes
        </button>
        <button 
          className={`btn small ${filter==='swap'?'primary':''}`} 
          onClick={()=>setFilter('swap')}
        >
          Swaps
        </button>
      </div>

      <h3>{filter === 'all' ? 'All Requests' : filter === 'pending' ? 'Pending Requests' : filter === 'approved' ? 'Approved Requests' : filter === 'shift_change' ? 'Shift Change Requests' : 'Swap Requests'}</h3>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th><th>Type</th><th>Team</th><th>Date</th><th>Shift(s)</th><th>Status</th><th>Reason</th><th>Created</th><th>Approved By</th>
            </tr>
          </thead>
          <tbody>
            {getFilteredRequests().length===0 && <tr><td colSpan={9}>No requests found</td></tr>}
            {getFilteredRequests().map(r=>renderRow(r, r.status==='pending'))}
          </tbody>
        </table>
      </div>
      {loading && <div className="inline-loading">Loading requests...</div>}
      <div className="note-box">
        Approving a shift change updates the admin schedule; approving a swap swaps the two employees’ shifts for that date.
      </div>
    </div>
  );
}