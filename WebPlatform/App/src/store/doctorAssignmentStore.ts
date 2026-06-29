import { create } from 'zustand';
import { Nurse, NursePatientAssignment } from '../types/nurse';
import nurseApi from '../services/nurseApi';

interface DoctorAssignmentState {
  // State
  availableNurses: Nurse[];
  assignments: NursePatientAssignment[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchAvailableNurses: () => Promise<void>;
  assignPatientToNurse: (patientId: string, nurseId: string, doctorId: string) => Promise<NursePatientAssignment>;
  getAssignmentsForPatient: (patientId: string) => Promise<NursePatientAssignment[]>;
  reassignPatient: (patientId: string, newNurseId: string, doctorId: string) => Promise<NursePatientAssignment>;
  clearError: () => void;
}

export const useDoctorAssignmentStore = create<DoctorAssignmentState>((set, get) => ({
  // Initial state
  availableNurses: [],
  assignments: [],
  loading: false,
  error: null,

  // Fetch available nurses
  fetchAvailableNurses: async () => {
    set({ loading: true, error: null });
    try {
      const response = await nurseApi.getAllNurses({ status: 'active' });
      const nurses = response.data?.nurses || [];
      set({
        availableNurses: nurses,
        loading: false
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch available nurses', loading: false });
    }
  },

  // Assign patient to nurse
  assignPatientToNurse: async (patientId: string, nurseId: string, doctorId: string) => {
    set({ loading: true, error: null });
    try {
      const assignment = await nurseApi.createAssignment({
        nurse_id: nurseId,
        patient_id: patientId,
        assigned_by_doctor_id: doctorId
      });
      set(state => ({
        assignments: [assignment, ...state.assignments],
        loading: false
      }));
      return assignment;
    } catch (error: any) {
      set({ error: error.message || 'Failed to assign patient to nurse', loading: false });
      throw error;
    }
  },

  // Get assignments for patient
  getAssignmentsForPatient: async (patientId: string) => {
    try {
      const response = await nurseApi.getAssignments({ patient_id: patientId });
      const assignments = response.assignments || [];
      set({ assignments });
      return assignments;
    } catch (error: any) {
      set({ error: error.message || 'Failed to get patient assignments' });
      return [];
    }
  },

  // Reassign patient to different nurse
  reassignPatient: async (patientId: string, newNurseId: string, doctorId: string) => {
    set({ loading: true, error: null });
    try {
      // Get current active assignment
      const currentAssignments = get().assignments.filter(
        a => a.patient_id === patientId && a.status === 'active'
      );

      // Mark current assignment as inactive
      if (currentAssignments.length > 0) {
        await nurseApi.updateAssignmentStatus(currentAssignments[0].id, 'inactive');
      }

      // Create new assignment
      const newAssignment = await nurseApi.createAssignment({
        nurse_id: newNurseId,
        patient_id: patientId,
        assigned_by_doctor_id: doctorId
      });

      set(state => ({
        assignments: state.assignments.map(a =>
          a.patient_id === patientId && a.status === 'active'
            ? { ...a, status: 'inactive' }
            : a
        ).concat(newAssignment),
        loading: false
      }));

      return newAssignment;
    } catch (error: any) {
      set({ error: error.message || 'Failed to reassign patient', loading: false });
      throw error;
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  }
}));

export default useDoctorAssignmentStore;
