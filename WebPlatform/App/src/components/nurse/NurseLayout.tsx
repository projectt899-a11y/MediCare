import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import NotificationBell from './NotificationBell';
import Icon from '../admin/Icon';
import '../../styles/nurseLayout.css';

const NurseLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string): boolean => {
    return location.pathname === path;
  };

  const navigationItems = [
    { path: '/nurse/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/nurse/patients', label: 'My Patients', icon: 'users' },
    { path: '/nurse/follow-ups', label: 'Follow-up Requests', icon: 'clipboard' },
    { path: '/nurse/profile', label: 'Profile', icon: 'user' }
  ];

  return (
    <div className="nurse-layout">
      {/* Header */}
      <header className="nurse-header">
        <div className="header-left">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle sidebar"
          >
            <Icon name="menu" className="toggle-icon" />
          </button>
          <div className="header-title-section">
            <h1 className="header-title">{user?.fullName || 'Nurse'}</h1>
            <span className="header-role">Nurse</span>
          </div>
        </div>
        <div className="header-right">
          <NotificationBell />
        </div>
      </header>

      <div className="nurse-container">
        {/* Sidebar */}
        <aside className={`nurse-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <nav className="sidebar-nav">
            <div className="nav-section">
              <h3 className="nav-title">Navigation</h3>
              <ul className="nav-list">
                {navigationItems.map(item => (
                  <li key={item.path}>
                    <button
                      className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                      onClick={() => navigate(item.path)}
                      title={item.label}
                    >
                      <Icon name={item.icon} className="nav-icon" />
                      <span className="nav-label">{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Logout at bottom of sidebar */}
          <div className="nurse-sidebar-logout">
            <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
              <Icon name="log-out" className="logout-icon" />
              Logout
            </a>
          </div>
        </aside>

        {/* Main Content */}
        <main className="nurse-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default NurseLayout;
