// Nurse Types
export interface Nurse {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  gender: 'male' | 'female' | 'other';
  account_status: 'active' | 'inactive' | 'suspended';
  role: 'nurse';
  created_at: string;
  updated_at: string;
  registration_date?: string;
}

export interface NurseFormData {
  full_name: string;
  phone_number: string;
  gender: 'male' | 'female' | 'other';
  email: string;
  password: string;
  confirm_password: string;
}

export interface NurseFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface NurseResponse {
  data: {
    nurses: Nurse[];
    pagination: Pagination;
  };
  message: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Nurse-Patient Assignment Types
export interface NursePatientAssignment {
  id: string;
  nurse_id: string;
  patient_id: string;
  assigned_by_doctor_id: string;
  assignment_date: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// Follow-up Request Types
export interface FollowUpRequest {
  id: string;
  nurse_id?: string;
  nurse_name?: string;
  patient_id: string;
  doctor_id?: string;
  title?: string;
  description?: string;
  status: 'pending' | 'completed' | 'overdue';
  deadline?: string;
  created_at: string;
  updated_at?: string;
}

export interface FollowUpQuestion {
  id: string;
  request_id: string;
  question: string;
  question_order?: number;
  question_text?: string;
  follow_up_request_id?: string;
  created_at?: string;
}

export interface FollowUpAnswer {
  id: string;
  request_id?: string;
  question_id: string;
  follow_up_question_id?: string;
  patient_id: string;
  answer?: string;
  answer_text?: string;
  created_at: string;
}

// Patient Types (for nurse module)
export interface Patient {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  account_status: 'active' | 'inactive';
  created_at: string;
}

export interface AssignedPatient extends Patient {
  assignment_date: string;
  assignment_status: 'pending follow-up' | 'completed' | 'in-progress';
}
