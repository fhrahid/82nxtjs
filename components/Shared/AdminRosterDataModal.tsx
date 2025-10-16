"use client";
import { useState, useMemo, useEffect } from 'react';
import Modal from './Modal';
import { SHIFT_MAP } from '@/lib/constants';

interface Employee {
  id: string;
  name: string;
  schedule: string[];
  team?: string;
  [k:string]: any;
}

interface Props {
  open: boolean;
  onClose: () => void;
  headers: string[];
  teams: Record<string, Employee[]>;
  onUpdateShift: (employeeId: string, dateIndex: number, newShift: string) => Promise<void>;
}

const SHIFT_OPTIONS = ['M2', 'M3', 'M4', 'D1', 'D2', 'DO', 'SL', 'CL', 'EL', 'HL'];

const MONTH_MAP: Record<string, number> = {
  jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11
};
const MONTH_NAME: Record<number,string> = {
  0:"Jan",1:"Feb",2:"Mar",3:"Apr",4:"May",5:"Jun",6:"Jul",7:"Aug",8:"Sep",9:"Oct",10:"Nov",11:"Dec"
};

function detectMonth(headers: string[]): {monthIndex:number, name:string}|null {
  for (const h of headers) {
    const m = h.match(/[A-Za-z]+$/);
    if (m) {
      const key = m[0].slice(0,3).toLowerCase();
      if (MONTH_MAP[key] !== undefined) {
        const idx = MONTH_MAP[key];
        return {monthIndex: idx, name: MONTH_NAME[idx]};
      }
    }
  }
  return null;
}

function detectAvailableMonths(headers: string[]): Set<string> {
  const months = new Set<string>();
  for (const h of headers) {
    const m = h.match(/[A-Za-z]+$/);
    if (m) {
      const key = m[0].slice(0,3).toLowerCase();
      if (MONTH_MAP[key] !== undefined) {
        months.add(key);
      }
    }
  }
  return months;
}

export default function AdminRosterDataModal({ open, onClose, headers, teams, onUpdateShift }: Props) {
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [monthOffset, setMonthOffset] = useState(0); // Start with current month
  const [editingCell, setEditingCell] = useState<{empId: string, dateIdx: number} | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingTeam, setEditingTeam] = useState<{empId: string, currentTeam: string} | null>(null);
  const [localSchedule, setLocalSchedule] = useState<Record<string, string[]>>({});
  
  // Reset monthOffset to 0 when modal opens (current month)
  useEffect(() => {
    if (open) {
      setMonthOffset(0);
    }
  }, [open]);

  const teamNames = useMemo(() => Object.keys(teams || {}), [teams]);

  // Initialize local schedule from teams data
  useEffect(() => {
    const initial: Record<string, string[]> = {};
    Object.values(teams || {}).forEach(empList => {
      empList.forEach(emp => {
        initial[emp.id] = [...emp.schedule];
      });
    });
    setLocalSchedule(initial);
  }, [teams]);

  const toggleTeam = (team: string) => {
    setSelectedTeams(prev => 
      prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]
    );
  };

  const selectAllTeams = () => {
    setSelectedTeams(teamNames);
  };

  const clearAllTeams = () => {
    setSelectedTeams([]);
  };

  // Calculate the current month being displayed
  const { displayHeaders, displayMonthName, displayDates, canGoPrev, canGoNext } = useMemo(() => {
    const det = detectMonth(headers);
    const availableMonths = detectAvailableMonths(headers);
    const now = new Date();
    let year = now.getFullYear();
    // Always start from current month and apply offset
    let monthIndex = now.getMonth() + monthOffset;
    
    // Adjust year if month goes outside 0-11 range
    while (monthIndex < 0) {
      monthIndex += 12;
      year -= 1;
    }
    while (monthIndex > 11) {
      monthIndex -= 12;
      year += 1;
    }
    
    const monthName = MONTH_NAME[monthIndex];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentMonthKey = monthName.toLowerCase().slice(0, 3);
    
    // Filter headers to only show the current month
    const displayHeaders = headers.filter(h => {
      const m = h.match(/[A-Za-z]+$/);
      if (m) {
        const key = m[0].slice(0,3).toLowerCase();
        return key === currentMonthKey;
      }
      return false;
    });

    // Create display dates with full formatting
    const displayDates = displayHeaders.map(h => {
      const dayMatch = h.match(/^(\d+)/);
      const day = dayMatch ? parseInt(dayMatch[1]) : 0;
      const date = new Date(year, monthIndex, day);
      const dayName = dayNames[date.getDay()];
      return {
        header: h,
        dayName,
        dateStr: `${day} ${monthNames[monthIndex]}`,
        day
      };
    });
    
    // Check if previous/next months have data in headers
    const prevMonthIndex = monthIndex === 0 ? 11 : monthIndex - 1;
    const nextMonthIndex = monthIndex === 11 ? 0 : monthIndex + 1;
    const prevMonthKey = MONTH_NAME[prevMonthIndex].toLowerCase().slice(0, 3);
    const nextMonthKey = MONTH_NAME[nextMonthIndex].toLowerCase().slice(0, 3);
    
    const canGoPrev = availableMonths.has(prevMonthKey);
    const canGoNext = availableMonths.has(nextMonthKey);

    return {
      displayHeaders,
      displayMonthName: `${monthNames[monthIndex]} ${year}`,
      displayDates,
      canGoPrev,
      canGoNext
    };
  }, [headers, monthOffset]);

  const filteredEmployees = useMemo(() => {
    if (!teams) return [];
    
    const allEmployees: (Employee & {teamName: string})[] = [];
    Object.entries(teams).forEach(([teamName, employees]) => {
      if (selectedTeams.length === 0 || selectedTeams.includes(teamName)) {
        employees.forEach(emp => {
          allEmployees.push({...emp, teamName});
        });
      }
    });
    
    return allEmployees;
  }, [teams, selectedTeams]);

  function displayShift(code: string): string {
    if (!code || code === '') return '-';
    return SHIFT_MAP[code] || code;
  }

  function handleCellClick(empId: string, dateIdx: number) {
    setEditingCell({empId, dateIdx});
  }

  async function handleShiftSelect(shift: string) {
    if (!editingCell) return;
    
    setSaving(true);
    try {
      await onUpdateShift(editingCell.empId, editingCell.dateIdx, shift);
      
      // Update local schedule immediately for instant UI update
      setLocalSchedule(prev => ({
        ...prev,
        [editingCell.empId]: prev[editingCell.empId].map((s, idx) => 
          idx === editingCell.dateIdx ? shift : s
        )
      }));
      
      setEditingCell(null);
    } catch (e) {
      alert('Failed to update shift');
      console.error(e);
    }
    setSaving(false);
  }

  async function handleTeamChange(empId: string, newTeam: string) {
    // This would need an API endpoint to update employee team
    alert(`Team change feature needs API endpoint: ${empId} -> ${newTeam}`);
    setEditingTeam(null);
  }

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Admin Roster Data" width="95vw">
      <div style={{padding: '20px'}}>
        <p style={{marginBottom: '15px', color: 'var(--theme-text-dim)'}}>
          View and edit roster data for all employees. Click on any cell to change a shift.
        </p>

        {/* Team Filters */}
        <div style={{marginBottom: '20px'}}>
          <div style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: '10px'
          }}>
            <strong>Team Filters:</strong>
            {teamNames.map(team => (
              <button
                key={team}
                className={`sv-chip ${selectedTeams.includes(team) ? 'active' : ''}`}
                onClick={() => toggleTeam(team)}
                style={{padding: '6px 12px', fontSize: '0.85rem'}}
              >
                {team}
              </button>
            ))}
            <button className="btn tiny" onClick={selectAllTeams}>Select All</button>
            <button className="btn tiny" onClick={clearAllTeams}>Clear All</button>
          </div>
        </div>

        {/* Month Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          padding: '10px',
          background: 'var(--theme-card-bg)',
          borderRadius: '8px'
        }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
            <button
              className="btn"
              onClick={() => setMonthOffset(monthOffset - 1)}
              disabled={!canGoPrev}
            >
              ← Previous
            </button>
            <strong style={{fontSize: '1.1rem'}}>{displayMonthName}</strong>
            <button
              className="btn"
              onClick={() => setMonthOffset(monthOffset + 1)}
              disabled={!canGoNext}
            >
              Next →
            </button>
          </div>
          
          {/* Schedule Information */}
          <div style={{
            display: 'flex',
            gap: '15px',
            fontSize: '0.85rem',
            color: 'var(--theme-text-dim)'
          }}>
            <div><strong>{filteredEmployees.length}</strong> Employees</div>
            <div><strong>{displayDates.length}</strong> Days</div>
          </div>
        </div>

        {/* Roster Grid */}
        <div style={{overflowX: 'auto', overflowY: 'auto', maxHeight: '500px'}}>
          <table className="data-table" style={{minWidth: '100%'}}>
            <thead style={{position: 'sticky', top: 0, background: 'var(--theme-bg)', zIndex: 10}}>
              <tr>
                <th style={{position: 'sticky', left: 0, zIndex: 11, background: 'var(--theme-card-bg)', minWidth: '220px'}}>
                  Employee
                </th>
                {displayDates.map((d, idx) => (
                  <th key={idx} style={{minWidth: '90px', textAlign: 'center', padding: '6px 4px'}}>
                    <div style={{fontSize: '0.75rem', fontWeight: 'bold'}}>{d.dayName}</div>
                    <div style={{fontSize: '0.7rem', color: 'var(--theme-text-dim)'}}>{d.dateStr}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(emp => (
                <tr key={emp.id}>
                  <td style={{position: 'sticky', left: 0, background: 'var(--theme-card-bg)', zIndex: 5, minWidth: '220px'}}>
                    <div style={{fontWeight: 'bold'}}>{emp.name}</div>
                    <div style={{fontSize: '0.8rem', color: 'var(--theme-text-dim)'}}>
                      {emp.id}
                      {emp.teamName && (
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTeam({empId: emp.id, currentTeam: emp.teamName});
                          }}
                          style={{
                            marginLeft: '8px',
                            padding: '2px 6px',
                            background: 'var(--theme-primary)',
                            color: 'white',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                          title="Click to change team"
                        >
                          {emp.teamName}
                        </span>
                      )}
                    </div>
                  </td>
                  {displayHeaders.map((header, dateIdx) => {
                    const headerIdx = headers.indexOf(header);
                    const shift = localSchedule[emp.id]?.[headerIdx] || emp.schedule[headerIdx] || '';
                    const isEditing = editingCell?.empId === emp.id && editingCell?.dateIdx === headerIdx;
                    
                    return (
                      <td 
                        key={dateIdx} 
                        style={{
                          textAlign: 'center',
                          cursor: saving ? 'wait' : 'pointer',
                          position: 'relative',
                          background: shift ? 'var(--theme-success-dim, rgba(76, 175, 80, 0.1))' : 'transparent'
                        }}
                        onClick={() => !saving && handleCellClick(emp.id, headerIdx)}
                      >
                        <div style={{fontSize: '0.9rem'}}>
                          {displayShift(shift)}
                        </div>
                        
                        {isEditing && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'var(--theme-card-bg)',
                            border: '2px solid var(--theme-primary)',
                            borderRadius: '8px',
                            padding: '10px',
                            zIndex: 100,
                            minWidth: '180px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                          }}>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '8px'
                            }}>
                              {SHIFT_OPTIONS.map(opt => (
                                <button
                                  key={opt}
                                  className="btn tiny"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShiftSelect(opt);
                                  }}
                                  style={{
                                    padding: '6px',
                                    fontSize: '0.75rem',
                                    whiteSpace: 'nowrap'
                                  }}
                                  disabled={saving}
                                >
                                  {opt}
                                </button>
                              ))}
                              <button
                                className="btn tiny"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShiftSelect('');
                                }}
                                style={{
                                  padding: '6px',
                                  fontSize: '0.75rem',
                                  gridColumn: 'span 2',
                                  background: '#ff6b6b'
                                }}
                                disabled={saving}
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'flex-end',
          marginTop: '20px',
          padding: '15px',
          borderTop: '1px solid var(--theme-border)',
          position: 'sticky',
          bottom: 0,
          background: 'var(--theme-bg)'
        }}>
          <button className="btn" onClick={onClose} disabled={saving}>
            Close
          </button>
        </div>
      </div>

      {/* Click outside to close editing cell */}
      {editingCell && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99
          }}
          onClick={() => !saving && setEditingCell(null)}
        />
      )}

      {/* Team Change Modal */}
      {editingTeam && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--theme-card-bg)',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '400px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
          }}>
            <h3 style={{marginTop: 0, marginBottom: '16px'}}>Change Team</h3>
            <p style={{color: 'var(--theme-text-dim)', marginBottom: '16px'}}>
              Select new team for this employee:
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '20px'
            }}>
              {teamNames.filter(t => t !== editingTeam.currentTeam).map(team => (
                <button
                  key={team}
                  className="btn"
                  onClick={() => handleTeamChange(editingTeam.empId, team)}
                  style={{padding: '10px'}}
                >
                  {team}
                </button>
              ))}
            </div>
            <button
              className="btn"
              onClick={() => setEditingTeam(null)}
              style={{width: '100%'}}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
