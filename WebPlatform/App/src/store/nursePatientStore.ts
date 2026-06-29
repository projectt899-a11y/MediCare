import { create } from 'zustand';
import { AssignedPatient } from '../types/nurse';
import nurseApi from '../services/nurseApi';

interface NursePatientState {
  // State
  patients: AssignedPatient[];
  selectedPatient: AssignedPatient | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchAssignedPatients: (nurseId: string) => Promise<void>;
  getPatientDetails: (patientId: string) => Promise<AssignedPatient | null>;
  selectPatient: (patient: AssignedPatient | null) => void;
  clearError: () => void;
}

export const useNursePatientStore = create<NursePatientState>((set, get) => ({
  // Initial state
  patients: [],
  selectedPatient: null,
  loading: false,
  error: null,

  // Fetch all patients assigned to nurse
  fetchAssignedPatients: async (nurseId: string) => {
    set({ loading: true, error: null });
    try {
      const patients = await nurseApi.getNursePatients(nurseId);
      set({
        patients: patients || [],
        loading: false
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch patients', loading: false });
    }
  },

  // Get patient details
  getPatientDetails: async (patientId: string) => {
    try {
      const patients = get().patients;
      const patient = patients.find(p => p.id === patientId);
      if (patient) {
        return patient;
      }
      return null;
    } catch (error: any) {
      set({ error: error.message || 'Failed to get patient details' });
      return null;
    }
  },

  // Select patient
  selectPatient: (patient: AssignedPatient | null) => {
    set({ selectedPatient: patient });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  }
}));

export default useNursePatientStore;
