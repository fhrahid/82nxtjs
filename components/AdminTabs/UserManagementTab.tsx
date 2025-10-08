"use client";
import { useState, useEffect } from 'react';

interface Props { id: string; }
interface AdminUser {
  username: string;
  full_name: string;
  role: string;
  created_at: string;
}

export default function UserManagementTab({ id }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'manager'>('admin');
  const [editing, setEditing] = useState<AdminUser | null>(null);
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
      const res = await fetch('/api/admin/users/list');
      if (res.ok) {
        const j = await res.json();
        if (j.success && Array.isArray(j.users)) {
          setUsers(j.users);
        } else if (Array.isArray(j)) {
          setUsers(j);
        }
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function saveUser() {
    if (!username || !fullName)
      return;
    
    let res;
    if (editing) {
      // Update existing user
      const body = { username: editing.username, updates: { full_name: fullName, role } };
      res = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(r => r.json()).catch(()=>null);
    } else {
      // Add new user - generate a default password
      const password = 'change_me_123'; // User should change this immediately
      const body = { username, password, full_name: fullName, role };
      res = await fetch('/api/admin/users/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(r => r.json()).catch(()=>null);
    }
    
    if (res?.success) {
      setUsername('');
      setFullName('');
      setRole('admin');
      setEditing(null);
      load();
      if (!editing) {
        alert('User added successfully! Default password: change_me_123 (user should change this immediately)');
      }
    } else alert(res?.error || 'Failed to save user');
  }

  async function deleteUser(u: string) {
    if (!confirm(`Delete user ${u}?`)) return;
    const res = await fetch('/api/admin/users/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u })
    }).then(r => r.json()).catch(()=>null);
    if (res?.success) load(); else alert(res?.error || 'Delete failed');
  }

  function startEdit(u: AdminUser) {
    setEditing(u);
    setUsername(u.username);
    setFullName(u.full_name);
    setRole(u.role as 'admin' | 'manager');
  }

  function cancelEdit() {
    setEditing(null);
    setUsername('');
    setFullName('');
    setRole('admin');
  }

  function renderUserRow(u: AdminUser) {
    return (
      <tr key={u.username}>
        <td><strong>{u.username}</strong></td>
        <td>{u.full_name}</td>
        <td>
          <span className={`badge ${u.role === 'manager' ? 'primary' : 'secondary'}`}>
            {u.role}
          </span>
        </td>
        <td>{new Date(u.created_at).toLocaleString()}</td>
        <td style={{ whiteSpace: 'nowrap' }}>
          <button className="icon-btn tiny" onClick={() => startEdit(u)}>✏️</button>
          <button className="icon-btn danger tiny" onClick={() => deleteUser(u.username)}>🗑️</button>
        </td>
      </tr>
    );
  }

  function renderUserCard(u: AdminUser) {
    return (
      <div key={u.username} className="um-user-card">
        <div className="card-line top">
          <div className="uname">{u.username}</div>
          <div className="role-pill">
            {u.role}
          </div>
        </div>
        <div className="card-line">
          <span className="label-sm">Full Name</span>
          <span className="value-sm">{u.full_name}</span>
        </div>
        <div className="card-line two-cols">
          <div className="col">
            <span className="label-sm">Created</span>
            <span className="value-sm">{new Date(u.created_at).toLocaleString()}</span>
          </div>
          <div className="col actions">
            <button className="icon-btn tiny" onClick={() => startEdit(u)}>✏️</button>
            <button className="icon-btn danger tiny" onClick={() => deleteUser(u.username)}>🗑️</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id={id} className="tab-pane user-management-root">
      <h2>User Management</h2>
      <p>Manage admin users and team leaders who can access the admin panel.</p>

      <div className="section-card um-form-card">
        <h3>{editing ? 'Edit User' : 'Add User'}</h3>
        <div className="form-grid three um-form-grid">
          <div>
            <label>Username</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Username"
              disabled={!!editing}
            />
          </div>
          <div>
            <label>Full Name</label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Full Name"
            />
          </div>
          <div>
            <label>Role</label>
            <select value={role} onChange={e => setRole(e.target.value as 'admin' | 'manager')}>
              <option value="admin">admin</option>
              <option value="manager">manager</option>
            </select>
          </div>
        </div>
        <div className="actions-row">
          <button className="btn primary small" onClick={saveUser}>
            {editing ? '💾 Save' : '➕ Add User'}
          </button>
          {editing && (
            <button className="btn small" onClick={cancelEdit}>Cancel</button>
          )}
        </div>
      </div>

      {!isMobile && (
        <div className="section-card">
          <h3>Admin Users</h3>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5}>Loading...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={5}>No users found</td></tr>
                ) : (
                  users.map(renderUserRow)
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isMobile && (
        <div className="um-user-card-list">
          {loading && <div className="inline-loading">Loading...</div>}
          {!loading && users.length === 0 && <div className="empty-mobile">No users found</div>}
          {!loading && users.map(renderUserCard)}
        </div>
      )}
    </div>
  );
}