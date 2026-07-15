import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, CheckSquare, FolderGit2, Shield, LogOut, Sun, Moon } from 'lucide-react';

interface NavBarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const NavBar: React.FC<NavBarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  if (!user) return null;

  return (
    <nav className="sidebar">
      <div>
        <div className="logo-section">
          <div className="logo-icon">{user.tenantName.substring(0, 2).toUpperCase()}</div>
          <div>
            <div className="logo-text">{user.tenantName}</div>
            <div className="badge badge-low" style={{ fontSize: '0.65rem', marginTop: '0.15rem' }}>
              {user.tenantSubscription.toUpperCase()}
            </div>
          </div>
        </div>

        <ul className="nav-links">
          <li
            className={`nav-link ${currentTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentTab('dashboard')}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </li>
          <li
            className={`nav-link ${currentTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setCurrentTab('tasks')}
          >
            <CheckSquare size={18} />
            Tasks
          </li>
          <li
            className={`nav-link ${currentTab === 'projects' ? 'active' : ''}`}
            onClick={() => setCurrentTab('projects')}
          >
            <FolderGit2 size={18} />
            Projects
          </li>
          {user.role === 'tenant_admin' && (
            <li
              className={`nav-link ${currentTab === 'admin' ? 'active' : ''}`}
              onClick={() => setCurrentTab('admin')}
            >
              <Shield size={18} />
              Admin Panel
            </li>
          )}
        </ul>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Theme</span>
          <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Dark/Light Mode">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {user.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {user.email}
          </div>
          <button className="btn btn-secondary btn-sm w-full" onClick={logout}>
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};
