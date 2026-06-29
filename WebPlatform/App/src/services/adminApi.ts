import api from '../lib/api';
import type{
  User,
  UserFilters,
  UserResponse,
  Specialization,
  SpecializationResponse,
  Schedule,
  ScheduleResponse,
  DashboardStats,
  DashboardResponse,
  AuditLog,
  AuditLogFilters,
  AuditLogResponse,
  ApiResponse,
  ApiError,
  SpecializationFormData,
  UserStatusUpdate,
  SpecializationAssignment,
  ScheduleFormData
} from '../types/admin';

const handleResponse = async <T>(response: any): Promise<T> => {
  // Backend returns { success: true, data: {...} }
  // axios already extracts response.data, so we get { success: true, data: {...} }
  // We need to extract the nested data property
  if (response.data && typeof response.data === 'object' && 'data' in response.data) {
    return response.data.data;
  }
  return response.data || response;
};

// ============================================================================
// USER MANAGEMENT API
// ============================================================================

export const adminApi = {
  // Get all users
  getAllUsers: async (filters?: UserFilters): Promise<UserResponse> => {
    const params = new URLSearchParams();
    if (filters?.role) params.append('role', filters.role);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await api.get(`/admin/users?${params}`);
    return handleResponse(response);
  },

  // Get user by ID
  getUserById: async (userId: string): Promise<User> => {
    const response = await api.get(`/admin/users/${userId}`);
    return handleResponse(response);
  },

  // Update user status
  updateUserStatus: async (userId: string, status: 'active' | 'inactive'): Promise<User> => {
    const response = await api.put(`/admin/users/${userId}/status`, { status });
    return handleResponse(response);
  },

  // Approve doctor registration
  approveDoctorRegistration: async (userId: string): Promise<User> => {
    const response = await api.post(`/admin/users/${userId}/approve`);
    return handleResponse(response);
  },

  // Reject doctor registration
  rejectDoctorRegistration: async (userId: string, reason?: string): Promise<User> => {
    const response = await api.post(`/admin/users/${userId}/reject`, { reason });
    return handleResponse(response);
  },

  // Assign specialization to doctor
  assignSpecializationToDoctor: async (userId: string, specializationId: string): Promise<User> => {
    const response = await api.put(`/admin/users/${userId}/specialization`, { specialization_id: specializationId });
    return handleResponse(response);
  },

  // ============================================================================
  // SPECIALIZATION MANAGEMENT API
  // ============================================================================

  // Get all specializations
  getAllSpecializations: async (): Promise<SpecializationResponse> => {
    const response = await api.get('/admin/specializations');
    return handleResponse(response);
  },

  // Create specialization
  createSpecialization: async (data: SpecializationFormData): Promise<Specialization> => {
    const response = await api.post('/admin/specializations', data);
    return handleResponse(response);
  },

  // Update specialization
  updateSpecialization: async (specializationId: string, data: SpecializationFormData): Promise<Specialization> => {
    const response = await api.put(`/admin/specializations/${specializationId}`, data);
    return handleResponse(response);
  },

  // Delete specialization
  deleteSpecialization: async (specializationId: string): Promise<void> => {
    await api.delete(`/admin/specializations/${specializationId}`);
  },

  // ============================================================================
  // DOCTOR SCHEDULE API
  // ============================================================================

  // Get doctor schedule
  getDoctorSchedule: async (doctorId: string): Promise<ScheduleResponse> => {
    const response = await api.get(`/admin/doctors/${doctorId}/schedule`);
    return handleResponse(response);
  },

  // Create or update doctor schedule
  createOrUpdateSchedule: async (doctorId: string, schedules: ScheduleFormData[]): Promise<Schedule[]> => {
    const response = await api.post(`/admin/doctors/${doctorId}/schedule`, { schedules });
    return handleResponse(response);
  },

  // Delete schedule slot
  deleteScheduleSlot: async (doctorId: string, scheduleId: string): Promise<void> => {
    await api.delete(`/admin/doctors/${doctorId}/schedule/${scheduleId}`);
  },

  // ============================================================================
  // DASHBOARD STATISTICS API
  // ============================================================================

  // Get all statistics
  getAllStatistics: async (): Promise<DashboardResponse> => {
    const response = await api.get('/admin/dashboard/statistics');
    return handleResponse(response);
  },

  // Get user statistics
  getUserStatistics: async (): Promise<any> => {
    const response = await api.get('/admin/dashboard/statistics/users');
    return handleResponse(response);
  },

  // Get case statistics
  getCaseStatistics: async (): Promise<any> => {
    const response = await api.get('/admin/dashboard/statistics/cases');
    return handleResponse(response);
  },

  // Get lab test statistics
  getLabTestStatistics: async (): Promise<any> => {
    const response = await api.get('/admin/dashboard/statistics/lab-tests');
    return handleResponse(response);
  },

  // ============================================================================
  // AUDIT LOG API
  // ============================================================================

  // Get audit logs
  getAuditLogs: async (filters?: AuditLogFilters): Promise<AuditLogResponse> => {
    const params = new URLSearchParams();
    if (filters?.action_type) params.append('action_type', filters.action_type);
    if (filters?.resource_type) params.append('resource_type', filters.resource_type);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await api.get(`/admin/audit-logs?${params}`);
    return handleResponse(response);
  },

  // Get specific audit log
  getAuditLogById: async (logId: string): Promise<AuditLog> => {
    const response = await api.get(`/admin/audit-logs/${logId}`);
    return handleResponse(response);
  },

  // Get audit logs for resource
  getResourceAuditLogs: async (resourceType: string, resourceId: string): Promise<AuditLogResponse> => {
    const response = await api.get(`/admin/audit-logs/resource/${resourceType}/${resourceId}`);
    return handleResponse(response);
  },

  // Get audit logs for admin
  getAdminAuditLogs: async (adminId: string): Promise<AuditLogResponse> => {
    const response = await api.get(`/admin/audit-logs/admin/${adminId}`);
    return handleResponse(response);
  },

  // ============================================================================
  // DOCTOR AVAILABILITY API
  // ============================================================================

  // Get doctor availability
  getDoctorAvailability: async (doctorId: string): Promise<any[]> => {
    const response = await api.get(`/admin/doctors/${doctorId}/availability`);
    return handleResponse(response);
  },

  // Save doctor availability
  saveDoctorAvailability: async (doctorId: string, changes: any): Promise<any> => {
    const response = await api.post(`/admin/doctors/${doctorId}/availability`, changes);
    return handleResponse(response);
  },

  // Validate availability slot
  validateAvailabilitySlot: async (slot: any): Promise<any> => {
    const response = await api.post('/admin/doctors/availability/validate', slot);
    return handleResponse(response);
  }
};

export default adminApi;
