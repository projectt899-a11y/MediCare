import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useNotificationStore } from '../../store/notificationStore';
import '../../styles/notificationDropdown.css';

interface Notification {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
}

// Validation utilities
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

const isValidNotificationType = (type: string): boolean => {
  const validTypes = [
    'new_appointment',
    'cancelled_appointment',
    'new_message',
    'lab_request_accepted',
    'lab_request_rejected',
    'lab_result_ready',
  ];
  return validTypes.includes(type);
};

const isValidISO8601 = (dateString: string): boolean => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

const validateNotification = (notification: any): notification is Notification => {
  if (!notification || typeof notification !== 'object') {
    console.error('Invalid notification: not an object');
    return false;
  }

  if (!notification.id || !isValidUUID(notification.id)) {
    console.error(`Invalid notification id: ${notification.id}`);
    return false;
  }

  if (!notification.type || !isValidNotificationType(notification.type)) {
    console.error(`Invalid notification type: ${notification.type}`);
    return false;
  }

  if (!notification.message || typeof notification.message !== 'string' || notification.message.trim() === '') {
    console.error('Invalid notification message: must be non-empty string');
    return false;
  }

  if (typeof notification.is_read !== 'boolean') {
    console.error('Invalid notification is_read: must be boolean');
    return false;
  }

  if (!notification.created_at || !isValidISO8601(notification.created_at)) {
    console.error(`Invalid notification created_at: ${notification.created_at}`);
    return false;
  }

  return true;
};

// XSS prevention: sanitize HTML
const sanitizeMessage = (message: string): string => {
  const div = document.createElement('div');
  div.textContent = message;
  return div.innerHTML;
};

// Debounce utility
const debounce = <T extends (...args: any[]) => any>(func: T, wait: number) => {
  let timeout: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
};

const NotificationDropdown = ({ isOpen, onClose, unreadCount }: NotificationDropdownProps) => {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { setNotifications: storeSetNotifications, removeNotification: storeRemoveNotification, markNotificationRead: storeMarkRead, markAllRead: storeMarkAllRead } = useNotificationStore();

  // Debounced refetch
  const debouncedRefetch = useMemo(
    () => debounce(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/doctor/notifications');
        const validNotifications = res.data.filter(validateNotification);
        setNotifications(validNotifications);
        storeSetNotifications(validNotifications);
      } catch (err: any) {
        if (err.response?.status === 401) {
          navigate('/login');
        } else {
          setError('Failed to load notifications');
        }
      } finally {
        setLoading(false);
      }
    }, 500),
    [navigate, storeSetNotifications]
  );

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      // Try to load from cache first
      const cached = localStorage.getItem('notifications');
      if (cached) {
        try {
          const cachedNotifications = JSON.parse(cached);
          setNotifications(cachedNotifications);
        } catch (e) {
          console.error('Failed to parse cached notifications');
        }
      }
      // Then fetch fresh data
      debouncedRefetch();
    }
  }, [isOpen, debouncedRefetch]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Close dropdown on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen, onClose]);

  // Clear action error after 3 seconds
  useEffect(() => {
    if (actionError) {
      const timer = setTimeout(() => setActionError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [actionError]);

  const handleMarkAsRead = useCallback(async (notification: Notification) => {
    if (notification.is_read) return;

    try {
      await api.patch(`/doctor/notifications/${notification.id}/read`);
      storeMarkRead(notification.id);
      setNotifications(prev =>
        prev.map(n => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      setActionError('Failed to mark notification as read');
    }
  }, [storeMarkRead]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await api.delete(`/doctor/notifications/${id}`);
      storeRemoveNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
      setActionError('Failed to remove notification');
    }
  }, [storeRemoveNotification]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await api.patch('/doctor/notifications/read-all');
      storeMarkAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      setActionError('Failed to mark notifications as read');
    }
  }, [storeMarkAllRead]);

  const handleNotificationClick = useCallback(async (notification: Notification) => {
    // Mark as read before navigation
    if (!notification.is_read) {
      await handleMarkAsRead(notification);
    }

    // Navigate based on type
    const typeRoute: Record<string, string> = {
      new_appointment: '/doctor/appointments',
      cancelled_appointment: '/doctor/appointments',
      new_message: '/doctor/messages',
      lab_request_accepted: '/doctor/lab',
      lab_request_rejected: '/doctor/lab',
      lab_result_ready: '/doctor/lab?tab=results',
    };

    const route = typeRoute[notification.type];
    if (route) {
      navigate(route);
      onClose();
    } else {
      console.warn(`Unknown notification type: ${notification.type}`);
    }
  }, [handleMarkAsRead, navigate, onClose]);

  const formatTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const typeIcon: Record<string, string> = {
    new_appointment: '📅',
    cancelled_appointment: '❌',
    new_message: '💬',
    lab_request_accepted: '🧪',
    lab_request_rejected: '🚫',
    lab_result_ready: '✅',
  };

  if (!isOpen) return null;

  return (
    <div className="notification-dropdown" ref={dropdownRef} role="dialog" aria-label="Notifications">
      <div className="notification-dropdown-header">
        <h3>Notifications</h3>
        {unreadCount > 0 && (
          <button 
            className="mark-all-read-btn" 
            onClick={handleMarkAllRead}
            aria-label="Mark all notifications as read"
          >
            Mark all read
          </button>
        )}
      </div>

      {actionError && (
        <div className="notification-action-error">
          <p>{actionError}</p>
        </div>
      )}

      <div className="notification-dropdown-content">
        {loading && (
          <div className="notification-loading">
            <div className="spinner"></div>
            <p>Loading notifications...</p>
          </div>
        )}

        {error && (
          <div className="notification-error">
            <p>{error}</p>
            <button className="retry-btn" onClick={() => debouncedRefetch()}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && notifications.length === 0 && (
          <div className="notification-empty">
            <p>No notifications yet</p>
          </div>
        )}

        {!loading && !error && notifications.length > 0 && (
          <div className="notification-list" role="list">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                role="listitem"
                onClick={() => handleNotificationClick(notification)}
              >
                <span className="notification-icon" aria-hidden="true">
                  {typeIcon[notification.type] || '🔔'}
                </span>
                <div className="notification-content">
                  <p className="notification-message">{sanitizeMessage(notification.message)}</p>
                  <span className="notification-time">
                    {formatTime(notification.created_at)}
                  </span>
                </div>
                <div className="notification-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="notification-delete-btn"
                    onClick={() => handleDelete(notification.id)}
                    title="Delete"
                    aria-label={`Delete notification: ${notification.message}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(NotificationDropdown);
