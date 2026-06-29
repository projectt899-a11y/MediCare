import { create } from 'zustand';
import { Nurse, NurseFilters, Pagination } from '../types/nurse';
import nurseApi from '../services/nurseApi';

interface NurseAdminState {
  // State
  nurses: Nurse[];
  selectedNurse: Nurse | null;
  loading: boolean;
  error: string | null;
  pagination: Pagination;
  filters: NurseFilters;

  // Actions
  fetchNurses: (filters?: NurseFilters) => Promise<void>;
  createNurse: (data: any) => Promise<Nurse>;
  updateNurse: (nurseId: string, data: Partial<Nurse>) => Promise<Nurse>;
  deactivateNurse: (nurseId: string) => Promise<Nurse>;
  reactivateNurse: (nurseId: string) => Promise<Nurse>;
  selectNurse: (nurse: Nurse | null) => void;
  setFilters: (filters: NurseFilters) => void;
  setPagination: (pagination: Pagination) => void;
  clearError: () => void;
}

export const useNurseAdminStore = create<NurseAdminState>((set, get) => ({
  // Initial state
  nurses: [],
  selectedNurse: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  },
  filters: {},

  // Fetch all nurses
  fetchNurses: async (filters?: NurseFilters) => {
    set({ loading: true, error: null });
    try {
      const response = await nurseApi.getAllNurses(filters);
      const data = response.data || response;
      set({
        nurses: data.nurses || [],
        pagination: data.pagination || get().pagination,
        filters: filters || get().filters
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch nurses' });
    } finally {
      set({ loading: false });
    }
  },

  // Create new nurse
  createNurse: async (data: any) => {
    set({ loading: true, error: null });
    try {
      const nurse = await nurseApi.createNurse(data);
      set(state => ({
        nurses: [nurse, ...state.nurses],
        loading: false
      }));
      return nurse;
    } catch (error: any) {
      set({ error: error.message || 'Failed to create nurse', loading: false });
      throw error;
    }
  },

  // Update nurse profile
  updateNurse: async (nurseId: string, data: Partial<Nurse>) => {
    set({ loading: true, error: null });
    try {
      const updatedNurse = await nurseApi.updateNurse(nurseId, data);
      set(state => ({
        nurses: state.nurses.map(n => n.id === nurseId ? updatedNurse : n),
        selectedNurse: state.selectedNurse?.id === nurseId ? updatedNurse : state.selectedNurse,
        loading: false
      }));
      return updatedNurse;
    } catch (error: any) {
      set({ error: error.message || 'Failed to update nurse', loading: false });
      throw error;
    }
  },

  // Deactivate nurse
  deactivateNurse: async (nurseId: string) => {
    set({ loading: true, error: null });
    try {
      const updatedNurse = await nurseApi.updateNurseStatus(nurseId, 'inactive');
      set(state => ({
        nurses: state.nurses.map(n => n.id === nurseId ? updatedNurse : n),
        selectedNurse: state.selectedNurse?.id === nurseId ? updatedNurse : state.selectedNurse,
        loading: false
      }));
      return updatedNurse;
    } catch (error: any) {
      set({ error: error.message || 'Failed to deactivate nurse', loading: false });
      throw error;
    }
  },

  // Reactivate nurse
  reactivateNurse: async (nurseId: string) => {
    set({ loading: true, error: null });
    try {
      const updatedNurse = await nurseApi.updateNurseStatus(nurseId, 'active');
      set(state => ({
        nurses: state.nurses.map(n => n.id === nurseId ? updatedNurse : n),
        selectedNurse: state.selectedNurse?.id === nurseId ? updatedNurse : state.selectedNurse,
        loading: false
      }));
      return updatedNurse;
    } catch (error: any) {
      set({ error: error.message || 'Failed to reactivate nurse', loading: false });
      throw error;
    }
  },

  // Select nurse
  selectNurse: (nurse: Nurse | null) => {
    set({ selectedNurse: nurse });
  },

  // Set filters
  setFilters: (filters: NurseFilters) => {
    set({ filters });
  },

  // Set pagination
  setPagination: (pagination: Pagination) => {
    set({ pagination });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  }
}));

export default useNurseAdminStore;
