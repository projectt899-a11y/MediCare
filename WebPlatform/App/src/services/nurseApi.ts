import api from '../lib/api';
import type {
  Nurse,
  NurseFormData,
  NurseFilters,
  NurseResponse,
  NursePatientAssignment,
  FollowUpRequest,
  FollowUpQuestion,
  FollowUpAnswer,
  AssignedPatient
} from '../types/nurse';

const handleResponse = async <T>(response: any): Promise<T> => {
  if (response.data && typeof response.data === 'object' && 'data' in response.data) {
    return response.data.data;
  }
  return response.data || response;
};

// ============================================================================
// NURSE MANAGEMENT API (Admin)
// ============================================================================

export const nurseApi = {
  // Create new nurse
  createNurse: async (data: Omit<NurseFormData, 'confirm_password'>): Promise<Nurse> => {
    const response = await api.post('/nurses', data);
    return handleResponse(response);
  },

  // Get all nurses
  getAllNurses: async (filters?: NurseFilters): Promise<NurseResponse> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await api.get(`/nurses?${params}`);
    return handleResponse(response);
  },

  // Get nurse by ID
  getNurseById: async (nurseId: string): Promise<Nurse> => {
    const response = await api.get(`/nurses/${nurseId}`);
    return handleResponse(response);
  },

  // Update nurse profile
  updateNurse: async (nurseId: string, data: Partial<Nurse>): Promise<Nurse> => {
    const response = await api.put(`/nurses/${nurseId}`, data);
    return handleResponse(response);
  },

  // Update nurse status
  updateNurseStatus: async (nurseId: string, status: 'active' | 'inactive' | 'suspended'): Promise<Nurse> => {
    const response = await api.put(`/nurses/${nurseId}/status`, { status });
    return handleResponse(response);
  },

  // ============================================================================
  // NURSE-PATIENT ASSIGNMENT API
  // ============================================================================

  // Create assignment
  createAssignment: async (data: {
    nurse_id: string;
    patient_id: string;
    assigned_by_doctor_id: string;
  }): Promise<NursePatientAssignment> => {
    const response = await api.post('/nurse-patient-assignments', data);
    return handleResponse(response);
  },

  // Get assignments
  getAssignments: async (filters?: {
    nurse_id?: string;
    patient_id?: string;
    status?: string;
  }): Promise<{ assignments: NursePatientAssignment[] }> => {
    const params = new URLSearchParams();
    if (filters?.nurse_id) params.append('nurse_id', filters.nurse_id);
    if (filters?.patient_id) params.append('patient_id', filters.patient_id);
    if (filters?.status) params.append('status', filters.status);

    const response = await api.get(`/nurse-patient-assignments?${params}`);
    return handleResponse(response);
  },

  // Update assignment status
  updateAssignmentStatus: async (assignmentId: string, status: 'active' | 'inactive'): Promise<NursePatientAssignment> => {
    const response = await api.put(`/nurse-patient-assignments/${assignmentId}`, { status });
    return handleResponse(response);
  },

  // ============================================================================
  // FOLLOW-UP REQUEST API
  // ============================================================================

  // Create follow-up request
  createFollowUpRequest: async (data: {
    nurse_id: string;
    patient_id: string;
    deadline?: string;
    questions: Array<{
      question_text: string;
      question_order: number;
    }>;
  }): Promise<FollowUpRequest> => {
    const response = await api.post('/follow-up-requests', data);
    return handleResponse(response);
  },

  // Get follow-up requests
  getFollowUpRequests: async (filters?: {
    nurse_id?: string;
    patient_id?: string;
    status?: string;
  }): Promise<FollowUpRequest[]> => {
    const params = new URLSearchParams();
    if (filters?.nurse_id) params.append('nurse_id', filters.nurse_id);
    if (filters?.patient_id) params.append('patient_id', filters.patient_id);
    if (filters?.status) params.append('status', filters.status);

    const url = `/patient/follow-up-requests?${params}`;
    
    try {
      const response = await api.get(url);
      return handleResponse(response);
    } catch (error: any) {
      throw error;
    }
  },

  // Get follow-up request details
  getFollowUpRequestDetails: async (requestId: string): Promise<{
    request: FollowUpRequest;
    questions: FollowUpQuestion[];
    answers: FollowUpAnswer[];
  }> => {
    const response = await api.get(`/patient/follow-up-requests/${requestId}`);
    return handleResponse(response);
  },

  // ============================================================================
  // FOLLOW-UP QUESTION API
  // ============================================================================

  // Get questions for a request
  getFollowUpQuestions: async (requestId: string): Promise<FollowUpQuestion[]> => {
    const response = await api.get(`/patient/follow-up-requests/${requestId}/questions`);
    return handleResponse(response);
  },

  // ============================================================================
  // FOLLOW-UP ANSWER API
  // ============================================================================

  // Submit answer
  submitFollowUpAnswer: async (data: {
    follow_up_question_id: string;
    patient_id: string;
    answer_text: string;
  }): Promise<FollowUpAnswer> => {
    const response = await api.post('/patient/follow-up-answers', data);
    return handleResponse(response);
  },

  // Get answers for a question
  getAnswersForQuestion: async (questionId: string): Promise<FollowUpAnswer[]> => {
    const response = await api.get(`/patient/follow-up-questions/${questionId}/answers`);
    return handleResponse(response);
  },

  // ============================================================================
  // NURSE PATIENT QUERIES
  // ============================================================================

  // Get patients assigned to nurse
  getNursePatients: async (nurseId: string): Promise<AssignedPatient[]> => {
    const response = await api.get(`/nurses/${nurseId}/patients`);
    return handleResponse(response);
  },

  // Get nurses assigned to patient
  getPatientNurses: async (patientId: string): Promise<Nurse[]> => {
    const url = `/patient/${patientId}/nurses`;
    
    try {
      const response = await api.get(url);
      return handleResponse(response);
    } catch (error: any) {
      throw error;
    }
  }
};

export default nurseApi;
