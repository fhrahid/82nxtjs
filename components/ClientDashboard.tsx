"use client";
import { useEffect, useState, useRef } from 'react';
import { ShiftChangeModal, SwapRequestModal } from './ShiftRequestsModals';
import StatCard from './Shared/StatCard';
import EmployeeSearch from './Shared/EmployeeSearch';
import ParticleBackground from './Shared/ParticleBackground';
import ShiftView from './ShiftView';
import MonthCompactCalendar from './Shared/MonthCompactCalendar'; // NEW: plain calendar (replacing colorful mini calendar)
import { SHIFT_MAP } from '@/lib/constants';
import { useTheme, themes } from '@/contexts/ThemeContext';
import { Palette } from 'lucide-react';

interface ScheduleData {
  employee: { name:string; id:string; team:string };
  today: { date:string; shift:string };
  tomorrow: { date:string; shift:string };
  upcoming_work_days: any[];
  planned_time_off: any[];
  shift_changes: any[];
  summary: { next_work_days_count:number; planned_time_off_count:number; shift_changes_count:number };
  success: boolean;
}

interface RequestHistory {
  id:string;
  type:'shift_change'|'swap';
  status:string;
  date:string;
  created_at:string;
  reason:string;
  requested_shift?:string;
  current_shift?:string;
  requester_shift?:string;
  target_shift?:string;
  requester_name?:string;
  target_employee_name?:string;
}

interface TeamMember {
  id: string;
  name: string;
  schedule: string[];
}

interface Props {
  employeeId: string;
  fullName: string;
  onLogout: ()=>void;
}

type ViewMode = 'self' | 'other';

function displayShift(code: string | undefined | null) {
  if (!code) return 'N/A';
  return SHIFT_MAP[code] || code;
}

export default function ClientDashboard({employeeId, fullName, onLogout}:Props) {
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [baseData,setBaseData]=useState<ScheduleData|null>(null);
  const [roster,setRoster]=useState<any>(null);
  const [requests,setRequests]=useState<RequestHistory[]>([]);
  const [selectedDate,setSelectedDate]=useState<string>('');
  const [selectedShift,setSelectedShift]=useState<string>(''); // raw code
  const [showChange,setShowChange]=useState(false);
  const [showSwap,setShowSwap]=useState(false);
  const [showShiftView,setShowShiftView]=useState(false);
  const [headers,setHeaders]=useState<string[]>([]);
  const [mySchedule,setMySchedule]=useState<string[]>([]);
  const [refreshing,setRefreshing]=useState(false);

  const [mode,setMode]=useState<ViewMode>('self');
  const [otherData,setOtherData]=useState<ScheduleData|null>(null);
  const [otherSchedule,setOtherSchedule]=useState<string[]>([]);
  const [approvedRequests,setApprovedRequests]=useState<RequestHistory[]>([]);
  const [showCalendar,setShowCalendar]=useState(false);
  const [rerenderKey,setRerenderKey]=useState(0);
  const lastActionRef = useRef<string>('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const { currentTheme, setTheme } = useTheme();
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // Close theme menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false);
      }
    }
    if (showThemeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showThemeMenu]);

  async function loadBaseSchedule() {
    console.debug('[Load] Base schedule for', employeeId);
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/my-schedule/${employeeId}`);
      const j = await res.json();
      if (!res.ok || !j.success) {
        setError(j.error||'Error loading schedule'); 
        setLoading(false); 
        return;
      }
      setBaseData(j);
    } catch(e:any) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function loadRoster() {
    try {
      const res = await fetch('/api/admin/get-display-data').then(r=>r.json());
      setRoster(res);
      setHeaders(res.headers||[]);
      const teamEntry = Object.entries(res.teams||{}).find(([,list]:any)=> list.some((e:any)=> e.id===employeeId));
      if (teamEntry) {
        const employees = teamEntry[1] as any[];
        const mine = employees.find((e:any)=>e.id===employeeId);
        if (mine) {
          setMySchedule(mine.schedule);
        }
        const tm: TeamMember[] = employees
          .filter((e:any)=> e.id !== employeeId)
          .map((e:any)=> ({ id: e.id, name: e.name, schedule: e.schedule || [] }));
        setTeamMembers(tm);
      } else {
        setTeamMembers([]);
      }
    } catch(e) {
      console.error('[Roster] load error', e);
      setTeamMembers([]);
    }
  }

  async function loadRequests() {
    try {
      const res = await fetch('/api/schedule-requests/get-employee-requests',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({employeeId})
      }).then(r=>r.json());

      if (res.success) {
        const sorted = res.requests.sort((a:any,b:any)=> (b.created_at || '').localeCompare(a.created_at||''));
        setRequests(sorted);
        const approved = sorted.filter((r: RequestHistory) => r.status === 'approved');
        setApprovedRequests(approved);
      }
    } catch(e) {
      console.error('[Requests] load error', e);
    }
  }

  async function refreshAll() {
    console.debug('[RefreshAll] start');
    setRefreshing(true);
    await Promise.all([loadBaseSchedule(), loadRoster(), loadRequests()]);
    setRefreshing(false);
    console.debug('[RefreshAll] done');
  }

  useEffect(()=>{ refreshAll(); },[employeeId]);

  function handleCalendarSelect(date: string) {
    setSelectedDate(date);
    // Determine shift code for whichever schedule is active
    const schedule = isOther ? otherSchedule : mySchedule;
    const idx = headers.indexOf(date);
    const shiftCode = idx >= 0 ? (schedule[idx] || '') : '';
    setSelectedShift(shiftCode);
  }

  function myShiftForDate(date:string) {
    const idx = headers.indexOf(date);
    if (idx === -1) return '';
    return mySchedule[idx] || '';
  }

  const handleEmployeeSearch = async (employee: any) => {
    if (!employee) return;
    if (employee.id === employeeId) {
      console.debug('[Search] Selected self -> resetting.');
      resetToMySchedule();
      return;
    }
    lastActionRef.current = `search:${employee.id}`;
    console.debug('[Search] Loading other employee:', employee.id);
    try {
      const res = await fetch(`/api/my-schedule/${employee.id}`);
      const j = await res.json();
      if (j.success) {
        setOtherData(j);
        setMode('other');
        if (roster?.teams) {
          for (const [, group] of Object.entries(roster.teams)) {
            const emp = (group as any[]).find((e: any) => e.id === employee.id);
            if (emp) {
              setOtherSchedule(emp.schedule);
              break;
            }
          }
        }
        setSelectedDate('');
        setSelectedShift('');
        setShowCalendar(false);
        console.debug('[Search] Now in OTHER mode');
      }
    } catch(e) {
      console.error('[Search] error loading other employee', e);
    }
  };

  const resetToMySchedule = () => {
    console.debug('[Reset] Back to MY schedule (mode self)');
    lastActionRef.current = 'reset';
    setMode('self');
    setOtherData(null);
    setOtherSchedule([]);
    setSelectedDate('');
    setSelectedShift('');
    setShowCalendar(false);
    setRerenderKey(k=>k+1);
    refreshAll();
  };

  useEffect(()=>{
    if (mode === 'other' && !otherData) {
      console.debug('[Guard] mode other but no otherData -> switching to self');
      setMode('self');
    }
  },[mode, otherData]);

  const isOther = mode === 'other' && !!otherData;
  const activeData = isOther && otherData ? otherData : baseData;
  const activeToday = isOther && otherData ? otherData.today : baseData?.today;
  const activeTomorrow = isOther && otherData ? otherData.tomorrow : baseData?.tomorrow;
  const activeScheduleArray = isOther ? otherSchedule : mySchedule;

  const getShiftChangeForDate = (date: string) => {
    if (!approvedRequests.length) return null;
    return approvedRequests.find(r => r.date === date && r.status === 'approved') || null;
  };

  const getAllEmployees = () => {
    if (!roster?.teams) return [];
    const employees: any[] = [];
    Object.entries(roster.teams).forEach(([teamName, teamEmployees]: [string, any]) => {
      (teamEmployees as any[]).forEach((emp: any) => {
        employees.push({ id: emp.id, name: emp.name, team: teamName });
      });
    });
    return employees;
  };

  return (
    <div className="container" data-view-mode={mode}>
      <ParticleBackground />
      <header style={{position: 'relative', zIndex: 1}}>
        <h1>🛒 Cartup CxP Roster Viewer 🛒</h1>
        <p className="subtitle">Employee Schedule Portal</p>
      </header>
      <div className="app-container" style={{position: 'relative', zIndex: 1}} key={rerenderKey}>
        <div className="app-header">
          <div>
            <h2>Shift Dashboard <small style={{fontSize:'.6rem', opacity:.6}}>mode:{mode}</small></h2>
            <div className="user-info" style={{display:'flex', flexDirection:'column', gap:6}}>
              <span>Welcome, <strong>{fullName}</strong> ({employeeId})</span>
              <div className="user-actions" style={{display:'flex', gap:10, flexWrap:'wrap'}}>
                <button className="logout-btn" onClick={onLogout}>Logout</button>
                <button className="btn small" onClick={refreshAll} disabled={refreshing}>
                  {refreshing ? 'Refreshing...' : '🔄 Refresh'}
                </button>
                {isOther && (
                  <button
                    className="btn small"
                    onClick={resetToMySchedule}
                    style={{background:'#0d3d74'}}
                  >
                    ← Back to My Schedule
                  </button>
                )}
                <div style={{position: 'relative'}} ref={themeMenuRef}>
                  <button 
                    className="btn small"
                    onClick={() => setShowThemeMenu(!showThemeMenu)}
                    style={{display: 'flex', alignItems: 'center', gap: 6}}
                  >
                    <Palette size={16} /> Theme
                  </button>
                  {showThemeMenu && (
                    <div 
                      className="theme-menu"
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: 8,
                        background: 'var(--theme-panel, #1A1F2E)',
                        border: '1px solid var(--theme-border, #2A3140)',
                        borderRadius: 8,
                        padding: 10,
                        minWidth: 200,
                        maxHeight: 400,
                        overflowY: 'auto',
                        zIndex: 1000,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                      }}
                    >
                      {themes.map(theme => (
                        <button
                          key={theme.id}
                          onClick={() => {
                            setTheme(theme.id);
                            setShowThemeMenu(false);
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '8px 12px',
                            textAlign: 'left',
                            background: currentTheme.id === theme.id ? 'var(--theme-primary, #4A7BD0)' : 'transparent',
                            color: currentTheme.id === theme.id ? '#fff' : 'var(--theme-text, #E5EAF0)',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            marginBottom: 4,
                            fontSize: '0.9rem'
                          }}
                        >
                          {theme.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="sync-controls">
            <div className="sync-status">
              {loading? 'Loading schedule...' : 'Schedule Loaded'}
            </div>
            <div style={{fontSize:'.55rem', letterSpacing:'.8px', textTransform:'uppercase', color:'#6E8298'}}>
              Select a date below to request a change or swap
            </div>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {!loading && activeData &&
          <>
            <div className="shifts-panel" style={{display:'block'}}>
              <div className="employee-header">
                <div>
                  <div className="employee-name">
                    {isOther ? otherData!.employee.name : baseData!.employee.name}
                  </div>
                  <div className="employee-id">
                    {isOther ? otherData!.employee.id : baseData!.employee.id}
                  </div>
                </div>
                <div className="employee-category">
                  {isOther ? otherData!.employee.team : baseData!.employee.team}
                </div>
              </div>

              <div className="shift-row">
                <div className="shift-label">
                  Today ({activeToday?.date || 'N/A'}):
                </div>
                <div className="shift-code">
                  {(() => {
                    const todayDate = activeToday?.date;
                    const todayShift = activeToday?.shift;
                    const change = !isOther && todayDate ? getShiftChangeForDate(todayDate) : null;
                    if (change) {
                      return (
                        <>
                          <span className="shift-previous">{change.current_shift || change.requester_shift}</span>
                          <span className="shift-current">{todayShift}</span>
                        </>
                      );
                    }
                    return todayShift;
                  })()}
                </div>
              </div>

              <div className="shift-row">
                <div className="shift-label">
                  Tomorrow ({activeTomorrow?.date || 'N/A'}):
                </div>
                <div className="shift-code">
                  {(() => {
                    const tomorrowDate = activeTomorrow?.date;
                    const tomorrowShift = activeTomorrow?.shift;
                    const change = !isOther && tomorrowDate ? getShiftChangeForDate(tomorrowDate) : null;
                    if (change) {
                      return (
                        <>
                          <span className="shift-previous">{change.current_shift || change.requester_shift}</span>
                          <span className="shift-current">{tomorrowShift}</span>
                        </>
                      );
                    }
                    return tomorrowShift;
                  })()}
                </div>
              </div>

              {selectedDate && (
                <div className="shift-row">
                  <div className="shift-label">Selected Date ({selectedDate}):</div>
                  <div className="shift-code">{displayShift(selectedShift) || 'N/A'}</div>
                </div>
              )}

              <div style={{marginTop: 14}}>
                {headers.length > 0 && activeScheduleArray.length > 0 && (
                  <div style={{marginBottom: 10}}>
                    <button 
                      className="btn small" 
                      onClick={() => setShowCalendar(!showCalendar)}
                      style={{marginBottom: 10}}
                    >
                      {showCalendar ? '📅 Hide Calendar' : '📅 Show Calendar'}
                    </button>
                    {showCalendar && (
                      <div className="plain-calendar-section" style={{maxWidth:400}}>
                        <MonthCompactCalendar
                          headers={headers}
                          selectedDate={selectedDate}
                          onSelect={(d)=>handleCalendarSelect(d)}
                          showWeekdays
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{display: 'flex', gap: '20px', marginTop: 14, flexWrap: 'wrap'}}>
                <div style={{flex: 1, minWidth: '260px'}}>
                  <div className="actions-row" style={{marginBottom: 10, flexWrap: 'wrap'}}>
                    {mode === 'self' && (
                      <>
                        <button className="btn primary small" onClick={()=>setShowChange(true)}>✏️ Request Shift Change</button>
                        <button className="btn small" onClick={()=>setShowSwap(true)}>🔁 Request Swap</button>
                        <button className="btn small" onClick={()=>setShowShiftView(true)}>👁️ Shift View</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {roster && getAllEmployees().length > 0 && (
              <div style={{marginTop: 20}}>
                <h3 style={{marginBottom: 10}}>Search Other Employees</h3>
                <EmployeeSearch 
                  employees={getAllEmployees()}
                  onSelect={handleEmployeeSearch}
                  placeholder="Search employees by name, ID, or team..."
                />
              </div>
            )}

            {baseData && (
              <div className="dashboard-stats">
                <StatCard
                  icon="📅"
                  value={baseData.summary.next_work_days_count}
                  label="Upcoming Days"
                  subtitle="Next 7 view"
                  details={baseData.upcoming_work_days}
                  detailsType="workdays"
                />
                <StatCard
                  icon="🏖️"
                  value={baseData.summary.planned_time_off_count}
                  label="Planned Time Off"
                  subtitle="30 days span"
                  details={baseData.planned_time_off}
                  detailsType="timeoff"
                />
                <StatCard
                  icon="🔄"
                  value={baseData.summary.shift_changes_count}
                  label="Shift Changes"
                  subtitle="Vs original"
                  details={baseData.shift_changes}
                  detailsType="changes"
                />
                {approvedRequests.length > 0 && (
                  <StatCard
                    icon="✅"
                    value={approvedRequests.length}
                    label="Approved Shifts"
                    subtitle="Approved requests"
                    details={approvedRequests.map(r => ({
                      date: r.date,
                      type: r.type,
                      original_shift: r.current_shift || r.requester_shift || 'N/A',
                      current_shift: r.requested_shift || r.target_shift || 'N/A'
                    }))}
                    detailsType="changes"
                  />
                )}
              </div>
            )}
          </>
        }
      </div>

      {baseData &&
        <ShiftChangeModal
          open={showChange}
          onClose={()=>setShowChange(false)}
          employeeId={employeeId}
          employeeName={baseData.employee.name}
          team={baseData.employee.team}
          date={selectedDate}
          currentShift={myShiftForDate(selectedDate)}
          headers={headers}
          mySchedule={mySchedule}
          onSubmitted={()=>{ loadRequests(); }}
        />
      }

      {baseData &&
        <SwapRequestModal
          open={showSwap}
          onClose={()=>setShowSwap(false)}
          requesterId={employeeId}
          requesterName={baseData.employee.name}
          team={baseData.employee.team}
          date={selectedDate}
          requesterShift={myShiftForDate(selectedDate)}
          headers={headers}
          mySchedule={mySchedule}
          teamMembers={teamMembers}
          onSubmitted={()=>{ loadRequests(); }}
        />
      }

      {roster && (
        <ShiftView
          open={showShiftView}
          onClose={()=>setShowShiftView(false)}
          roster={roster}
          headers={headers}
        />
      )}
    </div>
  );
}