"use client";
import { useState, useEffect } from 'react';

interface Props { id: string; }

interface DashboardStats {
  swap_requests: {
    total: number;
    accepted: number;
    rejected: number;
    pending: number;
    modified_shifts: number;
    acceptance_rate: number;
  };
  team_stats: {
    [team: string]: {
      total_employees: number;
      working_days: number;
      off_days: number;
      total_requests: number;
      approved_requests: number;
      health_score: number;
    };
  };
  recent_activity: any[];
  total_employees: number;
  working_today: any[];
}

export default function DashboardTab({ id }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWorkingTodayModal, setShowWorkingTodayModal] = useState(false);
  const [selectedTeamsFilter, setSelectedTeamsFilter] = useState<string[]>([]);
  const [showRequestsDetails, setShowRequestsDetails] = useState<string | null>(null);
  const [allRequestsData, setAllRequestsData] = useState<any[]>([]);
  const [modifiedShiftsData, setModifiedShiftsData] = useState<any>(null);

  async function loadDashboard() {
    setLoading(true);
    try {
      // Load requests data
      const requestsRes = await fetch('/api/schedule-requests/get-all').then(r => r.json());
      
      // Load admin data for team stats
      const adminRes = await fetch('/api/admin/get-admin-data').then(r => r.json());
      
      // Load modified shifts data
      const modifiedRes = await fetch('/api/admin/get-modified-shifts').then(r => r.json());

      if (requestsRes.success && adminRes) {
        const allRequests = requestsRes.all_requests || [];
        setAllRequestsData(allRequests); // Store in state for use in JSX
        setModifiedShiftsData(modifiedRes); // Store in state for use in JSX
        const swapRequests = allRequests.filter((r: any) => r.type === 'swap');
        const shiftChangeRequests = allRequests.filter((r: any) => r.type === 'shift_change');
        const combinedRequests = [...swapRequests, ...shiftChangeRequests];
        
        // Get modified shifts count from already loaded data
        const modifiedShiftsCount = modifiedRes.recent_modifications?.length || 0;

        const swapStats = {
          total: combinedRequests.length,
          accepted: combinedRequests.filter((r: any) => r.status === 'approved').length,
          rejected: combinedRequests.filter((r: any) => r.status === 'rejected').length,
          pending: combinedRequests.filter((r: any) => r.status === 'pending').length,
          modified_shifts: modifiedShiftsCount,
          acceptance_rate: combinedRequests.length > 0 
            ? Math.round((combinedRequests.filter((r: any) => r.status === 'approved').length / combinedRequests.length) * 100)
            : 0
        };

        // Calculate team stats with health metrics
        const teamStats: any = {};
        if (adminRes.teams) {
          Object.entries(adminRes.teams).forEach(([teamName, employees]: [string, any]) => {
            let workingDays = 0;
            let offDays = 0;
            
            employees.forEach((emp: any) => {
              emp.schedule.forEach((shift: string) => {
                if (['DO', 'SL', 'CL', 'EL', ''].includes(shift)) {
                  offDays++;
                } else {
                  workingDays++;
                }
              });
            });

            // Calculate schedule change requests for this team
            const teamRequests = allRequests.filter((r: any) => r.team === teamName);
            const approvedRequests = teamRequests.filter((r: any) => r.status === 'approved');
            
            // Health score: lower is better (fewer changes = healthier team)
            // Calculate as percentage of days that were NOT changed
            const totalDays = workingDays + offDays;
            const changeRate = totalDays > 0 ? (approvedRequests.length / (employees.length * 30)) : 0; // Assume 30 day period
            const healthScore = Math.max(0, Math.min(100, Math.round((1 - changeRate) * 100)));

            teamStats[teamName] = {
              total_employees: employees.length,
              working_days: workingDays,
              off_days: offDays,
              total_requests: teamRequests.length,
              approved_requests: approvedRequests.length,
              health_score: healthScore
            };
          });
        }

        // Calculate total employees
        const totalEmployees = Object.values(adminRes.teams).reduce((acc: number, team: any) => acc + team.length, 0);

        // Calculate employees working today
        const today = new Date();
        const todayDateStr = today.toISOString().split('T')[0];
        const workingToday: any[] = [];
        
        if (adminRes.headers && adminRes.teams) {
          const todayIndex = adminRes.headers.findIndex((h: string) => h === todayDateStr);
          
          if (todayIndex !== -1) {
            Object.entries(adminRes.teams).forEach(([teamName, employees]: [string, any]) => {
              employees.forEach((emp: any) => {
                const shift = emp.schedule[todayIndex];
                if (shift && !['DO', 'SL', 'CL', 'EL', '', 'OFF'].includes(shift)) {
                  workingToday.push({
                    name: emp.name,
                    id: emp.id,
                    team: teamName,
                    shift: shift
                  });
                }
              });
            });
          }
        }

        // Merge recent activity from requests and modifications
        // For modifications from schedule requests, link back to the request to get proper approved_by
        const recentActivity = [
          ...allRequests.map((r: any) => ({
            ...r, 
            activity_type: 'request',
            timestamp: r.approved_at || r.created_at
          })),
          ...(modifiedRes.recent_modifications || []).map((m: any) => {
            // If modification was from a schedule request, find the matching request
            let linkedApprovedBy = null;
            if (m.modified_by?.startsWith('Schedule Request')) {
              const matchingRequest = allRequests.find((r: any) => 
                r.employee_id === m.employee_id && 
                r.date === m.date_header &&
                r.status === 'approved'
              );
              if (matchingRequest) {
                linkedApprovedBy = matchingRequest.approved_by;
              }
            }
            
            return {
              ...m, 
              activity_type: 'modification',
              date: m.date_header,
              old_shift: m.old_shift,
              new_shift: m.new_shift,
              approved_by: linkedApprovedBy // Add the linked approved_by
            };
          })
        ]
          .sort((a, b) => (b.timestamp || b.created_at || '').localeCompare(a.timestamp || a.created_at || ''))
          .slice(0, 15);

        setStats({
          swap_requests: swapStats,
          team_stats: teamStats,
          recent_activity: recentActivity,
          total_employees: totalEmployees,
          working_today: workingToday
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
    setLoading(false);
  }

  useEffect(() => { loadDashboard(); }, []);

  if (loading) {
    return (
      <div id={id} className="tab-pane">
        <h2>📊 Dashboard</h2>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div id={id} className="tab-pane">
        <h2>📊 Dashboard</h2>
        <p>Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div id={id} className="tab-pane">
      <h2>📊 Dashboard</h2>
      <p>Overview of team health, swap requests, and activity.</p>

      <div className="dashboard-grid">
        {/* Total Employees Stat Card */}
        <div className="dashboard-card compact">
          <h3>👥 Total Employees This Month</h3>
          <div className="big-stat">
            <div className="big-stat-value">{stats.total_employees}</div>
            <div className="big-stat-label">Active Employees</div>
          </div>
        </div>

        {/* Employees Working Today Stat Card */}
        <div 
          className="dashboard-card compact" 
          style={{cursor: 'pointer'}}
          onClick={() => setShowWorkingTodayModal(true)}
        >
          <h3>👷 Employees Working Today</h3>
          <div className="big-stat">
            <div className="big-stat-value">{stats.working_today.length}</div>
            <div className="big-stat-label">Working Now</div>
          </div>
          <p style={{fontSize: '0.8rem', color: 'var(--theme-text-dim)', marginTop: '10px'}}>
            Click to view details
          </p>
        </div>

        {/* Shift Change / Swap Requests Overview */}
        <div className="dashboard-card">
          <h3>🔁 Shift Change / Swap Requests Overview</h3>
          <div className="stats-grid">
            <div 
              className="stat-item" 
              style={{cursor: 'pointer'}}
              onClick={() => setShowRequestsDetails(showRequestsDetails === 'total' ? null : 'total')}
            >
              <div className="stat-value">{stats.swap_requests.total}</div>
              <div className="stat-label">Total Requests</div>
            </div>
            <div 
              className="stat-item success" 
              style={{cursor: 'pointer'}}
              onClick={() => setShowRequestsDetails(showRequestsDetails === 'accepted' ? null : 'accepted')}
            >
              <div className="stat-value">{stats.swap_requests.accepted}</div>
              <div className="stat-label">Accepted</div>
            </div>
            <div 
              className="stat-item danger" 
              style={{cursor: 'pointer'}}
              onClick={() => setShowRequestsDetails(showRequestsDetails === 'rejected' ? null : 'rejected')}
            >
              <div className="stat-value">{stats.swap_requests.rejected}</div>
              <div className="stat-label">Rejected</div>
            </div>
            <div 
              className="stat-item warning" 
              style={{cursor: 'pointer'}}
              onClick={() => setShowRequestsDetails(showRequestsDetails === 'pending' ? null : 'pending')}
            >
              <div className="stat-value">{stats.swap_requests.pending}</div>
              <div className="stat-label">Pending</div>
            </div>
            <div 
              className="stat-item" 
              style={{cursor: 'pointer', borderColor: 'var(--theme-primary)'}}
              onClick={() => setShowRequestsDetails(showRequestsDetails === 'modified' ? null : 'modified')}
            >
              <div className="stat-value">{stats.swap_requests.modified_shifts}</div>
              <div className="stat-label">Modified Shifts</div>
            </div>
          </div>
          
          {showRequestsDetails && (
            <div className="requests-details" style={{
              marginTop: '20px',
              padding: '15px',
              background: 'var(--theme-panel-accent)',
              borderRadius: '8px',
              border: '1px solid var(--theme-border)',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              <h4 style={{margin: '0 0 10px', color: 'var(--theme-text)', fontSize: '1rem'}}>
                {showRequestsDetails === 'total' && 'All Requests'}
                {showRequestsDetails === 'accepted' && 'Accepted Requests'}
                {showRequestsDetails === 'rejected' && 'Rejected Requests'}
                {showRequestsDetails === 'pending' && 'Pending Requests'}
                {showRequestsDetails === 'modified' && 'Modified Shifts by Admin'}
              </h4>
              <div style={{fontSize: '0.85rem', color: 'var(--theme-text-dim)'}}>
                {(() => {
                  let filteredRequests: any[] = [];
                  const allReqs = allRequestsData || [];
                  
                  if (showRequestsDetails === 'total') {
                    filteredRequests = allReqs;
                  } else if (showRequestsDetails === 'accepted') {
                    filteredRequests = allReqs.filter((r: any) => r.status === 'approved');
                  } else if (showRequestsDetails === 'rejected') {
                    filteredRequests = allReqs.filter((r: any) => r.status === 'rejected');
                  } else if (showRequestsDetails === 'pending') {
                    filteredRequests = allReqs.filter((r: any) => r.status === 'pending');
                  } else if (showRequestsDetails === 'modified') {
                    // Show modified shifts from API
                    const modifications = modifiedShiftsData?.recent_modifications || [];
                    return (
                      <div>
                        {modifications.length === 0 ? (
                          <p>No modified shifts found</p>
                        ) : (
                          <table style={{width: '100%', fontSize: '0.85rem'}}>
                            <thead>
                              <tr style={{borderBottom: '1px solid var(--theme-border)'}}>
                                <th style={{padding: '8px', textAlign: 'left', color: 'var(--theme-text-dim)'}}>Employee</th>
                                <th style={{padding: '8px', textAlign: 'left', color: 'var(--theme-text-dim)'}}>Date</th>
                                <th style={{padding: '8px', textAlign: 'left', color: 'var(--theme-text-dim)'}}>Change</th>
                                <th style={{padding: '8px', textAlign: 'left', color: 'var(--theme-text-dim)'}}>Modified By</th>
                              </tr>
                            </thead>
                            <tbody>
                              {modifications.slice(0, 10).map((m: any, idx: number) => (
                                <tr key={idx} style={{borderBottom: '1px solid var(--theme-border)'}}>
                                  <td style={{padding: '8px', color: 'var(--theme-text)'}}>{m.employee_name}</td>
                                  <td style={{padding: '8px', color: 'var(--theme-text-dim)'}}>{m.date_header}</td>
                                  <td style={{padding: '8px', color: 'var(--theme-primary)'}}>{m.old_shift} → {m.new_shift}</td>
                                  <td style={{padding: '8px', color: 'var(--theme-text-dim)', fontSize: '0.8rem'}}>{m.modified_by}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div>
                      {filteredRequests.length === 0 ? (
                        <p>No {showRequestsDetails} requests found</p>
                      ) : (
                        <table style={{width: '100%', fontSize: '0.85rem'}}>
                          <thead>
                            <tr style={{borderBottom: '1px solid var(--theme-border)'}}>
                              <th style={{padding: '8px', textAlign: 'left', color: 'var(--theme-text-dim)'}}>Employee</th>
                              <th style={{padding: '8px', textAlign: 'left', color: 'var(--theme-text-dim)'}}>Date</th>
                              <th style={{padding: '8px', textAlign: 'left', color: 'var(--theme-text-dim)'}}>Type</th>
                              <th style={{padding: '8px', textAlign: 'left', color: 'var(--theme-text-dim)'}}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredRequests.slice(0, 10).map((req: any, idx: number) => (
                              <tr key={idx} style={{borderBottom: '1px solid var(--theme-border)'}}>
                                <td style={{padding: '8px', color: 'var(--theme-text)'}}>
                                  {req.type === 'swap' ? req.requester_name : req.employee_name}
                                </td>
                                <td style={{padding: '8px', color: 'var(--theme-text-dim)'}}>{req.date}</td>
                                <td style={{padding: '8px', color: 'var(--theme-text-dim)'}}>{req.type === 'swap' ? 'Swap' : 'Shift Change'}</td>
                                <td style={{padding: '8px'}}>
                                  <span className={`activity-status ${req.status}`} style={{opacity: 1}}>
                                    {req.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
          <div className="acceptance-rate">
            <div className="rate-label">Acceptance Rate</div>
            <div className="rate-bar">
              <div 
                className="rate-fill" 
                style={{ width: `${stats.swap_requests.acceptance_rate}%` }}
              ></div>
            </div>
            <div className="rate-value">{stats.swap_requests.acceptance_rate}%</div>
          </div>
        </div>

        {/* Team Health Overview */}
        <div className="dashboard-card">
          <h3>👥 Team Health Overview</h3>
          <p style={{fontSize: '0.85rem', color: '#9FB7D5', marginBottom: '15px'}}>
            Health score based on schedule stability (fewer approved changes = healthier team)
          </p>
          <div className="team-stats-list">
            {Object.entries(stats.team_stats).map(([teamName, teamData]) => (
              <div key={teamName} className="team-stat-item">
                <div className="team-name">{teamName}</div>
                <div className="team-metrics">
                  <div className="team-metric">
                    <span className="metric-label">Employees:</span>
                    <span className="metric-value">{teamData.total_employees}</span>
                  </div>
                  <div className="team-metric">
                    <span className="metric-label">Schedule Requests:</span>
                    <span className="metric-value">{teamData.total_requests}</span>
                  </div>
                  <div className="team-metric">
                    <span className="metric-label">Approved Changes:</span>
                    <span className="metric-value warning">{teamData.approved_requests}</span>
                  </div>
                  <div className="team-metric">
                    <span className="metric-label">Health Score:</span>
                    <span className={`metric-value ${teamData.health_score >= 80 ? 'success' : teamData.health_score >= 60 ? 'warning' : 'danger'}`}>
                      {teamData.health_score}%
                    </span>
                  </div>
                </div>
                <div className="team-bar">
                  <div 
                    className={`team-bar-health ${teamData.health_score >= 80 ? 'health-good' : teamData.health_score >= 60 ? 'health-medium' : 'health-poor'}`}
                    style={{ 
                      width: `${teamData.health_score}%` 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="dashboard-card full-width">
          <h3>📋 Recent Activity</h3>
          <div className="activity-list">
            {stats.recent_activity.length === 0 ? (
              <div className="no-activity">No recent activity</div>
            ) : (
              stats.recent_activity.map((activity: any, idx: number) => (
                <div key={idx} className="activity-item">
                  <div className="activity-icon">
                    {activity.activity_type === 'modification' ? '✏️' : 
                     activity.status === 'approved' ? '✅' : 
                     activity.status === 'rejected' ? '❌' : '⏳'}
                  </div>
                  <div className="activity-content">
                    <div className="activity-title">
                      {activity.activity_type === 'modification' ? (
                        // For modifications, show the actual admin who made the change
                        activity.modified_by?.startsWith('Schedule Request') 
                          ? `Schedule Request (Approved by ${activity.approved_by || 'admin'}) modified shift for ${activity.employee_name} on ${activity.date}: ${activity.old_shift} → ${activity.new_shift}`
                          : `${activity.modified_by || 'Admin'} modified shift for ${activity.employee_name} on ${activity.date}: ${activity.old_shift} → ${activity.new_shift}`
                      ) : activity.status === 'approved' && activity.approved_by ? (
                        activity.type === 'swap' 
                          ? `${activity.approved_by} approved Swap Request for ${activity.requester_name} ⇄ ${activity.target_employee_name}`
                          : `${activity.approved_by} approved Shift Change for ${activity.employee_name} on ${activity.date}: ${activity.current_shift} → ${activity.requested_shift}`
                      ) : activity.status === 'rejected' && activity.approved_by ? (
                        activity.type === 'swap'
                          ? `${activity.approved_by} rejected Swap Request for ${activity.requester_name} on ${activity.date}`
                          : `${activity.approved_by} rejected Shift Change for ${activity.employee_name} on ${activity.date}`
                      ) : (
                        activity.type === 'swap' 
                          ? `${activity.requester_name} submitted Swap Request with ${activity.target_employee_name} on ${activity.date}`
                          : `${activity.employee_name} submitted Shift Change Request for ${activity.date}`
                      )}
                    </div>
                    <div className="activity-meta">
                      <span style={{color: 'var(--theme-text-dim)', fontSize: '0.75rem'}}>
                        {(() => {
                          const timestamp = activity.timestamp || activity.approved_at || activity.created_at;
                          if (!timestamp) return 'No timestamp';
                          try {
                            const date = new Date(timestamp);
                            return date.toLocaleString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit'
                            });
                          } catch {
                            return timestamp;
                          }
                        })()}
                      </span>
                      {activity.activity_type === 'modification' ? (
                        <span className="activity-status" style={{background: 'var(--theme-primary-glow)', color: 'var(--theme-primary)'}}>
                          modified
                        </span>
                      ) : (
                        <span className={`activity-status ${activity.status}`}>{activity.status}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="actions-row" style={{ marginTop: 20 }}>
        <button className="btn small" onClick={loadDashboard}>🔄 Refresh</button>
      </div>

      {/* Working Today Modal */}
      {showWorkingTodayModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowWorkingTodayModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--theme-panel)',
              border: '1px solid var(--theme-border)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
          >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h3 style={{margin: 0, color: 'var(--theme-text)'}}>👷 Employees Working Today</h3>
              <button 
                onClick={() => setShowWorkingTodayModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--theme-text-dim)'
                }}
              >×</button>
            </div>

            {/* Team Filter */}
            <div style={{marginBottom: '20px'}}>
              <label style={{fontSize: '0.9rem', color: 'var(--theme-text-dim)', marginBottom: '8px', display: 'block'}}>
                Filter by Team:
              </label>
              <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                {Object.keys(stats.team_stats).map(team => (
                  <button
                    key={team}
                    onClick={() => {
                      if (selectedTeamsFilter.includes(team)) {
                        setSelectedTeamsFilter(selectedTeamsFilter.filter(t => t !== team));
                      } else {
                        setSelectedTeamsFilter([...selectedTeamsFilter, team]);
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      background: selectedTeamsFilter.includes(team) ? 'var(--theme-primary)' : 'var(--theme-panel-alt)',
                      border: '1px solid var(--theme-border)',
                      borderRadius: '6px',
                      color: selectedTeamsFilter.includes(team) ? '#fff' : 'var(--theme-text)',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    {team}
                  </button>
                ))}
                {selectedTeamsFilter.length > 0 && (
                  <button
                    onClick={() => setSelectedTeamsFilter([])}
                    style={{
                      padding: '6px 12px',
                      background: 'var(--theme-danger)',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Employee List */}
            <div style={{maxHeight: '400px', overflowY: 'auto'}}>
              {stats.working_today
                .filter(emp => selectedTeamsFilter.length === 0 || selectedTeamsFilter.includes(emp.team))
                .length === 0 ? (
                <p style={{textAlign: 'center', color: 'var(--theme-text-dim)', padding: '20px'}}>
                  No employees working today{selectedTeamsFilter.length > 0 ? ' in selected teams' : ''}
                </p>
              ) : (
                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                  <thead>
                    <tr style={{borderBottom: '1px solid var(--theme-border)'}}>
                      <th style={{padding: '10px', textAlign: 'left', color: 'var(--theme-text-dim)', fontSize: '0.85rem'}}>Name</th>
                      <th style={{padding: '10px', textAlign: 'left', color: 'var(--theme-text-dim)', fontSize: '0.85rem'}}>ID</th>
                      <th style={{padding: '10px', textAlign: 'left', color: 'var(--theme-text-dim)', fontSize: '0.85rem'}}>Team</th>
                      <th style={{padding: '10px', textAlign: 'left', color: 'var(--theme-text-dim)', fontSize: '0.85rem'}}>Shift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.working_today
                      .filter(emp => selectedTeamsFilter.length === 0 || selectedTeamsFilter.includes(emp.team))
                      .map((emp, idx) => (
                        <tr key={idx} style={{borderBottom: '1px solid var(--theme-border)'}}>
                          <td style={{padding: '10px', color: 'var(--theme-text)', fontSize: '0.9rem'}}>{emp.name}</td>
                          <td style={{padding: '10px', color: 'var(--theme-text-dim)', fontSize: '0.85rem'}}>{emp.id}</td>
                          <td style={{padding: '10px', color: 'var(--theme-text-dim)', fontSize: '0.85rem'}}>{emp.team}</td>
                          <td style={{padding: '10px', color: 'var(--theme-primary)', fontSize: '0.9rem', fontWeight: '600'}}>{emp.shift}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
