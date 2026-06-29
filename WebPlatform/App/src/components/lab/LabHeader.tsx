import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import Icon from '../patient/sub-components/Icon';
import '../../styles/labHeader.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface LabHeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

interface LabNotification {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  requestId?: string;
  request_id?: string;
}

const LabHeader: React.FC<LabHeaderProps> = ({ onToggleSidebar }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<LabNotification[]>([]);
  const navigate = useNavigate();
  const { logout, user, accessToken } = useAuthStore();

  const fetchNotifications = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${API_BASE}/labs/notifications`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.data || []);
    } catch {
      // silently ignore
    }
  }, [accessToken]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    if (!accessToken) return;
    try {
      await fetch(`${API_BASE}/labs/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {
      // silently ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Fetch every 5 seconds to show new requests quickly
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const formatTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleNotificationClick = (notification: LabNotification) => {
    // Close the notification dropdown
    setShowNotifications(false);
    
    // Navigate to the request if requestId exists
    const requestId = notification.requestId || notification.request_id;
    if (requestId) {
      navigate(`/lab/request/${requestId}`);
    } else {
      // Fallback to inbox if no requestId
      navigate('/lab/inbox');
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    
    try {
      // Delete from backend first
      if (accessToken) {
        const response = await fetch(`${API_BASE}/labs/notifications/${notificationId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        
        if (response.ok) {
          // Only remove from UI if backend delete was successful
          setNotifications(prev => prev.filter(n => n.id !== notificationId));
        } else {
          console.error('Failed to delete notification from backend');
        }
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  return (
    <header className="lab-header">
      <div className="header-left">
        <button
          className="toggle-sidebar-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Icon name="menu" />
        </button>
        <h1 className="lab-name">Laboratory Portal</h1>
      </div>

      <div className="header-right">
        {/* Notification Icon */}
        <div className="notification-container">
          <button
            className="notification-btn"
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications) fetchNotifications();
            }}
            aria-label="Notifications"
          >
            <Icon name="bell" />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <h3>Notifications</h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {unreadCount > 0 && (
                    <button
                      style={{ fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }}
                      onClick={markAllRead}
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    className="close-btn"
                    onClick={() => setShowNotifications(false)}
                    aria-label="Close notifications"
                  >
                    −
                  </button>
                </div>
              </div>
              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#888', fontSize: '14px' }}>
                    No notifications
                  </div>
                ) : (
                  notifications.slice(0, 10).map(n => (
                    <div 
                      key={n.id} 
                      className={`notification-item ${!n.is_read ? 'unread' : ''}`}
                      onClick={() => handleNotificationClick(n)}
                      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleNotificationClick(n);
                        }
                      }}
                    >
                      <div className="notification-content" style={{ flex: 1 }}>
                        <p className="notification-message">{n.message}</p>
                        <span className="notification-time">{formatTime(n.created_at)}</span>
                      </div>
                      <button
                        className="notification-delete-btn"
                        onClick={(e) => handleDeleteNotification(e, n.id)}
                        aria-label="Delete notification"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#999',
                          fontSize: '18px',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          marginLeft: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '24px',
                          minHeight: '24px',
                          borderRadius: '4px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f0f0f0';
                          e.currentTarget.style.color = '#d32f2f';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'none';
                          e.currentTarget.style.color = '#999';
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="user-menu">
          <button
            className="user-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-label="User menu"
          >
            <Icon name="user" />
            <span className="user-name">{user?.fullName || 'Lab Staff'}</span>
            <Icon name="chevron-down" />
          </button>

          {showUserMenu && (
            <div className="user-dropdown">
              <button className="dropdown-item" onClick={() => { setShowUserMenu(false); navigate('/lab/profile'); }}>
                <Icon name="user" />
                <span>Profile</span>
              </button>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item logout-btn" onClick={handleLogout}>
                <Icon name="log-out" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default LabHeader;
