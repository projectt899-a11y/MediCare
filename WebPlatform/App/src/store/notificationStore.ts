import { create } from 'zustand';

// Notification interface for type safety
export interface Notification {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationState {
  unreadCount: number;
  flash: boolean;
  notifications: Notification[];
  
  // Existing methods
  setUnreadCount: (count: number) => void;
  clearUnread: () => void;
  triggerFlash: () => void;
  
  // New methods for dropdown
  setNotifications: (notifications: Notification[]) => void;
  removeNotification: (id: string) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
}

const NOTIFICATIONS_STORAGE_KEY = 'notifications';
const UNREAD_COUNT_STORAGE_KEY = 'unreadCount';

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  flash: false,
  notifications: [],
  
  setUnreadCount: (count) => {
    set({ unreadCount: count });
    localStorage.setItem(UNREAD_COUNT_STORAGE_KEY, JSON.stringify(count));
  },
  
  clearUnread: () => {
    set({ unreadCount: 0 });
    localStorage.setItem(UNREAD_COUNT_STORAGE_KEY, JSON.stringify(0));
  },
  
  triggerFlash: () => {
    set({ flash: true });
    setTimeout(() => set({ flash: false }), 1000);
  },
  
  setNotifications: (notifications) => {
    set({ notifications });
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
    
    // Calculate unread count from notifications
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    set({ unreadCount });
    localStorage.setItem(UNREAD_COUNT_STORAGE_KEY, JSON.stringify(unreadCount));
  },
  
  removeNotification: (id) => {
    const state = get();
    const notification = state.notifications.find((n) => n.id === id);
    const updatedNotifications = state.notifications.filter((n) => n.id !== id);
    
    set({ notifications: updatedNotifications });
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updatedNotifications));
    
    // Decrement unread count if the deleted notification was unread
    if (notification && !notification.is_read) {
      const newUnreadCount = state.unreadCount - 1;
      set({ unreadCount: newUnreadCount });
      localStorage.setItem(UNREAD_COUNT_STORAGE_KEY, JSON.stringify(newUnreadCount));
    }
  },
  
  markNotificationRead: (id) => {
    const state = get();
    const notification = state.notifications.find((n) => n.id === id);
    
    if (notification && !notification.is_read) {
      const updatedNotifications = state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      );
      
      set({ notifications: updatedNotifications });
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updatedNotifications));
      
      // Decrement unread count
      const newUnreadCount = state.unreadCount - 1;
      set({ unreadCount: newUnreadCount });
      localStorage.setItem(UNREAD_COUNT_STORAGE_KEY, JSON.stringify(newUnreadCount));
    }
  },
  
  markAllRead: () => {
    const state = get();
    const updatedNotifications = state.notifications.map((n) => ({
      ...n,
      is_read: true,
    }));
    
    set({ notifications: updatedNotifications });
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updatedNotifications));
    
    set({ unreadCount: 0 });
    localStorage.setItem(UNREAD_COUNT_STORAGE_KEY, JSON.stringify(0));
  },
}));
