"use client";
import Modal from './Shared/Modal';
import { useState, useEffect, useMemo, useRef } from 'react';
import MonthCompactCalendar from './Shared/MonthCompactCalendar';
import { SHIFT_MAP } from '@/lib/constants';

/* =========================================================
   Shared Utilities
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
   Shift Swap Modal (with live search suggestions)
   ========================================================= */
interface TeamMember {
  id: string;
  name: string;
  schedule: string[];   // must align with headers
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
  teamMembers?: TeamMember[];     // provided by ClientDashboard
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

  const [showSuggestions,setShowSuggestions]=useState(false);
  const searchInputRef = useRef<HTMLInputElement|null>(null);
  const suggestionRef = useRef<HTMLDivElement|null>(null);
  const [highlightIndex,setHighlightIndex]=useState(-1);

  // Requester's shift code for selected date
  const derivedRequesterShift = useMemo(()=>{
    if (requesterShift && date === selectedDate) return requesterShift;
    if (!headers || !mySchedule || !selectedDate) return '';
    const idx = headers.indexOf(selectedDate);
    if (idx === -1) return '';
    return mySchedule[idx] || '';
  },[requesterShift, date, selectedDate, headers, mySchedule]);

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

  // Filter members by searchTerm (live)
  const filteredMembers = useMemo(()=>{
    if (!teamMembers) return [];
    if (!searchTerm.trim()) return teamMembers;
    const term = searchTerm.toLowerCase();
    return teamMembers.filter(m =>
      m.name.toLowerCase().includes(term) ||
      m.id.toLowerCase().includes(term)
    );
  },[teamMembers,searchTerm]);

  const canSubmit = selectedDate && targetEmployeeId && reason && !loading;

  useEffect(()=>{
    if (open && date) setSelectedDate(date);
    if (!open) {
      setTargetEmployeeId('');
      setReason('');
      setSearchTerm('');
      setShowSuggestions(false);
      setHighlightIndex(-1);
    }
  },[open,date]);

  // Close suggestions on outside click
  useEffect(()=>{
    function onDocClick(e:MouseEvent) {
      if (!showSuggestions) return;
      const target = e.target as Node;
      if (
        suggestionRef.current &&
        !suggestionRef.current.contains(target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(target)
      ) {
        setShowSuggestions(false);
        setHighlightIndex(-1);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return ()=> document.removeEventListener('mousedown', onDocClick);
  },[showSuggestions]);

  function handleSelectMember(id: string) {
    setTargetEmployeeId(id);
    setSearchTerm('');
    setShowSuggestions(false);
    setHighlightIndex(-1);
  }

  function onKeyDown(e:React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(i=> Math.min(filteredMembers.length-1, i+1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(i=> Math.max(0, i-1));
    } else if (e.key === 'Enter') {
      if (highlightIndex >=0 && highlightIndex < filteredMembers.length) {
        e.preventDefault();
        handleSelectMember(filteredMembers[highlightIndex].id);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightIndex(-1);
    }
  }

  async function submit() {
    if (!canSubmit) return;
    setLoading(true);
    const res = await fetch('/api/schedule-requests/submit-swap-request',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        requesterId,
        requesterName,
        targetEmployeeId,
        targetEmployeeName: targetMember?.name || '',
        team,
        date: selectedDate,
        requesterShift: derivedRequesterShift,
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
    setShowSuggestions(false);
    setHighlightIndex(-1);
  }

  return (
    <Modal open={open} onClose={onClose} title="Request Shift Swap">
      {/* Info */}
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

      {/* Date / Calendar */}
      <div className="form-group">
        <label>Select Date</label>
        {headers && headers.length > 0 ? (
          <div className="calendar-wrapper-block">
            <MonthCompactCalendar
              headers={headers}
              selectedDate={selectedDate}
              onSelect={(d)=>{
                setSelectedDate(d);
                setTargetEmployeeId('');
              }}
              showWeekdays
            />
          </div>
        ) : (
          <input type="text" disabled value={selectedDate} />
        )}
      </div>

      {/* Current vs Target Shifts */}
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

      {/* Swap Summary */}
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

      {/* Live Search */}
      <div className="form-group">
        <label>Search Team Member</label>
        <div style={{position:'relative'}}>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by name or ID..."
            value={searchTerm}
            onFocus={()=> setShowSuggestions(true)}
            onChange={e=>{
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
              setHighlightIndex(-1);
            }}
            onKeyDown={onKeyDown}
          />
          {showSuggestions && filteredMembers.length > 0 && (
            <div
              ref={suggestionRef}
              className="swap-suggestions"
              role="listbox"
            >
              {filteredMembers.slice(0,12).map((m,idx)=>(
                <button
                  key={m.id}
                  role="option"
                  className={`swap-suggestion-item ${highlightIndex===idx?'highlight':''}`}
                  onMouseDown={(e)=>{
                    // prevent input blur before click
                    e.preventDefault();
                    handleSelectMember(m.id);
                  }}
                  onMouseEnter={()=>setHighlightIndex(idx)}
                >
                  <span className="ss-name">{m.name}</span>
                  <span className="ss-id">{m.id}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Member “Pick / Clear” Fallback */}
      <div className="form-group">
        <label>Selected Team Member</label>
        {targetEmployeeId ? (
          <div className="selected-member-line">
            <span>
              {targetMember?.name} ({targetMember?.id})
            </span>
            <button
              className="btn tiny"
              style={{marginLeft:10}}
              onClick={()=>{
                setTargetEmployeeId('');
                setShowSuggestions(true);
              }}
            >Clear</button>
          </div>
        ) : (
          <div className="inline-hint" style={{fontSize:'.65rem', color:'#8796a8'}}>
            No team member chosen yet. Type above to search & select.
          </div>
        )}
      </div>

      {/* Reason */}
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
        .swap-suggestions {
          position:absolute;
          top:100%;
          left:0;
          right:0;
          background:#161f29;
          border:1px solid #2a3947;
          border-radius:8px;
          margin-top:4px;
          max-height:250px;
          overflow-y:auto;
          z-index:50;
          padding:4px;
          box-shadow:0 6px 18px -4px rgba(0,0,0,.55);
        }
        .swap-suggestion-item {
          width:100%;
          text-align:left;
          background:transparent;
          border:0;
          padding:6px 10px 8px;
          border-radius:6px;
          cursor:pointer;
          display:flex;
          flex-direction:column;
          gap:2px;
          font-size:.68rem;
          color:#d0dae4;
          transition:.13s;
        }
        .swap-suggestion-item:hover,
        .swap-suggestion-item.highlight {
          background:#233244;
        }
        .ss-name { font-weight:600; font-size:.7rem; }
        .ss-id { font-size:.58rem; color:#8aa0b4; letter-spacing:.4px; }
        .selected-member-line {
          display:flex;
          align-items:center;
          font-size:.75rem;
          background:#182430;
          padding:8px 12px;
          border:1px solid #263444;
          border-radius:8px;
          color:#d2dde7;
        }
      `}</style>
    </Modal>
  );
}