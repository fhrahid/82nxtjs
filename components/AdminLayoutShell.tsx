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

// Bottom tabs (main navigation)
const bottomTabs = [
  { id: 'dashboard',          label: 'Dashboard',          icon: LayoutDashboard },
  { id: 'schedule-requests',  label: 'Schedule Requests',  icon: Calendar },
  { id: 'data-sync',          label: 'Data Sync',          icon: RefreshCw },
  { id: 'google-links',       label: 'Google Sheets',      icon: Link },
  { id: 'roster-data',        label: 'Roster Data',        icon: BarChart3 },
  { id: 'csv-import',         label: 'CSV Import',         icon: FileUp }
];

// Management / profile tabs (shown in header on mobile)
const topTabs = [
  { id: 'profile',          label: 'My Profile',      icon: User },
  { id: 'team-management',  label: 'Team Management', icon: Users },
  { id: 'user-management',  label: 'User Management', icon: Lock }
];

const tabs = [...bottomTabs, ...topTabs];

function AdminLayoutContent({
  children,
  adminUser,
  userRole
}: {
  children: React.ReactNode;
  adminUser: string;
  userRole?: string;
}) {
  const [active, setActive] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const { currentTheme, setTheme } = useTheme();
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  const [panelTitle, setPanelTitle] = useState('🛒 Cartup CxP');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');

  // Load saved panel title
  useEffect(() => {
    const saved = localStorage.getItem('admin-panel-title');
    if (saved) setPanelTitle(saved);
  }, []);

  // Outside click for theme menu
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setShowThemeMenu(false);
      }
    }
    if (showThemeMenu) {
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }
  }, [showThemeMenu]);

  // Mobile header height compensation
  useEffect(() => {
    function applyOffset() {
      if (typeof window === 'undefined') return;
      if (window.innerWidth <= 480 && headerRef.current) {
        const h = headerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--mobile-header-offset', h + 'px');
      } else {
        document.documentElement.style.removeProperty('--mobile-header-offset');
      }
    }
    applyOffset();
    window.addEventListener('resize', applyOffset);
    // Re-measure after potential font/icon load or layout changes
    const t1 = setTimeout(applyOffset, 150);
    const t2 = setTimeout(applyOffset, 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', applyOffset);
    };
  }, [panelTitle, isEditingTitle, active]);

  const handleSaveTitle = () => {
    if (tempTitle.trim()) {
      const newTitle = tempTitle.trim();
      setPanelTitle(newTitle);
      localStorage.setItem('admin-panel-title', newTitle);
    }
    setIsEditingTitle(false);
    setTempTitle('');
  };

  return (
    <div className="admin-layout-modern">
      {/* Sidebar (desktop / tablet) */}
      <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="admin-sidebar-header">
          <div
            className="admin-logo"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
          >
            {collapsed ? (
              '🛒'
            ) : isEditingTitle ? (
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                autoFocus
                style={{
                  background: 'var(--theme-panel-alt)',
                  border: '1px solid var(--theme-border)',
                  color: 'var(--theme-text)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '1.1rem',
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
                    title="Edit panel title"
                  >
                    ✏️
                  </button>
                )}
              </>
            )}
          </div>
          {!collapsed && !isEditingTitle && <div className="admin-subtitle">Admin Panel</div>}
        </div>

        <button
            className="sidebar-toggle-btn"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? '▶' : '◀'}
          </button>

        <nav className="admin-sidebar-nav">
          {tabs.map((t) => {
            if (t.id === 'user-management' && userRole !== 'super_admin' && userRole !== 'admin') {
              return null;
            }
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                className={`sidebar-nav-item ${active === t.id ? 'active' : ''}`}
                onClick={() => setActive(t.id)}
                title={collapsed ? t.label : ''}
              >
                <Icon size={20} />
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
            onClick={async () => {
              await fetch('/api/admin/logout', { method: 'POST' });
              window.location.href = '/admin/login';
            }}
            title={collapsed ? 'Logout' : ''}
          >
            {collapsed ? '🚪' : '🚪 Logout'}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <main className={`admin-main-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <header className="admin-content-header" ref={headerRef}>
          <h1>{tabs.find((t) => t.id === active)?.label || 'Dashboard'}</h1>
          <div className="header-actions">
            <div className="mobile-top-tabs">
              {topTabs.map((t) => {
                if (t.id === 'user-management' && userRole !== 'super_admin' && userRole !== 'admin') {
                  return null;
                }
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    className={`mobile-top-tab ${active === t.id ? 'active' : ''}`}
                    onClick={() => setActive(t.id)}
                    title={t.label}
                  >
                    <Icon size={20} />
                  </button>
                );
              })}
            </div>

            <div className="theme-switcher-container" style={{ position: 'relative' }} ref={themeMenuRef}>
              <button
                className="btn small theme-switcher-btn"
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                title="Change Theme"
              >
                <Palette size={16} /> <span className="desktop-only">Change Theme</span>
              </button>
              {showThemeMenu && (
                <div className="theme-menu">
                  {themes.map((theme) => (
                    <button
                      key={theme.id}
                      className={`theme-option ${currentTheme.id === theme.id ? 'active' : ''}`}
                      onClick={() => {
                        setTheme(theme.id);
                        setShowThemeMenu(false);
                      }}
                    >
                      <div className="theme-preview" style={{ background: theme.colors.primary }} />
                      {theme.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="timestamp desktop-only">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
        </header>

        <div className="admin-content-body">
          {Array.isArray(children)
            ? children.map((c: any) => {
                if (!c?.props?.id) return null;
                return (
                  <div
                    key={c.props.id}
                    className={`tab-content ${active === c.props.id ? 'active' : ''}`}
                  >
                    {c}
                  </div>
                );
              })
            : children}
        </div>

        <nav className="mobile-bottom-tabs">
          {bottomTabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                className={`mobile-bottom-tab ${active === t.id ? 'active' : ''}`}
                onClick={() => setActive(t.id)}
                title={t.label}
              >
                <Icon size={22} />
                <span className="tab-label">{t.label}</span>
              </button>
            );
          })}
        </nav>
      </main>
    </div>
  );
}

export default function AdminLayoutShell({
  children,
  adminUser,
  userRole
}: {
  children: React.ReactNode;
  adminUser: string;
  userRole?: string;
}) {
  return (
    <ThemeProvider>
      <AdminLayoutContent adminUser={adminUser} userRole={userRole}>
        {children}
      </AdminLayoutContent>
    </ThemeProvider>
  );
}