"use client";
import { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Lock, 
  User, 
  RefreshCw, 
  Link, 
  BarChart3, 
  FileUp,
  Palette
} from 'lucide-react';
import { ThemeProvider, useTheme, themes } from '@/contexts/ThemeContext';

const tabs = [
  { id:'dashboard', label:'Dashboard', icon: LayoutDashboard},
  { id:'schedule-requests', label:'Schedule Requests', icon: Calendar},
  { id:'team-management', label:'Team Management', icon: Users},
  { id:'user-management', label:'User Management', icon: Lock},
  { id:'profile', label:'My Profile', icon: User},
  { id:'data-sync', label:'Data Sync', icon: RefreshCw},
  { id:'google-links', label:'Google Sheets', icon: Link},
  { id:'roster-data', label:'Roster Data', icon: BarChart3},
  { id:'csv-import', label:'CSV Import', icon: FileUp}
];

function AdminLayoutContent({children, adminUser, userRole}:{children:React.ReactNode, adminUser:string, userRole?:string}) {
  const [active,setActive]=useState('dashboard');
  const [collapsed,setCollapsed]=useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const { currentTheme, setTheme } = useTheme();
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const [panelTitle, setPanelTitle] = useState('🛒 Cartup CxP');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');

  // Load panel title from localStorage
  useEffect(() => {
    const savedTitle = localStorage.getItem('admin-panel-title');
    if (savedTitle) setPanelTitle(savedTitle);
  }, []);

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

  const handleSaveTitle = () => {
    if (tempTitle.trim()) {
      setPanelTitle(tempTitle.trim());
      localStorage.setItem('admin-panel-title', tempTitle.trim());
    }
    setIsEditingTitle(false);
    setTempTitle('');
  };

  return (
    <div className="admin-layout-modern">
      <aside className={`admin-sidebar ${collapsed?'collapsed':''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-logo" style={{display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center'}}>
            {collapsed ? '🛒' : (
              isEditingTitle ? (
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveTitle()}
                  autoFocus
                  style={{
                    background: 'var(--theme-panel-alt)',
                    border: '1px solid var(--theme-border)',
                    color: 'var(--theme-text)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '1.2rem',
                    width: '100%',
                    textAlign: 'center'
                  }}
                />
              ) : (
                <>
                  <span>{panelTitle}</span>
                  {(userRole === 'super_admin' || userRole === 'admin') && (
                    <button
                      onClick={() => {
                        setTempTitle(panelTitle);
                        setIsEditingTitle(true);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--theme-text-dim)',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        padding: '2px'
                      }}
                      title="Edit panel title (Admin only)"
                    >
                      ✏️
                    </button>
                  )}
                </>
              )
            )}
          </div>
          {!collapsed && !isEditingTitle && <div className="admin-subtitle">Admin Panel</div>}
        </div>
        
        <button 
          className="sidebar-toggle-btn" 
          onClick={()=>setCollapsed(!collapsed)}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? '▶' : '◀'}
        </button>
        
        <nav className="admin-sidebar-nav">
          {tabs.map(t=>{
            // Hide User Management tab for non-admin roles
            if (t.id === 'user-management' && userRole !== 'super_admin' && userRole !== 'admin') {
              return null;
            }
            
            const IconComponent = t.icon;
            return (
              <button 
                key={t.id} 
                className={`sidebar-nav-item ${active===t.id?'active':''}`} 
                onClick={()=>setActive(t.id)}
                title={collapsed ? t.label : ''}
              >
                <IconComponent size={20} />
                {!collapsed && <span>{t.label}</span>}
              </button>
            );
          })}
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
            <div className="theme-switcher-container" style={{position: 'relative'}} ref={themeMenuRef}>
              <button 
                className="btn small theme-switcher-btn" 
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                title="Change Theme"
              >
                <Palette size={16} /> Change Theme
              </button>
              {showThemeMenu && (
                <div className="theme-menu">
                  {themes.map(theme => (
                    <button
                      key={theme.id}
                      className={`theme-option ${currentTheme.id === theme.id ? 'active' : ''}`}
                      onClick={() => {
                        setTheme(theme.id);
                        setShowThemeMenu(false);
                      }}
                    >
                      <div 
                        className="theme-preview" 
                        style={{background: theme.colors.primary}}
                      />
                      {theme.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
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

export default function AdminLayoutShell({children, adminUser, userRole}:{children:React.ReactNode, adminUser:string, userRole?:string}) {
  return (
    <ThemeProvider>
      <AdminLayoutContent children={children} adminUser={adminUser} userRole={userRole} />
    </ThemeProvider>
  );
}