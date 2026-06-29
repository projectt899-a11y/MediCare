import { create } from 'zustand';

export interface LabRequest {
  id: string;
  patient_name: string;
  doctor_name: string;
  test_type: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Rejected';
  priority: 'Normal' | 'Urgent';
  created_at: string;
  lab_id?: string;
  request_id?: string;
}

export type SortField = 'patient_name' | 'doctor_name' | 'test_type' | 'status' | 'priority' | 'created_at';
export type SortDirection = 'asc' | 'desc';

export interface RequestFilters {
  status: string[];
  priority: string[];
  searchTerm: string;
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalResults: number;
}

interface LabRequestsStore {
  // State
  requests: LabRequest[];
  filteredRequests: LabRequest[];
  filters: RequestFilters;
  sortField: SortField;
  sortDirection: SortDirection;
  pagination: PaginationState;
  isLoading: boolean;
  labId: string | null;

  // Actions
  setLabId: (labId: string) => void;
  setRequests: (requests: LabRequest[]) => void;
  setFilters: (filters: Partial<RequestFilters>) => void;
  setSortField: (field: SortField) => void;
  setSortDirection: (direction: SortDirection) => void;
  setPagination: (page: number, pageSize: number) => void;
  setIsLoading: (loading: boolean) => void;
  fetchRequests: () => Promise<void>;
  acceptRequest: (requestId: string) => Promise<void>;
  clearFilters: () => void;
  getDisplayedRequests: () => LabRequest[];
  applyFiltersAndSort: () => void;
}

import { useAuthStore } from './authStore';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Mock data for development (fallback only)
const mockRequests: LabRequest[] = [
  {
    id: '1',
    patient_name: 'John Doe',
    doctor_name: 'Dr. Smith',
    test_type: 'Blood Test',
    status: 'Pending',
    priority: 'Normal',
    created_at: '2024-01-15',
  },
  {
    id: '2',
    patient_name: 'Jane Smith',
    doctor_name: 'Dr. Johnson',
    test_type: 'X-Ray',
    status: 'Processing',
    priority: 'Urgent',
    created_at: '2024-01-14',
  },
];

export const useLabRequestsStore = create<LabRequestsStore>((set, get) => {
  // Helper function to apply filters and sorting
  const applyFiltersAndSort = () => {
    const state = get();
    const { requests, filters, sortField, sortDirection } = state;

    // Apply filters
    let filtered = requests.filter((request) => {
      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(request.status)) {
        return false;
      }

      // Priority filter
      if (filters.priority.length > 0 && !filters.priority.includes(request.priority)) {
        return false;
      }

      // Search filter (case-insensitive partial matching)
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesPatient = request.patient_name.toLowerCase().includes(searchLower);
        const matchesDoctor = request.doctor_name.toLowerCase().includes(searchLower);
        const matchesId = (request.request_id || request.id).toLowerCase().includes(searchLower);

        if (!matchesPatient && !matchesDoctor && !matchesId) {
          return false;
        }
      }

      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortField) {
        case 'patient_name':
          aValue = a.patient_name;
          bValue = b.patient_name;
          break;
        case 'doctor_name':
          aValue = a.doctor_name;
          bValue = b.doctor_name;
          break;
        case 'test_type':
          aValue = a.test_type;
          bValue = b.test_type;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'priority':
          aValue = a.priority;
          bValue = b.priority;
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string).toLowerCase();
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue as string)
          : (bValue as string).localeCompare(aValue);
      } else {
        return sortDirection === 'asc'
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

    set({
      filteredRequests: filtered,
      pagination: { ...state.pagination, totalResults: filtered.length },
    });
  };

  return {
    // Initial state
    requests: [],
    filteredRequests: [],
    filters: {
      status: [],
      priority: [],
      searchTerm: '',
    },
    sortField: 'created_at',
    sortDirection: 'desc',
    pagination: {
      currentPage: 1,
      pageSize: 20,
      totalResults: 0,
    },
    isLoading: false,
    labId: null,

    // Actions
    setLabId: (labId) => set({ labId }),

    setRequests: (requests) => set({ requests }),

    setFilters: (newFilters) => {
      const state = get();
      const updatedFilters = { ...state.filters, ...newFilters };
      set({ filters: updatedFilters });
      // Reset to page 1 when filters change
      set({ pagination: { ...state.pagination, currentPage: 1 } });
      // Apply filters
      applyFiltersAndSort();
    },

    setSortField: (field) => {
      const state = get();
      // If clicking the same field, toggle direction; otherwise set to ascending
      const newDirection =
        state.sortField === field && state.sortDirection === 'asc' ? 'desc' : 'asc';
      set({ sortField: field, sortDirection: newDirection });
      applyFiltersAndSort();
    },

    setSortDirection: (direction) => {
      set({ sortDirection: direction });
      applyFiltersAndSort();
    },

    setPagination: (page, pageSize) => {
      set({ pagination: { ...get().pagination, currentPage: page, pageSize } });
    },

    setIsLoading: (loading) => set({ isLoading: loading }),

    fetchRequests: async () => {
      set({ isLoading: true });
      try {
        const state = get();
        // Try to get labId from state or localStorage
        const labId = state.labId || localStorage.getItem('labId');
        if (!labId) {
          console.error('Lab ID not set');
          set({ isLoading: false });
          return;
        }
        if (!state.labId) set({ labId });

        const response = await fetch(
          `${API_BASE_URL}/labs/requests/list?labId=${labId}&page=1&limit=100`,
          {
            headers: {
              'Authorization': `Bearer ${useAuthStore.getState().accessToken || ''}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch requests: ${response.statusText}`);
        }

        const data = await response.json();
        // Backend returns { success, data: [...] } where data is array directly
        const raw = Array.isArray(data.data) ? data.data : (data.data?.requests || []);
        const requests = raw.map((r: any) => ({
          id: r.id,
          patient_name: r.patientName || r.patient_name || '—',
          doctor_name: r.doctorName || r.doctor_name || '—',
          test_type: r.testTypeName || r.test_type || '—',
          status: r.status,
          priority: r.priority,
          created_at: r.createdAt || r.created_at || '',
        }));
        
        set({ requests });
        applyFiltersAndSort();
      } catch (error) {
        console.error('Failed to fetch requests:', error);
        set({ requests: [] });
        applyFiltersAndSort();
      } finally {
        set({ isLoading: false });
      }
    },

    acceptRequest: async (requestId: string) => {
      set({ isLoading: true });
      try {
        const response = await fetch(
          `${API_BASE_URL}/labs/requests/${requestId}/accept`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${useAuthStore.getState().accessToken || ''}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ version: 1 }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to accept request: ${response.statusText}`);
        }

        // Update local state
        const state = get();
        const updatedRequests = state.requests.map((req) =>
          req.id === requestId ? { ...req, status: 'Processing' as const } : req
        );
        set({ requests: updatedRequests });
        applyFiltersAndSort();
      } catch (error) {
        console.error('Failed to accept request:', error);
      } finally {
        set({ isLoading: false });
      }
    },

    clearFilters: () => {
      set({
        filters: {
          status: [],
          priority: [],
          searchTerm: '',
        },
        pagination: { ...get().pagination, currentPage: 1 },
      });
      applyFiltersAndSort();
    },

    getDisplayedRequests: () => {
      const state = get();
      const { filteredRequests, pagination } = state;
      const { currentPage, pageSize } = pagination;
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      return filteredRequests.slice(startIndex, endIndex);
    },

    applyFiltersAndSort,
  };
});
