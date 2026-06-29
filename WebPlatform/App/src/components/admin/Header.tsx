import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import Icon from './Icon';
import '../../styles/adminHeader.css';

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, sidebarOpen }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuthStore();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/users')) return 'Users';
    if (path.includes('/specializations')) return 'Specializations';
    if (path.includes('/audit-logs')) return 'Audit Logs';
    if (path.includes('/settings')) return 'Settings';
    if (path.includes('/dashboard')) return 'Dashboard';
    return 'Dashboard';
  };

  const handleLogout = async () => {
    // Clear auth using store (will also clear localStorage)
    await logout();
    navigate('/login');
  };

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  return (
    <header className="admin-header">
      <div className="header-left">
        <button className="toggle-sidebar-btn" onClick={onToggleSidebar}>
          <Icon name="menu" />
        </button>
        <h1 className="page-title">{getPageTitle()}</h1>
      </div>

      <div className="header-right">
        <div className="user-menu">
          <button className="user-btn" onClick={toggleUserMenu}>
            <Icon name="user" />
            <span className="user-name">{user?.fullName || 'Admin'}</span>
            <Icon name="chevron-down" />
          </button>

          {showUserMenu && (
            <div className="user-dropdown">
              <a href="#profile" className="dropdown-item">Profile</a>
              <a href="#settings" className="dropdown-item">Settings</a>
              <div className="dropdown-divider"></div> {/* Use class for divider */}
              <button className="dropdown-item logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;