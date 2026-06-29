import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from './Icon';
import '../../styles/adminSidebar.css';

interface SidebarProps {
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <aside className={`admin-sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <h2>Admin Panel</h2>
      </div>

      <nav className="sidebar-nav">
        <ul>
          <li>
            <Link to="/admin/dashboard" className={`nav-link ${isActive('/admin/dashboard')}`}>
              <Icon name="dashboard" />
              <span className="label">Dashboard</span>
            </Link>
          </li>
          <li>
            <Link to="/admin/nurses" className={`nav-link ${isActive('/admin/nurses')}`}>
              <Icon name="nurses" />
              <span className="label">Nurses</span>
            </Link>
          </li>
          <li>
            <Link to="/admin/users" className={`nav-link ${isActive('/admin/users')}`}>
              <Icon name="users" />
              <span className="label">Users</span>
            </Link>
          </li>
          <li>
            <Link to="/admin/specializations" className={`nav-link ${isActive('/admin/specializations')}`}>
              <Icon name="specializations" />
              <span className="label">Specializations</span>
            </Link>
          </li>
          <li>
            <Link to="/admin/test-types" className={`nav-link ${isActive('/admin/test-types')}`}>
              <Icon name="lab" />
              <span className="label">Test Types</span>
            </Link>
          </li>
          <li>
            <Link to="/admin/audit-logs" className={`nav-link ${isActive('/admin/audit-logs')}`}>
              <Icon name="audit-logs" />
              <span className="label">Audit Logs</span>
            </Link>
          </li>
          <li>
            <Link to="/admin/settings" className={`nav-link ${isActive('/admin/settings')}`}>
              <Icon name="settings" />
              <span className="label">Settings</span>
            </Link>
          </li>
        </ul>
      </nav>

      <div className="sidebar-footer">
        <p>Admin Module v1.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;