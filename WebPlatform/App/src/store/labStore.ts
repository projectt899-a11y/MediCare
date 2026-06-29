import { create } from 'zustand';

export interface Lab {
  id: string;
  user_id: string;
  name: string;
  address: string;
  phone_number: string;
  email: string;
  license_number: string;
  license_file_path?: string;
  license_expiration_date?: string;
  status: 'Pending Approval' | 'Approved' | 'Rejected' | 'Inactive';
  created_at: string;
  updated_at: string;
}

export interface LabStaff {
  id: string;
  user_id: string;
  lab_id: string;
  full_name: string;
  email: string;
  role: 'Lab Technician' | 'Lab Manager' | 'Lab Admin';
  status: 'Active' | 'Inactive' | 'Suspended';
  created_at: string;
  updated_at: string;
}

export interface TestType {
  id: string;
  name: string;
  description?: string;
  status: 'Active' | 'Inactive';
  custom_fields: CustomField[];
  created_at: string;
  updated_at: string;
}

export interface CustomField {
  name: string;
  type: 'text' | 'number' | 'dropdown' | 'date';
  label: string;
  required: boolean;
  options?: string[];
}

interface LabStore {
  // State
  currentLab: Lab | null;
  labStaff: LabStaff[];
  testTypes: TestType[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentLab: (lab: Lab) => void;
  fetchLabDetails: (labId: string) => Promise<void>;
  updateLabInfo: (labId: string, data: Partial<Lab>) => Promise<void>;
  fetchLabStaff: (labId: string) => Promise<void>;
  addStaffMember: (labId: string, staff: Partial<LabStaff>) => Promise<void>;
  removeStaffMember: (labId: string, staffId: string) => Promise<void>;
  fetchTestTypes: (labId: string) => Promise<void>;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

import { useAuthStore } from './authStore';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper function to get auth token
const getAuthToken = (): string => {
  return useAuthStore.getState().accessToken || '';
};

// Helper function to make API calls
const apiCall = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getAuthToken()}`,
    ...options.headers,
  };

  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
};

export const useLabStore = create<LabStore>((set, get) => ({
  // Initial state
  currentLab: null,
  labStaff: [],
  testTypes: [],
  isLoading: false,
  error: null,

  // Actions
  setCurrentLab: (lab) => set({ currentLab: lab }),

  fetchLabDetails: async (labId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiCall(`/labs/${labId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch lab details: ${response.statusText}`);
      }

      const data = await response.json();
      set({ currentLab: data.data });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to fetch lab details:', error);
      set({ error: errorMessage });
    } finally {
      set({ isLoading: false });
    }
  },

  updateLabInfo: async (labId, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiCall(`/labs/${labId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to update lab info: ${response.statusText}`);
      }

      const result = await response.json();
      set({ currentLab: result.data });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to update lab info:', error);
      set({ error: errorMessage });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchLabStaff: async (labId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiCall(`/labs/${labId}/staff`);

      if (!response.ok) {
        throw new Error(`Failed to fetch lab staff: ${response.statusText}`);
      }

      const data = await response.json();
      set({ labStaff: data.data?.staff || [] });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to fetch lab staff:', error);
      set({ error: errorMessage });
    } finally {
      set({ isLoading: false });
    }
  },

  addStaffMember: async (labId, staff) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiCall(`/labs/${labId}/staff`, {
        method: 'POST',
        body: JSON.stringify(staff),
      });

      if (!response.ok) {
        throw new Error(`Failed to add staff member: ${response.statusText}`);
      }

      const result = await response.json();
      const state = get();
      set({ labStaff: [...state.labStaff, result.data] });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to add staff member:', error);
      set({ error: errorMessage });
    } finally {
      set({ isLoading: false });
    }
  },

  removeStaffMember: async (labId, staffId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiCall(`/labs/${labId}/staff/${staffId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to remove staff member: ${response.statusText}`);
      }

      const state = get();
      set({
        labStaff: state.labStaff.filter((staff) => staff.id !== staffId),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to remove staff member:', error);
      set({ error: errorMessage });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchTestTypes: async (labId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiCall(`/labs/${labId}/test-types`);

      if (!response.ok) {
        throw new Error(`Failed to fetch test types: ${response.statusText}`);
      }

      const data = await response.json();
      set({ testTypes: data.data?.testTypes || [] });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to fetch test types:', error);
      set({ error: errorMessage });
    } finally {
      set({ isLoading: false });
    }
  },

  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
