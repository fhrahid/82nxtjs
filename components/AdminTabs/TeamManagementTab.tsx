"use client";
import { useState, useEffect } from 'react';

interface Props { id: string; }
interface Employee { name:string; id:string; schedule:string[]; currentTeam?:string; }
interface AdminData {
  teams: Record<string, Employee[]>;
  headers: string[];
}

function EditEmployeeModal({
  employee,
  team,
  onSave,
  onCancel
}: {
  employee: { id: string; name: string; team: string };
  team: string;
  onSave: (name: string, id: string) => void;
  onCancel: () => void;
}) {
  const [empName, setEmpName] = useState(employee.name);
  const [empId, setEmpId] = useState(employee.id);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Employee</h3>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-grid two">
            <div>
              <label>Name</label>
              <input
                value={empName}
                onChange={e => setEmpName(e.target.value)}
                placeholder="Full Name"
              />
            </div>
            <div>
              <label>ID</label>
              <input
                value={empId}
                onChange={e => setEmpId(e.target.value.toUpperCase())}
                placeholder="EMP ID"
              />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn primary" onClick={() => onSave(empName, empId)}>💾 Save</button>
            <button className="btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function TeamManagementTab({ id }: Props) {
  const [data, setData] = useState<AdminData>({ teams: {}, headers: [] });
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teamName, setTeamName] = useState('');
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [empName, setEmpName] = useState('');
  const [empId, setEmpId] = useState('');
  const [editingEmp, setEditingEmp] = useState<{ id: string; name: string; team: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const apply = () => setIsMobile(window.innerWidth <= 480);
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/get-admin-data');
      if (res.ok) {
        const j = await res.json();
        setData(j);
        if (!selectedTeam && Object.keys(j.teams).length) {
          setSelectedTeam(Object.keys(j.teams)[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function addTeam() {
    if (!teamName) return;
    const res = await fetch('/api/admin/save-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamName, action: 'add' })
    }).then(r => r.json());
    if (res.success) {
      setTeamName('');
      load();
    } else alert(res.error);
  }

  async function editTeam() {
    if (!teamName || !editingTeam) return;
    const res = await fetch('/api/admin/save-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamName, action: 'edit', oldName: editingTeam })
    }).then(r => r.json());
    if (res.success) {
      setEditingTeam(null);
      setTeamName('');
      load();
    } else alert(res.error);
  }

  async function deleteTeam(t: string) {
    if (!confirm(`Delete team ${t}?`)) return;
    const res = await fetch('/api/admin/delete-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamName: t })
    }).then(r => r.json());
    if (res.success) {
      if (selectedTeam === t) setSelectedTeam('');
      load();
    } else alert(res.error);
  }

  async function addEmployee() {
    if (!empName || !empId || !selectedTeam) return;
    const res = await fetch('/api/admin/save-employee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: empName, id: empId, team: selectedTeam, action: 'add' })
    }).then(r => r.json());
    if (res.success) {
      setEmpName(''); setEmpId('');
      load();
    } else alert(res.error);
  }

  async function editEmployee(name: string, id: string) {
    if (!editingEmp || !name || !id || !selectedTeam) return;
    const res = await fetch('/api/admin/save-employee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        id,
        team: selectedTeam,
        action: 'edit',
        oldId: editingEmp.id,
        oldTeam: editingEmp.team
      })
    }).then(r => r.json());
    if (res.success) {
      setEditingEmp(null);
      setEmpName('');
      setEmpId('');
      load();
    } else alert(res.error);
  }

  async function deleteEmployee(emp: string) {
    if (!confirm('Delete this employee?')) return;
    const res = await fetch('/api/admin/delete-employee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: emp })
    }).then(r => r.json());
    if (res.success) load(); else alert(res.error);
  }

  function startTeamEdit(t: string) {
    setEditingTeam(t);
    setTeamName(t);
  }
  function startEmpEdit(e: Employee, team: string) {
    setEditingEmp({ id: e.id, name: e.name, team });
  }

  const teamKeys = Object.keys(data.teams);

  function renderTeamCard(team: string) {
    return (
      <div
        key={team}
        className={`tm-team-card ${team === selectedTeam ? 'active' : ''}`}
        onClick={() => setSelectedTeam(team)}
      >
        <div className="head-row">
          <div className="team-name">{team}</div>
          <span className="team-count">{data.teams[team].length}</span>
        </div>
        <div className="actions">
          <button
            className="icon-btn tiny"
            title="Edit"
            onClick={(e) => { e.stopPropagation(); startTeamEdit(team); }}
          >✏️</button>
          <button
            className="icon-btn danger tiny"
            title="Delete"
            onClick={(e) => { e.stopPropagation(); deleteTeam(team); }}
          >🗑️</button>
        </div>
      </div>
    );
  }

  function renderEmployeeCard(e: Employee) {
    return (
      <div key={e.id} className="tm-employee-card">
        <div className="row1">
          <div className="emp-main">
            <div className="emp-n">{e.name}</div>
            <div className="emp-i">{e.id}</div>
          </div>
          <div className="emp-actions">
            <button className="icon-btn tiny" onClick={() => startEmpEdit(e, selectedTeam)}>✏️</button>
            <button className="icon-btn danger tiny" onClick={() => deleteEmployee(e.id)}>🗑️</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id={id} className="tab-pane team-management-root">
      <h2>Team Management</h2>
      <p>Create, edit, and delete teams and employees.</p>

      {!isMobile && (
        <div className="team-management-layout">
          <div className="teams-panel">
            <h3>Teams</h3>
            <ul className="team-list">
              {teamKeys.length === 0 && <li className="empty">No teams yet</li>}
              {teamKeys.map(t => (
                <li key={t} className={t === selectedTeam ? 'active' : ''}>
                  <button onClick={() => setSelectedTeam(t)} className="team-select">
                    {t} <span className="count">{data.teams[t].length}</span>
                  </button>
                  <div className="row-actions">
                    <button className="icon-btn" title="Edit" onClick={() => startTeamEdit(t)}>✏️</button>
                    <button className="icon-btn danger" title="Delete" onClick={() => deleteTeam(t)}>🗑️</button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="team-form">
              <h4>{editingTeam ? 'Edit Team' : 'Add Team'}</h4>
              <input
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder="Team Name"
              />
              <div className="actions-row">
                {!editingTeam && <button className="btn primary small" onClick={addTeam}>➕ Add</button>}
                {editingTeam && <>
                  <button className="btn primary small" onClick={editTeam}>💾 Save</button>
                  <button className="btn small" onClick={() => { setEditingTeam(null); setTeamName(''); }}>Cancel</button>
                </>}
              </div>
            </div>
          </div>

          <div className="employees-panel">
            <h3>Employees {selectedTeam ? `– ${selectedTeam}` : ''}</h3>
            {!selectedTeam && <div className="info-box">Select a team to manage employees.</div>}
            {selectedTeam && (
              <>
                <div className="table-wrapper">
                  <table className="data-table tiny">
                    <thead>
                      <tr><th>Name</th><th>ID</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {data.teams[selectedTeam]?.length === 0 && <tr><td colSpan={3}>No employees</td></tr>}
                      {data.teams[selectedTeam]?.map(e => (
                        <tr key={e.id}>
                          <td>{e.name}</td>
                          <td>{e.id}</td>
                          <td>
                            <button className="icon-btn" onClick={() => startEmpEdit(e, selectedTeam)}>✏️</button>
                            <button className="icon-btn danger" onClick={() => deleteEmployee(e.id)}>🗑️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="employee-form">
                  <h4>Add Employee</h4>
                  <div className="form-grid two">
                    <div>
                      <label>Name</label>
                      <input
                        value={empName}
                        onChange={e => setEmpName(e.target.value)}
                        placeholder="Full Name"
                      />
                    </div>
                    <div>
                      <label>ID</label>
                      <input
                        value={empId}
                        onChange={e => setEmpId(e.target.value.toUpperCase())}
                        placeholder="EMP ID"
                      />
                    </div>
                  </div>
                  <div className="actions-row">
                    <button className="btn primary small" onClick={addEmployee}>➕ Add Employee</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {isMobile && (
        <div className="tm-mobile-stack">
          <div className="tm-card add-team-card">
            <h3 className="title-sm">{editingTeam ? 'Edit Team' : 'Add Team'}</h3>
            <div className="form-grid one">
              <div>
                <label>Team</label>
                <input
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  placeholder="Team Name"
                />
              </div>
            </div>
            <div className="card-actions inline">
              {!editingTeam && <button className="btn primary small" onClick={addTeam}>Add</button>}
              {editingTeam && <>
                <button className="btn primary small" onClick={editTeam}>Save</button>
                <button className="btn small" onClick={() => { setEditingTeam(null); setTeamName(''); }}>Cancel</button>
              </>}
            </div>
          </div>

          <h3 className="subhead">Teams</h3>
          <div className="tm-teams-card-list">
            {teamKeys.length === 0 && <div className="empty-mobile">No teams yet</div>}
            {teamKeys.map(renderTeamCard)}
          </div>

          {selectedTeam && (
            <>
              <h3 className="subhead">Employees – {selectedTeam}</h3>
              <div className="tm-employees-card-list">
                {data.teams[selectedTeam]?.length === 0 && <div className="empty-mobile">No employees</div>}
                {data.teams[selectedTeam]?.map(renderEmployeeCard)}
              </div>

              <div className="tm-card add-employee-card">
                <h3 className="title-sm">Add Employee</h3>
                <div className="form-grid two">
                  <div>
                    <label>Name</label>
                    <input
                      value={empName}
                      onChange={e => setEmpName(e.target.value)}
                      placeholder="Full Name"
                    />
                  </div>
                  <div>
                    <label>ID</label>
                    <input
                      value={empId}
                      onChange={e => setEmpId(e.target.value.toUpperCase())}
                      placeholder="EMP ID"
                    />
                  </div>
                </div>
                <div className="card-actions inline">
                  <button className="btn primary small" onClick={addEmployee}>Add</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {loading && <div className="inline-loading">Loading team data...</div>}
      {editingEmp && (
        <EditEmployeeModal
          employee={editingEmp}
          team={selectedTeam}
          onSave={(name, id) => editEmployee(name, id)}
          onCancel={() => setEditingEmp(null)}
        />
      )}
    </div>
  );
}