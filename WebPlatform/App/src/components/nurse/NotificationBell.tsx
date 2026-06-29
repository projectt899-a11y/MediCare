import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import Icon from '../admin/Icon';
import '../../styles/notificationBell.css';

interface Notification {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const accessToken = useAuthStore(state => state.accessToken);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
    fetchNotifications();
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/nurses/notifications', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!response.ok) return;
      const data = await response.json();
      setNotifications(data.data || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await fetch('http://localhost:5000/api/nurses/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await fetch(`http://localhost:5000/api/nurses/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    handleMarkAsRead(notif.id);
    
    // لو كانت nurse assignment notification، روح لصفحة المريض
    if (notif.type === 'nurse_assignment') {
      navigate(`/nurse/my-patients`);
      setShowDropdown(false);
    }
  };

  return (
    <div className="notification-bell-container">
      <button
        className="bell-btn"
        onClick={() => setShowDropdown(!showDropdown)}
        aria-label="Notifications"
      >
        <Icon name="bell" className="bell-icon" />
        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="dropdown-header">
            <h3>Notifications</h3>
            <button className="close-btn" onClick={() => setShowDropdown(false)}>−</button>
          </div>

          <div className="notifications-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">No new notifications</div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  className={`notification-item ${notif.is_read ? 'read' : 'unread'}`}
                >
                  <div 
                    className="notif-content" 
                    onClick={() => handleNotificationClick(notif)}
                    style={{ cursor: notif.type === 'nurse_assignment' ? 'pointer' : 'default' }}
                  >
                    <p className="patient-name">{notif.message}</p>
                    <p className="notif-time">
                      {new Date(notif.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteNotification(notif.id)}
                    title="Delete"
                    aria-label="Delete notification"
                  >
                    ✕
                  </button>
                  {!notif.is_read && <div className="unread-dot"></div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
