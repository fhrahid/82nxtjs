"use client";
import { useState } from 'react';

const tabs = [
  { id:'dashboard', label:'📊 Dashboard'},
  { id:'schedule-requests', label:'📋 Schedule Requests'},
  { id:'team-management', label:'👥 Team Management'},
  { id:'user-management', label:'🔐 User Management'},
  { id:'profile', label:'👤 My Profile'},
  { id:'data-sync', label:'🔄 Data Sync'},
  { id:'google-links', label:'🔗 Google Sheets'},
  { id:'roster-data', label:'📊 Roster Data'},
  { id:'csv-import', label:'📂 CSV Import'}
];

export default function AdminLayoutShell({children, adminUser}:{children:React.ReactNode, adminUser:string}) {
  const [active,setActive]=useState('dashboard');
  const [collapsed,setCollapsed]=useState(false);

  return (
    <div className="admin-layout-modern">
      <aside className={`admin-sidebar ${collapsed?'collapsed':''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-logo">{collapsed ? '🛒' : '🛒 Cartup CxP'}</div>
          {!collapsed && <div className="admin-subtitle">Admin Panel</div>}
        </div>
        
        <button 
          className="sidebar-toggle-btn" 
          onClick={()=>setCollapsed(!collapsed)}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? '▶' : '◀'}
        </button>
        
        <nav className="admin-sidebar-nav">
          {tabs.map(t=>(
            <button 
              key={t.id} 
              className={`sidebar-nav-item ${active===t.id?'active':''}`} 
              onClick={()=>setActive(t.id)}
              title={collapsed ? t.label : ''}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <div className="user-icon">👤</div>
            {!collapsed && (
              <div className="user-details">
                <div className="user-name">{adminUser}</div>
                <div className="user-role">Administrator</div>
              </div>
            )}
          </div>
          <button 
            className="logout-btn-sidebar" 
            onClick={async()=>{
              await fetch('/api/admin/logout',{method:'POST'});
              window.location.href='/admin/login';
            }}
            title={collapsed ? 'Logout' : ''}
          >
            {collapsed ? '🚪' : '🚪 Logout'}
          </button>
        </div>
      </aside>

      <main className={`admin-main-content ${collapsed?'sidebar-collapsed':''}`}>
        <header className="admin-content-header">
          <h1>{tabs.find(t => t.id === active)?.label || 'Dashboard'}</h1>
          <div className="header-actions">
            <span className="timestamp">{new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</span>
          </div>
        </header>

        <div className="admin-content-body">
          {Array.isArray(children) ? children.map((c:any)=>{
            if (!c?.props?.id) return null;
            return (
              <div key={c.props.id} className={`tab-content ${active===c.props.id?'active':''}`}>
                {c}
              </div>
            );
          }): children}
        </div>
      </main>
    </div>
  );
}