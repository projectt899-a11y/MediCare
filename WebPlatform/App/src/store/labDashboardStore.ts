import { create } from 'zustand';
import { useAuthStore } from './authStore';

export interface DashboardStats {
  total_requests: number;
  pending_requests: number;
  processing_requests: number;
  completed_today: number;
}

export interface RecentRequest {
  id: string;
  patient_name: string;
  test_type: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Rejected';
  created_at: string;
}

export interface Notification {
  id: string;
  patient_name: string;
  test_type: string;
  status: string;
  priority: 'Normal' | 'Urgent';
  created_at: string;
}

interface LabDashboardStore {
  stats: DashboardStats;
  recentRequests: RecentRequest[];
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date | null;
  labId: string | null;
  setLabId: (labId: string) => void;
  setStats: (stats: DashboardStats) => void;
  setRecentRequests: (requests: RecentRequest[]) => void;
  setNotifications: (notifications: Notification[]) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchDashboardData: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthToken = (): string => useAuthStore.getState().accessToken || '';

const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
      ...options.headers,
    },
  });
};

// Normalize a raw request from backend (camelCase) to our interface (snake_case)
const normalizeRequest = (r: any) => ({
  id: r.id,
  patient_name: r.patientName || r.patient_name || '—',
  test_type: r.testTypeName || r.test_type || '—',
  lab_name: r.labName || r.lab_name || '—',
  status: r.status,
  priority: r.priority,
  created_at: r.createdAt || r.created_at || '',
});

const processRequests = (raw: any[]) => {
  const requests = raw.map(normalizeRequest);

  const stats: DashboardStats = {
    total_requests: requests.length,
    pending_requests: requests.filter(r => r.status === 'Pending').length,
    processing_requests: requests.filter(r => r.status === 'Processing').length,
    completed_today: requests.filter(r =>
      r.status === 'Completed' &&
      new Date(r.created_at).toDateString() === new Date().toDateString()
    ).length,
  };

  const recentRequests = requests.slice(0, 10) as RecentRequest[];

  const notifications = requests
    .filter(r => r.priority === 'Urgent' || r.status === 'Pending')
    .slice(0, 5)
    .map(r => ({ ...r })) as Notification[];

  return { stats, recentRequests, notifications };
};

export const useLabDashboardStore = create<LabDashboardStore>((set, get) => ({
  stats: { total_requests: 0, pending_requests: 0, processing_requests: 0, completed_today: 0 },
  recentRequests: [],
  notifications: [],
  isLoading: false,
  error: null,
  lastRefresh: null,
  labId: null,

  setLabId: (labId) => set({ labId }),
  setStats: (stats) => set({ stats }),
  setRecentRequests: (requests) => set({ recentRequests: requests }),
  setNotifications: (notifications) => set({ notifications }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  fetchDashboardData: async () => {
    set({ isLoading: true, error: null });
    try {
      const state = get();
      const labId = state.labId || localStorage.getItem('labId');
      if (!labId) { set({ isLoading: false }); return; }
      if (!state.labId) set({ labId });

      const res = await apiCall(`/labs/requests/list?labId=${labId}&page=1&limit=100`);
      if (!res.ok) throw new Error(`Failed to fetch requests: ${res.statusText}`);

      const json = await res.json();
      // Backend returns { success, data: [...] } where data is array directly
      const raw = Array.isArray(json.data) ? json.data : (json.data?.requests || []);
      const { stats, recentRequests, notifications } = processRequests(raw);

      set({ stats, recentRequests, notifications, lastRefresh: new Date() });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  refreshDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const state = get();
      const labId = state.labId || localStorage.getItem('labId');
      if (!labId) { set({ isLoading: false }); return; }
      if (!state.labId) set({ labId });

      const res = await apiCall(`/labs/requests/list?labId=${labId}&page=1&limit=100`);
      if (!res.ok) throw new Error(`Failed to fetch requests: ${res.statusText}`);

      const json = await res.json();
      const raw = Array.isArray(json.data) ? json.data : (json.data?.requests || []);
      const { stats, recentRequests, notifications } = processRequests(raw);

      set({ stats, recentRequests, notifications, lastRefresh: new Date() });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      console.error('Failed to refresh dashboard:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
