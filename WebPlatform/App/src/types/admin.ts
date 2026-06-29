// User Types
export  interface User {
  id: string;
  email: string;
  name: string;
  role: 'doctor' | 'patient' | 'lab';
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  updated_at: string;
  phone?: string;
  specialization_id?: string;
  specialization?: string;
  specialty?: string;
  full_name?: string;
  account_status?: string;
  registration_date?: string;
}

export  interface UserFilters {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export  interface UserResponse {
  data: {
    users: User[];
    pagination: Pagination;
  };
  message: string;
}

// Specialization Types
export  interface Specialization {
  id: string;
  name: string;
  description: string;
  doctor_count?: number;
  created_at: string;
  updated_at: string;
}

export  interface SpecializationResponse {
  data: Specialization[];
  message: string;
}

// Schedule Types
export  interface Schedule {
  id: string;
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export  interface ScheduleResponse {
  data: Schedule[];
  message: string;
}

// Dashboard Types
export  interface DashboardStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  total_doctors: number;
  total_patients: number;
  total_labs: number;
  total_cases: number;
  total_lab_tests: number;
  pending_approvals: number;
}

export  interface UserStats {
  role: string;
  total: number;
  active: number;
  inactive: number;
  pending: number;
}

export  interface CaseStats {
  total_cases: number;
  completed_cases: number;
  pending_cases: number;
  cases_by_specialization: {
    specialization: string;
    count: number;
  }[];
}

export  interface LabTestStats {
  total_tests: number;
  completed_tests: number;
  pending_tests: number;
}

export  interface DashboardResponse {
  data: DashboardStats;
  message: string;
}

// Audit Log Types
export  interface AuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action_type: string;
  resource_type: string;
  resource_id: string;
  changes: Record<string, any>;
  status: 'success' | 'failed';
  created_at: string;
}

export  interface AuditLogFilters {
  action_type?: string;
  resource_type?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export  interface AuditLogResponse {
  data: {
    logs: AuditLog[];
    pagination: Pagination;
  };
  message: string;
}

// Pagination Types
export  interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// API Response Types
export  interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export  interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, any>;
}

// Pending Approval Types
export  interface PendingApproval {
  id: string;
  name: string;
  email: string;
  role: string;
  type: 'registration' | 'specialization_assignment';
  created_at: string;
}

// Form Types
export  interface SpecializationFormData {
  name: string;
  description: string;
}

export  interface UserStatusUpdate {
  status: 'active' | 'inactive';
}

export  interface SpecializationAssignment {
  specialization_id: string;
}

export  interface ScheduleFormData {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}