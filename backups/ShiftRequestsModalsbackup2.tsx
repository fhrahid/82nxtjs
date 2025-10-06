"use client";
import Modal from './Shared/Modal';
import { useState, useEffect, useMemo } from 'react';
import MonthCompactCalendar from './Shared/MonthCompactCalendar';
import { SHIFT_MAP } from '@/lib/constants';

/**
 * Utility: map shift code to timing / friendly label.
 * Falls back to the raw code or 'N/A'.
 */
function displayShift(code: string | undefined | null) {
  if (!code || code === 'N/A') return 'N/A';
  return SHIFT_MAP[code] || code;
}

/* ------------------------------------------------------------------ */
/* SHIFT CHANGE MODAL                                                 */
/* ------------------------------------------------------------------ */
interface ShiftChangeProps {
  open: boolean;
  onClose: ()=>void;
  employeeId: string;
  employeeName: string;
  team: string;
  date?: string;
  currentShift?: string;          // optional pre-computed shift code for initial date
  onSubmitted: ()=>void;
  headers?: string[];             // full date headers (e.g. 1Oct,2Oct,...)
  mySchedule?: string[];          // parallel schedule array of shift codes for employee
}

export function ShiftChangeModal(props:ShiftChangeProps) {
  const {
    open,onClose,
    employeeId,employeeName,team,
    date,currentShift,onSubmitted,
    headers,mySchedule
  } = props;

  const [selectedDate, setSelectedDate] = useState<string>(date || '');
  const [requested,setRequested]=useState('');
  const [reason,setReason]=useState('');
  const [loading,setLoading]=useState(false);

  const shiftCodes = ['M2','M3','M4','D1','D2','DO','SL','CL','EL','HL'];

  // Derive current shift code from schedule if not provided
  const derivedCurrentShift = useMemo(()=>{
    if (currentShift) return currentShift;
    if (!headers || !mySchedule || !selectedDate) return '';
    const idx = headers.indexOf(selectedDate);
    if (idx === -1) return '';
    return mySchedule[idx] || '';
  },[currentShift, headers, mySchedule, selectedDate]);

  useEffect(() => {
    // Reset internal state when modal opens/closes or external date changes
    if (open) {
      if (date) setSelectedDate(date);
    } else {
      setRequested('');
      setReason('');
      setSelectedDate(date || '');
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
    // Clear fields after success
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
                // If changing date we also clear requested shift for clarity
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
            {displayShift(derivedCurrentShift) }
          </span>
        </div>
      )}

      <div className="form-group">
        <label>Requested Shift</label>
        <select
          value={requested}
            onChange={e=>setRequested(e.target.value)}
          >
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

/* ------------------------------------------------------------------ */
/* SHIFT SWAP MODAL                                                   */
/* ------------------------------------------------------------------ */
interface SwapRequestModalProps {
  open: boolean;
  onClose: ()=>void;
  requesterId: string;
  requesterName: string;
  team: string;
  date?: string;
  requesterShift?: string;        // initial shift code if pre-selected
  teamMembers?: { id:string; name:string }[];
  headers?: string[];
  mySchedule?: string[];
  onSubmitted: ()=>void;
}

export function SwapRequestModal(props:SwapRequestModalProps) {
  const {
    open,onClose,
    requesterId,requesterName,team,
    date,requesterShift,
    teamMembers,
    headers,mySchedule,
    onSubmitted
  } = props;

  const [selectedDate,setSelectedDate]=useState(date || '');
  const [targetEmployeeId,setTargetEmployeeId]=useState('');
  const [searchTerm,setSearchTerm]=useState('');
  const [reason,setReason]=useState('');
  const [loading,setLoading]=useState(false);

  // Derive requester current shift code for selected date
  const derivedRequesterShift = useMemo(()=>{
    if (requesterShift && date === selectedDate) return requesterShift;
    if (!headers || !mySchedule || !selectedDate) return '';
    const idx = headers.indexOf(selectedDate);
    if (idx === -1) return '';
    return mySchedule[idx] || '';
  },[requesterShift, date, selectedDate, headers, mySchedule]);

  // Compute selected target employee's shift on selected date (to show summary)
  const targetShift = useMemo(()=>{
    if (!selectedDate || !headers || !teamMembers || !targetEmployeeId || !rosterHasTeamMembers()) return '';
    const idx = headers.indexOf(selectedDate);
    if (idx === -1) return '';
    // attempt to find in roster structure
    for (const teamName of Object.keys(rosterTeams())) {
      const emp = rosterTeams()[teamName].find((e:any)=> e.id === targetEmployeeId);
      if (emp) {
        return emp.schedule[idx] || '';
      }
    }
    return '';
  },[selectedDate, headers, teamMembers, targetEmployeeId]);

  function rosterTeams() {
    // Defensive – will be passed via parent roster if needed (client dash passes teamMembers only though)
    // We rely solely on teamMembers for search; shift retrieval above attempts look into potential "roster" if injected
    // If not available, pass teamMembers with no schedule (can't show target schedule).
    // This function is a placeholder in case roster passed differently later.
    return (globalThis as any).__ROSTER_TEAMS__ || {};
  }

  function rosterHasTeamMembers() {
    return Object.keys(rosterTeams()).length > 0;
  }

  const filteredMembers = useMemo(()=>{
    if (!teamMembers) return [];
    if (!searchTerm) return teamMembers;
    return teamMembers.filter(m =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  },[teamMembers,searchTerm]);

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
    // clear
    setSelectedDate('');
    setTargetEmployeeId('');
    setReason('');
    setSearchTerm('');
  }

  useEffect(()=>{
    if (open && date) setSelectedDate(date);
    if (!open) {
      setTargetEmployeeId('');
      setReason('');
      setSearchTerm('');
    }
  },[open,date]);

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
                // Clear previous selection if changing date
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
          disabled={loading || !selectedDate || !targetEmployeeId || !reason}
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
          margin:12px 0 4px;
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
      `}</style>
    </Modal>
  );
}