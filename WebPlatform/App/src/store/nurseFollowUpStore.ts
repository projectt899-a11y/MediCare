import { create } from 'zustand';
import { FollowUpRequest, FollowUpQuestion, FollowUpAnswer } from '../types/nurse';
import nurseApi from '../services/nurseApi';

interface FollowUpWithDetails extends FollowUpRequest {
  questions?: FollowUpQuestion[];
  answers?: FollowUpAnswer[];
}

interface NurseFollowUpState {
  // State
  followUpRequests: FollowUpRequest[];
  selectedFollowUp: FollowUpWithDetails | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchFollowUpRequests: (nurseId: string, filters?: any) => Promise<void>;
  createFollowUpRequest: (data: any) => Promise<FollowUpRequest>;
  getFollowUpDetails: (requestId: string) => Promise<FollowUpWithDetails | null>;
  selectFollowUp: (followUp: FollowUpWithDetails | null) => void;
  clearError: () => void;
}

export const useNurseFollowUpStore = create<NurseFollowUpState>((set, get) => ({
  // Initial state
  followUpRequests: [],
  selectedFollowUp: null,
  loading: false,
  error: null,

  // Fetch follow-up requests
  fetchFollowUpRequests: async (nurseId: string, filters?: any) => {
    set({ loading: true, error: null });
    try {
      const response = await nurseApi.getFollowUpRequests({
        nurse_id: nurseId,
        ...filters
      });
      const requests = response.requests || [];
      set({
        followUpRequests: requests,
        loading: false
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch follow-up requests', loading: false });
    }
  },

  // Create follow-up request
  createFollowUpRequest: async (data: any) => {
    set({ loading: true, error: null });
    try {
      const request = await nurseApi.createFollowUpRequest(data);
      set(state => ({
        followUpRequests: [request, ...state.followUpRequests],
        loading: false
      }));
      return request;
    } catch (error: any) {
      set({ error: error.message || 'Failed to create follow-up request', loading: false });
      throw error;
    }
  },

  // Get follow-up details
  getFollowUpDetails: async (requestId: string) => {
    try {
      const details = await nurseApi.getFollowUpRequestDetails(requestId);
      const followUpWithDetails: FollowUpWithDetails = {
        ...details.request,
        questions: details.questions,
        answers: details.answers
      };
      set({ selectedFollowUp: followUpWithDetails });
      return followUpWithDetails;
    } catch (error: any) {
      set({ error: error.message || 'Failed to get follow-up details' });
      return null;
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

export default useNurseFollowUpStore;
