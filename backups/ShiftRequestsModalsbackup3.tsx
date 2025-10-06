"use client";
import Modal from './Shared/Modal';
import { useState, useEffect, useMemo } from 'react';
import MonthCompactCalendar from './Shared/MonthCompactCalendar';
import { SHIFT_MAP } from '@/lib/constants';

/* =========================================================
   Utilities
   ========================================================= */
function displayShift(code: string | undefined | null) {
  if (!code || code === 'N/A') return 'N/A';
  return SHIFT_MAP[code] || code;
}

/* =========================================================
   Shift Change Modal
   ========================================================= */
interface ShiftChangeProps {
  open: boolean;
  onClose: ()=>void;
  employeeId: string;
  employeeName: string;
  team: string;
  date?: string;
  currentShift?: string;
  onSubmitted: ()=>void;
  headers?: string[];
  mySchedule?: string[];
}

export function ShiftChangeModal(props:ShiftChangeProps) {
  const {
    open,onClose,employeeId,employeeName,team,
    date,currentShift,onSubmitted,headers,mySchedule
  } = props;

  const [selectedDate, setSelectedDate] = useState<string>(date || '');
  const [requested,setRequested]=useState('');
  const [reason,setReason]=useState('');
  const [loading,setLoading]=useState(false);

  const shiftCodes = ['M2','M3','M4','D1','D2','DO','SL','CL','EL','HL'];

  const derivedCurrentShift = useMemo(()=>{
    if (currentShift && date === selectedDate) return currentShift;
    if (!headers || !mySchedule || !selectedDate) return '';
    const idx = headers.indexOf(selectedDate);
    if (idx === -1) return '';
    return mySchedule[idx] || '';
  },[currentShift, headers, mySchedule, selectedDate, date]);

  useEffect(() => {
    if (open) {
      if (date) setSelectedDate(date);
    } else {
      setRequested('');
      setReason('');
    }
  }, [open, date]);

  async function submit() {
    if (!requested || !reason || !selectedDate) return;
    setLoading(true);
    const res = await fetch('/api/schedule-requests/submit-shift-change',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        employeeId,
        employeeName,
        team,
        date: selectedDate,
        currentShift: derivedCurrentShift,
        requestedShift: requested,
        reason
      })
    }).then(r=>r.json());
    setLoading(false);
    if (!res.success) {
      alert(res.error || 'Request failed');
      return;
    }
    onSubmitted();
    onClose();
    setRequested('');
    setReason('');
  }

  return (
    <Modal open={open} onClose={onClose} title="Request Shift Change">
      <div className="modal-info-card">
        <div className="modal-info-row">
          <span className="modal-info-label">Employee:</span>
          <span className="modal-info-value">{employeeName} ({employeeId})</span>
        </div>
        <div className="modal-info-row">
          <span className="modal-info-label">Team:</span>
          <span className="modal-info-value">{team}</span>
        </div>
      </div>

      <div className="form-group">
        <label>Select Date</label>
        {headers && headers.length > 0 ? (
          <div className="calendar-wrapper-block">
            <MonthCompactCalendar
              headers={headers}
              selectedDate={selectedDate}
              onSelect={(d)=> {
                setSelectedDate(d);
                setRequested('');
              }}
              showWeekdays
            />
          </div>
        ) : (
          <input type="text" value={selectedDate} disabled />
        )}
      </div>

      {selectedDate && (
        <div className="shift-info-display">
          <span className="shift-info-label">Your Shift:</span>
          <span className="shift-info-badge" title={derivedCurrentShift || 'N/A'}>
            {displayShift(derivedCurrentShift)}
          </span>
        </div>
      )}

      <div className="form-group">
        <label>Requested Shift</label>
        <select value={requested} onChange={e=>setRequested(e.target.value)}>
          <option value="">Select...</option>
          {shiftCodes.map(c=> <option key={c} value={c}>{c} ({displayShift(c)})</option>)}
        </select>
      </div>

      <div className="form-group">
        <label>Reason</label>
        <textarea
          rows={3}
          value={reason}
          onChange={e=>setReason(e.target.value)}
          placeholder="Explain your need..."
        />
      </div>

      <div className="actions-row" style={{marginTop:14}}>
        <button
          className="btn primary"
          disabled={loading || !selectedDate || !requested || !reason}
          onClick={submit}
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
        <button className="btn" onClick={onClose} disabled={loading}>Cancel</button>
      </div>

      <style jsx>{`
        .calendar-wrapper-block {
          border:1px solid #2a3a4a;
          padding:10px 12px 14px;
          border-radius:10px;
          background:#131c26;
        }
        .shift-info-display {
          display:flex;
          align-items:center;
          gap:10px;
          margin:10px 0 6px;
          font-size:.85rem;
        }
        .shift-info-label {
          color:#8fa4b8;
          letter-spacing:.5px;
        }
        .shift-info-badge {
          background:#27476d;
          color:#fff;
          padding:4px 10px;
          border-radius:16px;
          font-size:.65rem;
          letter-spacing:.5px;
          font-weight:600;
          display:inline-flex;
          align-items:center;
        }
      `}</style>
    </Modal>
  );
}

/* =========================================================
   Shift Swap Modal
   ========================================================= */
interface TeamMember {
  id: string;
  name: string;
  schedule: string[]; // shift codes in parallel with headers
}

interface SwapRequestModalProps {
  open: boolean;
  onClose: ()=>void;
  requesterId: string;
  requesterName: string;
  team: string;
  date?: string;
  requesterShift?: string;
  headers?: string[];
  mySchedule?: string[];
  teamMembers?: TeamMember[];  // same team members (excluding requester)
  onSubmitted: ()=>void;
}

export function SwapRequestModal(props:SwapRequestModalProps) {
  const {
    open,onClose,
    requesterId,requesterName,team,
    date,requesterShift,
    headers,mySchedule,teamMembers,
    onSubmitted
  } = props;

  const [selectedDate,setSelectedDate]=useState<string>(date || '');
  const [searchTerm,setSearchTerm]=useState('');
  const [targetEmployeeId,setTargetEmployeeId]=useState('');
  const [reason,setReason]=useState('');
  const [loading,setLoading]=useState(false);

  // Derive requester's shift for selected date
  const derivedRequesterShift = useMemo(()=>{
    if (requesterShift && date === selectedDate) return requesterShift;
    if (!headers || !mySchedule || !selectedDate) return '';
    const idx = headers.indexOf(selectedDate);
    if (idx === -1) return '';
    return mySchedule[idx] || '';
  },[requesterShift, date, selectedDate, headers, mySchedule]);

  // get target member object
  const targetMember = useMemo(()=>{
    if (!teamMembers || !targetEmployeeId) return null;
    return teamMembers.find(m=>m.id===targetEmployeeId) || null;
  },[teamMembers,targetEmployeeId]);

  const targetShift = useMemo(()=>{
    if (!targetMember || !headers || !selectedDate) return '';
    const idx = headers.indexOf(selectedDate);
    if (idx === -1) return '';
    return targetMember.schedule[idx] || '';
  },[targetMember, headers, selectedDate]);

  // Filter members by searchTerm
  const filteredMembers = useMemo(()=>{
    if (!teamMembers) return [];
    if (!searchTerm) return teamMembers;
    return teamMembers.filter(m =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  },[teamMembers,searchTerm]);

  useEffect(()=>{
    if (open && date) setSelectedDate(date);
    if (!open) {
      setTargetEmployeeId('');
      setReason('');
      setSearchTerm('');
    }
  },[open,date]);

  async function submit() {
    if (!selectedDate || !targetEmployeeId || !reason) return;
    setLoading(true);
    const res = await fetch('/api/schedule-requests/submit-swap',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        requesterId,
        requesterName,
        team,
        date: selectedDate,
        requesterShift: derivedRequesterShift,
        targetEmployeeId,
        targetShift,
        reason
      })
    }).then(r=>r.json());
    setLoading(false);
    if (!res.success) {
      alert(res.error || 'Swap request failed');
      return;
    }
    onSubmitted();
    onClose();
    setSelectedDate('');
    setTargetEmployeeId('');
    setReason('');
    setSearchTerm('');
  }

  const canSubmit = selectedDate && targetEmployeeId && reason && !loading;

  return (
    <Modal open={open} onClose={onClose} title="Request Shift Swap">
      <div className="modal-info-card">
        <div className="modal-info-row">
          <span className="modal-info-label">Requester:</span>
          <span className="modal-info-value">{requesterName} ({requesterId})</span>
        </div>
        <div className="modal-info-row">
          <span className="modal-info-label">Team:</span>
          <span className="modal-info-value">{team}</span>
        </div>
      </div>

      <div className="form-group">
        <label>Select Date</label>
        {headers && headers.length > 0 ? (
          <div className="calendar-wrapper-block">
            <MonthCompactCalendar
              headers={headers}
              selectedDate={selectedDate}
              onSelect={(d)=>{
                setSelectedDate(d);
                // reset target when date changes
                setTargetEmployeeId('');
              }}
              showWeekdays
            />
          </div>
        ) : (
          <input type="text" disabled value={selectedDate} />
        )}
      </div>

      {selectedDate && (
        <div className="swap-current-shift-row">
          <span className="swap-label">Your Shift:</span>
          <span className="swap-pill" title={derivedRequesterShift || 'N/A'}>
            {displayShift(derivedRequesterShift)}
          </span>
          {targetEmployeeId && (
            <>
              <span className="swap-label" style={{marginLeft:10}}>Their Shift:</span>
              <span className="swap-pill alt" title={targetShift || 'N/A'}>
                {displayShift(targetShift)}
              </span>
            </>
          )}
        </div>
      )}

      {selectedDate && targetEmployeeId && (
        <div className="swap-summary-box">
          <div className="swap-summary-title">Swap Summary (Selected Date)</div>
          <div className="swap-summary-row">
            <div className="swap-summary-col">
              <span className="swap-summary-label">You Currently:</span>
              <span className="swap-summary-value">{displayShift(derivedRequesterShift)}</span>
            </div>
            <div className="swap-summary-col">
              <span className="swap-summary-label">They Currently:</span>
              <span className="swap-summary-value">{displayShift(targetShift)}</span>
            </div>
          </div>
          <div className="swap-summary-row">
            <div className="swap-summary-col">
              <span className="swap-summary-label">After Swap (You):</span>
              <span className="swap-summary-value alt">{displayShift(targetShift)}</span>
            </div>
            <div className="swap-summary-col">
              <span className="swap-summary-label">After Swap (Them):</span>
              <span className="swap-summary-value alt">{displayShift(derivedRequesterShift)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="form-group">
        <label>Search Team Member</label>
        <input
          type="text"
          value={searchTerm}
          placeholder="Search by name or ID..."
          onChange={e=>setSearchTerm(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Swap With</label>
        <select
          value={targetEmployeeId}
          onChange={e=>setTargetEmployeeId(e.target.value)}
        >
          <option value="">Select team member...</option>
          {filteredMembers.map(m=>(
            <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
          ))}
        </select>
        {!teamMembers?.length && (
          <div className="inline-hint" style={{marginTop:6,fontSize:'.65rem',color:'#8796a8'}}>
            No team members loaded. Ensure ClientDashboard passes teamMembers prop.
          </div>
        )}
      </div>

      <div className="form-group">
        <label>Reason</label>
        <textarea
          rows={3}
          value={reason}
          onChange={e=>setReason(e.target.value)}
          placeholder="Why do you need this swap?"
        />
      </div>

      <div className="actions-row" style={{marginTop:14}}>
        <button
          className="btn primary"
          disabled={!canSubmit}
          onClick={submit}
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
        <button className="btn" disabled={loading} onClick={onClose}>Cancel</button>
      </div>

      <style jsx>{`
        .calendar-wrapper-block {
          border:1px solid #2a3a4a;
          padding:10px 12px 14px;
          border-radius:10px;
          background:#131c26;
        }
        .swap-current-shift-row {
          display:flex;
          align-items:center;
          gap:6px;
          margin:12px 0 10px;
          font-size:.85rem;
          flex-wrap:wrap;
        }
        .swap-label {
          color:#8fa4b8;
          letter-spacing:.5px;
        }
        .swap-pill {
          background:#2b4f78;
          color:#fff;
          padding:4px 11px;
          border-radius:16px;
          font-size:.65rem;
          font-weight:600;
          letter-spacing:.4px;
        }
        .swap-pill.alt {
          background:#4b5d74;
        }
        .swap-summary-box {
          background:#16202b;
          border:1px solid #243240;
          border-radius:10px;
          padding:12px 14px 14px;
          margin-bottom:14px;
        }
        .swap-summary-title {
          font-size:.65rem;
          letter-spacing:.6px;
          color:#94a9bc;
          font-weight:600;
          margin-bottom:8px;
          text-transform:uppercase;
        }
        .swap-summary-row {
          display:flex;
          flex-wrap:wrap;
          gap:18px;
          margin-bottom:6px;
        }
        .swap-summary-col {
          display:flex;
          gap:6px;
          align-items:center;
          font-size:.7rem;
        }
        .swap-summary-label {
          color:#7f93a5;
          letter-spacing:.4px;
        }
        .swap-summary-value {
          background:#284765;
          padding:4px 10px;
          border-radius:14px;
          color:#fff;
          font-size:.65rem;
          font-weight:600;
        }
        .swap-summary-value.alt {
          background:#335c86;
        }
      `}</style>
    </Modal>
  );
}