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
  const [monthOffset, setMonthOffset] = useState(0);
  const [editingCell, setEditingCell] = useState<{empId: string, dateIdx: number} | null>(null);
  const [saving, setSaving] = useState(false);

  const teamNames = useMemo(() => Object.keys(teams || {}), [teams]);

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
    let monthIndex = det ? det.monthIndex : now.getMonth();
    
    // Apply month offset
    monthIndex += monthOffset;
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
      setEditingCell(null);
    } catch (e) {
      alert('Failed to update shift');
      console.error(e);
    }
    setSaving(false);
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
          justifyContent: 'center',
          gap: '15px',
          marginBottom: '20px',
          padding: '10px',
          background: 'var(--theme-card-bg)',
          borderRadius: '8px'
        }}>
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

        {/* Roster Grid */}
        <div style={{overflowX: 'auto', overflowY: 'auto', maxHeight: '500px'}}>
          <table className="data-table" style={{minWidth: '100%'}}>
            <thead style={{position: 'sticky', top: 0, background: 'var(--theme-bg)', zIndex: 2}}>
              <tr>
                <th style={{position: 'sticky', left: 0, zIndex: 3, background: 'var(--theme-card-bg)'}}>
                  Employee
                </th>
                {displayDates.map((d, idx) => (
                  <th key={idx} style={{minWidth: '150px', textAlign: 'center'}}>
                    <div style={{fontSize: '0.9rem'}}>{d.dayName}, {d.dateStr}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(emp => (
                <tr key={emp.id}>
                  <td style={{position: 'sticky', left: 0, background: 'var(--theme-card-bg)', zIndex: 1}}>
                    <div style={{fontWeight: 'bold'}}>{emp.name}</div>
                    <div style={{fontSize: '0.8rem', color: 'var(--theme-text-dim)'}}>
                      {emp.id}
                      {emp.teamName && (
                        <span style={{marginLeft: '8px', padding: '2px 6px', background: 'var(--theme-primary)', color: 'white', borderRadius: '4px', fontSize: '0.75rem'}}>
                          {emp.teamName}
                        </span>
                      )}
                    </div>
                  </td>
                  {displayHeaders.map((header, dateIdx) => {
                    const headerIdx = headers.indexOf(header);
                    const shift = emp.schedule[headerIdx] || '';
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
    </Modal>
  );
}
