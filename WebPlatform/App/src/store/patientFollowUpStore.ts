import { create } from 'zustand';
import { FollowUpRequest, FollowUpQuestion, FollowUpAnswer } from '../types/nurse';
import nurseApi from '../services/nurseApi';

interface FollowUpWithDetails extends FollowUpRequest {
  questions?: FollowUpQuestion[];
  answers?: FollowUpAnswer[];
}

interface PatientFollowUpState {
  // State
  followUpRequests: FollowUpWithDetails[];
  selectedFollowUp: FollowUpWithDetails | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchFollowUpRequests: (patientId: string) => Promise<void>;
  submitFollowUpAnswer: (data: {
    follow_up_question_id: string;
    patient_id: string;
    answer_text: string;
  }) => Promise<FollowUpAnswer>;
  selectFollowUp: (followUp: FollowUpWithDetails | null) => void;
  clearError: () => void;
}

export const usePatientFollowUpStore = create<PatientFollowUpState>((set, get) => ({
  // Initial state
  followUpRequests: [],
  selectedFollowUp: null,
  loading: false,
  error: null,

  // Fetch follow-up requests for patient
  fetchFollowUpRequests: async (patientId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await nurseApi.getFollowUpRequests({
        patient_id: patientId
      });
      const requests = response.requests || [];

      // Fetch details for each request
      const enrichedRequests = await Promise.all(
        requests.map(async (req: FollowUpRequest) => {
          try {
            const details = await nurseApi.getFollowUpRequestDetails(req.id);
            return {
              ...req,
              questions: details.questions,
              answers: details.answers
            };
          } catch (err) {
            console.error('Error fetching request details:', err);
            return req;
          }
        })
      );

      set({
        followUpRequests: enrichedRequests,
        loading: false
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch follow-up requests', loading: false });
    }
  },

  // Submit follow-up answer
  submitFollowUpAnswer: async (data: {
    follow_up_question_id: string;
    patient_id: string;
    answer_text: string;
  }) => {
    set({ loading: true, error: null });
    try {
      const answer = await nurseApi.submitFollowUpAnswer(data);
      set({ loading: false });
      return answer;
    } catch (error: any) {
      set({ error: error.message || 'Failed to submit answer', loading: false });
      throw error;
    }
  },

  // Select follow-up
  selectFollowUp: (followUp: FollowUpWithDetails | null) => {
    set({ selectedFollowUp: followUp });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  }
}));

export default usePatientFollowUpStore;
