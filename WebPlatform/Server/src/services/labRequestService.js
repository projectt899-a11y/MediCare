/**
 * Lab Request Service
 * Handles all lab request operations including listing, filtering, and searching
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get lab requests with filtering, searching, and pagination
 * Supports filtering by status, priority, date range
 * Supports searching by patient name, doctor name, request ID
 */
const getLabRequests = async (labId, filters = {}, pagination = {}) => {
  try {
    const {
      status = null,
      priority = null,
      startDate = null,
      endDate = null,
      searchTerm = null,
      searchField = null // 'patient_name', 'doctor_name', or 'request_id'
    } = filters;

    const {
      page = 1,
      limit = 20
    } = pagination;

    // Start building the query
    let query = supabase
      .from('lab_requests')
      .select(
        `
        id,
        doctor_id,
        patient_id,
        lab_id,
        test_type_id,
        status,
        priority,
        doctor_notes,
        rejection_reason,
        accepted_by,
        accepted_at,
        rejected_by,
        rejected_at,
        version,
        created_at,
        updated_at,
        doctors(full_name),
        patients(full_name),
        test_types(name)
        `,
        { count: 'exact' }
      )
      .eq('lab_id', labId)
      .eq('is_deleted', false);

    // Apply status filter
    if (status) {
      if (Array.isArray(status)) {
        // Support multiple status values
        query = query.in('status', status);
      } else {
        query = query.eq('status', status);
      }
    }

    // Apply priority filter
    if (priority) {
      if (Array.isArray(priority)) {
        // Support multiple priority values
        query = query.in('priority', priority);
      } else {
        query = query.eq('priority', priority);
      }
    }

    // Apply date range filter
    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Apply search filter
    if (searchTerm) {
      if (searchField === 'request_id') {
        // Search by request ID (exact match or partial)
        query = query.ilike('id', `%${searchTerm}%`);
      } else if (searchField === 'patient_name') {
        // Search by patient name - need to filter after fetching due to join
        // We'll handle this in post-processing
      } else if (searchField === 'doctor_name') {
        // Search by doctor name - need to filter after fetching due to join
        // We'll handle this in post-processing
      }
    }

    // Sort by created_at descending (most recent first)
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Post-process for name-based searches
    let filteredData = data;
    if (searchTerm && (searchField === 'patient_name' || searchField === 'doctor_name')) {
      filteredData = data.filter(request => {
        if (searchField === 'patient_name') {
          return request.patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
        } else if (searchField === 'doctor_name') {
          return request.doctors?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return true;
      });
    }

    // Transform the data to a more usable format
    const transformedData = filteredData.map(request => ({
      id: request.id,
      doctorId: request.doctor_id,
      patientId: request.patient_id,
      labId: request.lab_id,
      testTypeId: request.test_type_id,
      status: request.status,
      priority: request.priority,
      doctorNotes: request.doctor_notes,
      rejectionReason: request.rejection_reason,
      acceptedBy: request.accepted_by,
      acceptedAt: request.accepted_at,
      rejectedBy: request.rejected_by,
      rejectedAt: request.rejected_at,
      version: request.version,
      createdAt: request.created_at,
      updatedAt: request.updated_at,
      doctorName: request.doctors?.full_name,
      patientName: request.patients?.full_name,
      testTypeName: request.test_types?.name
    }));

    return {
      requests: transformedData,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
        resultsCount: filteredData.length
      }
    };
  } catch (error) {
    console.error('Error getting lab requests:', error);
    throw error;
  }
};

/**
 * Get a single lab request by ID
 */
const getLabRequestById = async (requestId) => {
  try {
    const { data, error } = await supabase
      .from('lab_requests')
      .select(
        `
        id,
        doctor_id,
        patient_id,
        lab_id,
        test_type_id,
        status,
        priority,
        doctor_notes,
        rejection_reason,
        accepted_by,
        accepted_at,
        rejected_by,
        rejected_at,
        version,
        is_deleted,
        created_at,
        updated_at,
        doctors(full_name, specialty, phone_number),
        patients(full_name, age, gender, phone_number),
        test_types(name, description),
        labs(name)
        `
      )
      .eq('id', requestId)
      .eq('is_deleted', false)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Request not found
      }
      throw error;
    }

    // Transform the data
    return {
      id: data.id,
      doctorId: data.doctor_id,
      patientId: data.patient_id,
      labId: data.lab_id,
      testTypeId: data.test_type_id,
      status: data.status,
      priority: data.priority,
      doctorNotes: data.doctor_notes,
      rejectionReason: data.rejection_reason,
      acceptedBy: data.accepted_by,
      acceptedAt: data.accepted_at,
      rejectedBy: data.rejected_by,
      rejectedAt: data.rejected_at,
      version: data.version,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      doctor: data.doctors ? {
        name: data.doctors.full_name,
        specialty: data.doctors.specialty,
        phone: data.doctors.phone_number || null
      } : null,
      patient: data.patients ? {
        name: data.patients.full_name,
        age: data.patients.age,
        gender: data.patients.gender,
        phone: data.patients.phone_number || null
      } : null,
      testType: data.test_types ? {
        name: data.test_types.name,
        description: data.test_types.description
      } : null,
      lab: data.labs ? {
        name: data.labs.name
      } : null
    };
  } catch (error) {
    console.error('Error getting lab request by ID:', error);
    throw error;
  }
};

/**
 * Get lab requests for a specific doctor
 */
const getDoctorLabRequests = async (doctorId, filters = {}, pagination = {}) => {
  try {
    const {
      status = null,
      priority = null,
      startDate = null,
      endDate = null
    } = filters;

    const {
      page = 1,
      limit = 20
    } = pagination;

    let query = supabase
      .from('lab_requests')
      .select(
        `
        id,
        doctor_id,
        patient_id,
        lab_id,
        test_type_id,
        status,
        priority,
        doctor_notes,
        rejection_reason,
        created_at,
        updated_at,
        patients(full_name),
        test_types(name),
        labs(name)
        `,
        { count: 'exact' }
      )
      .eq('doctor_id', doctorId)
      .eq('is_deleted', false);

    // Apply filters
    if (status) {
      if (Array.isArray(status)) {
        query = query.in('status', status);
      } else {
        query = query.eq('status', status);
      }
    }

    if (priority) {
      if (Array.isArray(priority)) {
        query = query.in('priority', priority);
      } else {
        query = query.eq('priority', priority);
      }
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    query = query.order('created_at', { ascending: false });

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    const transformedData = data.map(request => ({
      id: request.id,
      doctorId: request.doctor_id,
      patientId: request.patient_id,
      labId: request.lab_id,
      testTypeId: request.test_type_id,
      status: request.status,
      priority: request.priority,
      doctorNotes: request.doctor_notes,
      rejectionReason: request.rejection_reason,
      createdAt: request.created_at,
      updatedAt: request.updated_at,
      patientName: request.patients?.full_name,
      testTypeName: request.test_types?.name,
      labName: request.labs?.name
    }));

    return {
      requests: transformedData,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    console.error('Error getting doctor lab requests:', error);
    throw error;
  }
};

/**
 * Get lab requests for a specific patient
 */
const getPatientLabRequests = async (patientId, filters = {}, pagination = {}) => {
  try {
    const {
      status = null,
      startDate = null,
      endDate = null
    } = filters;

    const {
      page = 1,
      limit = 20
    } = pagination;

    let query = supabase
      .from('lab_requests')
      .select(
        `
        id,
        patient_id,
        doctor_id,
        lab_id,
        test_type_id,
        status,
        priority,
        created_at,
        updated_at,
        doctors(full_name),
        test_types(name),
        labs(name)
        `,
        { count: 'exact' }
      )
      .eq('patient_id', patientId)
      .eq('is_deleted', false);

    // Apply filters
    if (status) {
      if (Array.isArray(status)) {
        query = query.in('status', status);
      } else {
        query = query.eq('status', status);
      }
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    query = query.order('created_at', { ascending: false });

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    const transformedData = data.map(request => ({
      id: request.id,
      patientId: request.patient_id,
      doctorId: request.doctor_id,
      labId: request.lab_id,
      testTypeId: request.test_type_id,
      status: request.status,
      priority: request.priority,
      createdAt: request.created_at,
      updatedAt: request.updated_at,
      doctorName: request.doctors?.full_name,
      testTypeName: request.test_types?.name,
      labName: request.labs?.name
    }));

    return {
      requests: transformedData,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    console.error('Error getting patient lab requests:', error);
    throw error;
  }
};

/**
 * Create a new lab request from a doctor
 */
const createLabRequest = async (requestData) => {
  try {
    const {
      doctor_id,
      patient_id,
      lab_id,
      test_type_id,
      priority = 'Normal',
      doctor_notes = null
    } = requestData;

    // Validate required fields
    if (!doctor_id || !patient_id || !lab_id || !test_type_id) {
      throw new Error('Missing required fields: doctor_id, patient_id, lab_id, test_type_id');
    }

    // Validate priority
    const validPriorities = ['Normal', 'Urgent'];
    if (!validPriorities.includes(priority)) {
      throw new Error(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
    }

    // Create the lab request with initial status "Pending"
    const { data, error } = await supabase
      .from('lab_requests')
      .insert({
        doctor_id,
        patient_id,
        lab_id,
        test_type_id,
        status: 'Pending',
        priority,
        doctor_notes,
        version: 1
      })
      .select()
      .single();

    if (error) throw error;

    // Transform the data
    return {
      id: data.id,
      doctorId: data.doctor_id,
      patientId: data.patient_id,
      labId: data.lab_id,
      testTypeId: data.test_type_id,
      status: data.status,
      priority: data.priority,
      doctorNotes: data.doctor_notes,
      version: data.version,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error creating lab request:', error);
    throw error;
  }
};

/**
 * Accept a lab request (change status to Processing)
 * Uses optimistic locking with version field
 */
const acceptLabRequest = async (requestId, staffId, currentVersion) => {
  try {
    if (!requestId || !staffId) {
      throw new Error('Missing required fields: requestId, staffId');
    }

    // Get current request to verify version
    const { data: currentRequest, error: fetchError } = await supabase
      .from('lab_requests')
      .select('id, status, version, doctor_id')
      .eq('id', requestId)
      .eq('is_deleted', false)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new Error('Lab request not found');
      }
      throw fetchError;
    }

    // Check if request is in Pending status
    if (currentRequest.status !== 'Pending') {
      throw new Error(`Cannot accept request with status: ${currentRequest.status}`);
    }

    // Check version for optimistic locking
    if (currentVersion !== undefined && currentRequest.version !== currentVersion) {
      throw new Error('Concurrent update conflict: Request was modified by another user');
    }

    // Update the request with new version
    const newVersion = currentRequest.version + 1;
    const { data, error } = await supabase
      .from('lab_requests')
      .update({
        status: 'Processing',
        accepted_by: staffId,
        accepted_at: new Date().toISOString(),
        version: newVersion,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .eq('version', currentRequest.version) // Optimistic locking check
      .select()
      .single();

    if (error) {
      if (error.message && error.message.includes('0 rows')) {
        throw new Error('Concurrent update conflict: Request was modified by another user');
      }
      throw error;
    }

    // Transform the data
    return {
      id: data.id,
      doctorId: data.doctor_id,
      status: data.status,
      acceptedBy: data.accepted_by,
      acceptedAt: data.accepted_at,
      version: data.version,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error accepting lab request:', error);
    throw error;
  }
};

/**
 * Reject a lab request (change status to Rejected)
 * Uses optimistic locking with version field
 */
const rejectLabRequest = async (requestId, staffId, rejectionReason, currentVersion) => {
  try {
    if (!requestId || !staffId || !rejectionReason) {
      throw new Error('Missing required fields: requestId, staffId, rejectionReason');
    }

    // Validate rejection reason is not empty
    if (typeof rejectionReason !== 'string' || rejectionReason.trim().length === 0) {
      throw new Error('Rejection reason cannot be empty');
    }

    // Get current request to verify version
    const { data: currentRequest, error: fetchError } = await supabase
      .from('lab_requests')
      .select('id, status, version, doctor_id')
      .eq('id', requestId)
      .eq('is_deleted', false)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new Error('Lab request not found');
      }
      throw fetchError;
    }

    // Check if request is in Pending or Processing status
    if (currentRequest.status !== 'Pending' && currentRequest.status !== 'Processing') {
      throw new Error(`Cannot reject request with status: ${currentRequest.status}`);
    }

    // Check version for optimistic locking
    if (currentVersion !== undefined && currentRequest.version !== currentVersion) {
      throw new Error('Concurrent update conflict: Request was modified by another user');
    }

    // Update the request with new version
    const newVersion = currentRequest.version + 1;
    const { data, error } = await supabase
      .from('lab_requests')
      .update({
        status: 'Rejected',
        rejection_reason: rejectionReason.trim(),
        rejected_by: staffId,
        rejected_at: new Date().toISOString(),
        version: newVersion,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .eq('version', currentRequest.version) // Optimistic locking check
      .select()
      .single();

    if (error) {
      if (error.message && error.message.includes('0 rows')) {
        throw new Error('Concurrent update conflict: Request was modified by another user');
      }
      throw error;
    }

    // Transform the data
    return {
      id: data.id,
      doctorId: data.doctor_id,
      status: data.status,
      rejectionReason: data.rejection_reason,
      rejectedBy: data.rejected_by,
      rejectedAt: data.rejected_at,
      version: data.version,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error rejecting lab request:', error);
    throw error;
  }
};

module.exports = {
  getLabRequests,
  getLabRequestById,
  getDoctorLabRequests,
  getPatientLabRequests,
  createLabRequest,
  acceptLabRequest,
  rejectLabRequest
};
