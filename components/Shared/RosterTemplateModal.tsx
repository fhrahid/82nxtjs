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
  employees: Employee[];
  onSave: (updatedSchedule: Record<string, string[]>) => Promise<void>;
  onAddEmployee?: (name: string, id: string, team: string) => Promise<void>;
  onChangeTeam?: (employeeId: string, newTeam: string) => Promise<void>;
}

const SHIFT_OPTIONS = ['M2', 'M3', 'M4', 'D1', 'D2', 'DO', 'SL', 'CL', 'EL', 'HL'];

export default function RosterTemplateModal({ open, onClose, employees, onSave, onAddEmployee, onChangeTeam }: Props) {
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [monthOffset, setMonthOffset] = useState(0);
  const [schedule, setSchedule] = useState<Record<string, string[]>>({});
  const [editingCell, setEditingCell] = useState<{empId: string, dateIdx: number} | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpId, setNewEmpId] = useState('');
  const [newEmpTeam, setNewEmpTeam] = useState('');
  const [editingTeam, setEditingTeam] = useState<{empId: string, currentTeam: string} | null>(null);

  // Initialize schedule with empty values
  useEffect(() => {
    if (employees.length > 0 && Object.keys(schedule).length === 0) {
      const initial: Record<string, string[]> = {};
      employees.forEach(emp => {
        // Create schedule for next 3 months (about 90 days)
        initial[emp.id] = Array(90).fill('');
      });
      setSchedule(initial);
    }
  }, [employees, schedule]);

  const teamNames = useMemo(() => {
    const teams = new Set<string>();
    employees.forEach(emp => {
      if (emp.team) teams.add(emp.team);
    });
    return Array.from(teams).sort();
  }, [employees]);

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

  // Calculate display dates for current month view
  const { displayDates, displayMonthName, canGoPrev, canGoNext } = useMemo(() => {
    const now = new Date();
    const targetMonth = now.getMonth() + monthOffset;
    const targetYear = now.getFullYear() + Math.floor(targetMonth / 12);
    const adjustedMonth = ((targetMonth % 12) + 12) % 12;
    
    const firstDay = new Date(targetYear, adjustedMonth, 1);
    const lastDay = new Date(targetYear, adjustedMonth + 1, 0);
    const daysInMonth = lastDay.getDate();

    const dates: {day: number, date: string, dayName: string, dateIdx: number}[] = [];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Calculate the base index (days from today)
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(targetYear, adjustedMonth, day);
      const dayName = dayNames[currentDate.getDay()];
      const dateStr = `${day} ${monthNames[adjustedMonth]}`;
      
      // Calculate days from today
      const diffTime = currentDate.getTime() - todayDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      dates.push({
        day,
        date: dateStr,
        dayName,
        dateIdx: diffDays
      });
    }

    return {
      displayDates: dates,
      displayMonthName: `${monthNames[adjustedMonth]} ${targetYear}`,
      canGoPrev: monthOffset > 0,
      canGoNext: monthOffset < 11 // Limit to 12 months in future
    };
  }, [monthOffset]);

  const filteredEmployees = useMemo(() => {
    if (selectedTeams.length === 0) return employees;
    return employees.filter(emp => emp.team && selectedTeams.includes(emp.team));
  }, [employees, selectedTeams]);

  function handleCellClick(empId: string, dateIdx: number) {
    setEditingCell({empId, dateIdx});
  }

  function handleShiftSelect(shift: string) {
    if (!editingCell) return;
    
    setSchedule(prev => ({
      ...prev,
      [editingCell.empId]: prev[editingCell.empId].map((s, idx) => 
        idx === editingCell.dateIdx ? shift : s
      )
    }));
    
    setEditingCell(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(schedule);
      alert('Roster template saved successfully!');
      onClose();
    } catch (e) {
      alert('Failed to save roster template');
      console.error(e);
    }
    setSaving(false);
  }

  function displayShift(code: string): string {
    if (!code || code === '') return '-';
    return SHIFT_MAP[code] || code;
  }

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Roster Template" width="95vw">
      <div style={{padding: '20px'}}>
        <p style={{marginBottom: '15px', color: 'var(--theme-text-dim)'}}>
          Create roster schedules for future months. Click on any cell to assign a shift.
        </p>

        {/* Team Filters and Add Employee */}
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
            {onAddEmployee && (
              <button 
                className="btn tiny primary" 
                onClick={() => setShowAddEmployee(true)}
                style={{marginLeft: 'auto'}}
              >
                ➕ Add Employee
              </button>
            )}
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
                {displayDates.map(d => (
                  <th key={d.dateIdx} style={{minWidth: '150px', textAlign: 'center'}}>
                    <div style={{fontSize: '0.9rem'}}>{d.dayName}, {d.date}</div>
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
                      {emp.team && (
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onChangeTeam && emp.team) {
                              setEditingTeam({empId: emp.id, currentTeam: emp.team});
                            }
                          }}
                          style={{
                            marginLeft: '8px',
                            padding: '2px 6px',
                            background: 'var(--theme-primary)',
                            color: 'white',
                            borderRadius: '4px',
                            cursor: onChangeTeam ? 'pointer' : 'default',
                            fontSize: '0.75rem'
                          }}
                          title={onChangeTeam ? 'Click to change team' : emp.team}
                        >
                          {emp.team}
                        </span>
                      )}
                    </div>
                  </td>
                  {displayDates.map(d => {
                    const shift = schedule[emp.id]?.[d.dateIdx] || '';
                    const isEditing = editingCell?.empId === emp.id && editingCell?.dateIdx === d.dateIdx;
                    
                    return (
                      <td 
                        key={d.dateIdx} 
                        style={{
                          textAlign: 'center',
                          cursor: 'pointer',
                          position: 'relative',
                          background: shift ? 'var(--theme-success-dim, rgba(76, 175, 80, 0.1))' : 'transparent'
                        }}
                        onClick={() => handleCellClick(emp.id, d.dateIdx)}
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
            Cancel
          </button>
          <button className="btn primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Template'}
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
          onClick={() => setEditingCell(null)}
        />
      )}

      {/* Add Employee Modal */}
      {showAddEmployee && onAddEmployee && (
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
            padding: '30px',
            minWidth: '400px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
          }}>
            <h3 style={{marginTop: 0}}>Add New Employee</h3>
            <div style={{marginBottom: '15px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontWeight: 500}}>Name</label>
              <input
                type="text"
                value={newEmpName}
                onChange={(e) => setNewEmpName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid var(--theme-border)',
                  background: 'var(--theme-bg)',
                  color: 'var(--theme-text)'
                }}
                placeholder="Employee Name"
              />
            </div>
            <div style={{marginBottom: '15px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontWeight: 500}}>Employee ID</label>
              <input
                type="text"
                value={newEmpId}
                onChange={(e) => setNewEmpId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid var(--theme-border)',
                  background: 'var(--theme-bg)',
                  color: 'var(--theme-text)'
                }}
                placeholder="SLL-XXXXX"
              />
            </div>
            <div style={{marginBottom: '20px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontWeight: 500}}>Team</label>
              <select
                value={newEmpTeam}
                onChange={(e) => setNewEmpTeam(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid var(--theme-border)',
                  background: 'var(--theme-bg)',
                  color: 'var(--theme-text)'
                }}
              >
                <option value="">Select Team</option>
                {teamNames.map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>
            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
              <button
                className="btn"
                onClick={() => {
                  setShowAddEmployee(false);
                  setNewEmpName('');
                  setNewEmpId('');
                  setNewEmpTeam('');
                }}
              >
                Cancel
              </button>
              <button
                className="btn primary"
                onClick={async () => {
                  if (newEmpName && newEmpId && newEmpTeam) {
                    try {
                      await onAddEmployee(newEmpName, newEmpId, newEmpTeam);
                      setShowAddEmployee(false);
                      setNewEmpName('');
                      setNewEmpId('');
                      setNewEmpTeam('');
                    } catch (e) {
                      alert('Failed to add employee');
                    }
                  } else {
                    alert('Please fill in all fields');
                  }
                }}
                disabled={!newEmpName || !newEmpId || !newEmpTeam}
              >
                Add Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Change Dropdown */}
      {editingTeam && onChangeTeam && (
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
            padding: '30px',
            minWidth: '350px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
          }}>
            <h3 style={{marginTop: 0}}>Change Team</h3>
            <p style={{color: 'var(--theme-text-dim)', marginBottom: '20px'}}>
              Current team: <strong>{editingTeam.currentTeam}</strong>
            </p>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              {teamNames.filter(t => t !== editingTeam.currentTeam).map(team => (
                <button
                  key={team}
                  className="btn"
                  onClick={async () => {
                    try {
                      await onChangeTeam(editingTeam.empId, team);
                      setEditingTeam(null);
                      alert(`Team changed to ${team} successfully!`);
                    } catch (e) {
                      alert('Failed to change team');
                    }
                  }}
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    background: 'var(--theme-primary)',
                    color: 'white'
                  }}
                >
                  {team}
                </button>
              ))}
            </div>
            <button
              className="btn"
              onClick={() => setEditingTeam(null)}
              style={{marginTop: '15px', width: '100%'}}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
