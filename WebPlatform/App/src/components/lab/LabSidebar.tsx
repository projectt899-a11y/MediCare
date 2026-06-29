import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import Icon from '../patient/sub-components/Icon';
import '../../styles/labSidebar.css';

interface LabSidebarProps {
  isOpen: boolean;
}

const LabSidebar: React.FC<LabSidebarProps> = ({ isOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : '';
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/lab/home', label: 'Home', icon: 'home' },
    { path: '/lab/inbox', label: 'Inbox', icon: 'inbox' },
    { path: '/lab/processing', label: 'Processing', icon: 'upload' },
    { path: '/lab/history', label: 'History', icon: 'archive' },
    { path: '/lab/profile', label: 'Profile', icon: 'user' },
  ];

  return (
    <aside className={`lab-sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <h2>{user?.fullName || 'Lab Portal'}</h2>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item) => (
            <li key={item.path}>
              <Link 
                to={item.path} 
                className={`nav-link ${isActive(item.path)}`}
              >
                <Icon name={item.icon} />
                <span className="label">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default LabSidebar;
