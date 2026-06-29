/**
 * Lab Request Controller
 * Handles HTTP requests for lab request management
 */

const { createClient } = require('@supabase/supabase-js');
const labRequestService = require('../services/labRequestService');
const labAuditLogService = require('../services/labAuditLogService');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/lab-requests
 * Get lab requests with filtering, searching, and pagination
 * Query parameters:
 *   - status: comma-separated list of statuses (Pending, Processing, Completed, Rejected)
 *   - priority: comma-separated list of priorities (Normal, Urgent)
 *   - startDate: ISO date string for start of date range
 *   - endDate: ISO date string for end of date range
 *   - searchTerm: search term for patient name, doctor name, or request ID
 *   - searchField: 'patient_name', 'doctor_name', or 'request_id'
 *   - page: page number (default 1)
 *   - limit: items per page (default 20)
 */
const getLabRequests = async (req, res) => {
  try {
    const userId = req.user?.id;
    const labId = req.query.labId || req.user?.labId;

    if (!labId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'labId', message: 'Lab ID is required' }]
      });
    }

    // Parse query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'pagination', message: 'Page must be >= 1, limit must be between 1 and 100' }]
      });
    }

    // Parse filters
    const filters = {};

    // Parse status filter (comma-separated)
    if (req.query.status) {
      const statusList = req.query.status.split(',').map(s => s.trim());
      const validStatuses = ['Pending', 'Processing', 'Completed', 'Rejected'];
      const invalidStatuses = statusList.filter(s => !validStatuses.includes(s));

      if (invalidStatuses.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: [{ field: 'status', message: `Invalid status values: ${invalidStatuses.join(', ')}` }]
        });
      }

      filters.status = statusList;
    }

    // Parse priority filter (comma-separated)
    if (req.query.priority) {
      const priorityList = req.query.priority.split(',').map(p => p.trim());
      const validPriorities = ['Normal', 'Urgent'];
      const invalidPriorities = priorityList.filter(p => !validPriorities.includes(p));

      if (invalidPriorities.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: [{ field: 'priority', message: `Invalid priority values: ${invalidPriorities.join(', ')}` }]
        });
      }

      filters.priority = priorityList;
    }

    // Parse date range filter
    if (req.query.startDate) {
      const startDate = new Date(req.query.startDate);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: [{ field: 'startDate', message: 'Invalid date format' }]
        });
      }
      filters.startDate = startDate.toISOString();
    }

    if (req.query.endDate) {
      const endDate = new Date(req.query.endDate);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: [{ field: 'endDate', message: 'Invalid date format' }]
        });
      }
      filters.endDate = endDate.toISOString();
    }

    // Parse search filter
    if (req.query.searchTerm) {
      filters.searchTerm = req.query.searchTerm.trim();

      if (req.query.searchField) {
        const validSearchFields = ['patient_name', 'doctor_name', 'request_id'];
        if (!validSearchFields.includes(req.query.searchField)) {
          return res.status(400).json({
            success: false,
            error: 'Validation Error',
            details: [{ field: 'searchField', message: 'Invalid search field' }]
          });
        }
        filters.searchField = req.query.searchField;
      } else {
        // Default to request_id if not specified
        filters.searchField = 'request_id';
      }
    }

    // Get lab requests
    const result = await labRequestService.getLabRequests(
      labId,
      filters,
      { page, limit }
    );

    // Log the view action
    await labAuditLogService.logAction(
      userId,
      'VIEW',
      'Lab Request',
      labId,
      { filters, page, limit },
      req.ip,
      req.get('user-agent')
    );

    res.status(200).json({
      success: true,
      data: result.requests,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error in getLabRequests:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * GET /api/lab-requests/:id
 * Get a single lab request by ID
 */
const getLabRequestById = async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const userId = req.user?.id;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'id', message: 'Request ID is required' }]
      });
    }

    const request = await labRequestService.getLabRequestById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Lab request not found'
      });
    }

    // Log the view action
    await labAuditLogService.logAction(
      userId,
      'VIEW',
      'Lab Request',
      requestId,
      null,
      req.ip,
      req.get('user-agent')
    );

    res.status(200).json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Error in getLabRequestById:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * GET /api/doctor/lab-requests
 * Get lab requests for the current doctor
 */
const getDoctorLabRequests = async (req, res) => {
  try {
    const doctorId = req.user?.id;

    if (!doctorId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Doctor ID is required'
      });
    }

    // Parse query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'pagination', message: 'Page must be >= 1, limit must be between 1 and 100' }]
      });
    }

    // Parse filters
    const filters = {};

    if (req.query.status) {
      const statusList = req.query.status.split(',').map(s => s.trim());
      const validStatuses = ['Pending', 'Processing', 'Completed', 'Rejected'];
      const invalidStatuses = statusList.filter(s => !validStatuses.includes(s));

      if (invalidStatuses.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: [{ field: 'status', message: `Invalid status values: ${invalidStatuses.join(', ')}` }]
        });
      }

      filters.status = statusList;
    }

    if (req.query.priority) {
      const priorityList = req.query.priority.split(',').map(p => p.trim());
      const validPriorities = ['Normal', 'Urgent'];
      const invalidPriorities = priorityList.filter(p => !validPriorities.includes(p));

      if (invalidPriorities.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: [{ field: 'priority', message: `Invalid priority values: ${invalidPriorities.join(', ')}` }]
        });
      }

      filters.priority = priorityList;
    }

    if (req.query.startDate) {
      const startDate = new Date(req.query.startDate);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: [{ field: 'startDate', message: 'Invalid date format' }]
        });
      }
      filters.startDate = startDate.toISOString();
    }

    if (req.query.endDate) {
      const endDate = new Date(req.query.endDate);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: [{ field: 'endDate', message: 'Invalid date format' }]
        });
      }
      filters.endDate = endDate.toISOString();
    }

    const result = await labRequestService.getDoctorLabRequests(
      doctorId,
      filters,
      { page, limit }
    );

    res.status(200).json({
      success: true,
      data: result.requests,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error in getDoctorLabRequests:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * GET /api/patient/lab-requests
 * Get lab requests for the current patient
 */
const getPatientLabRequests = async (req, res) => {
  try {
    const patientId = req.user?.id;

    if (!patientId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Patient ID is required'
      });
    }

    // Parse query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'pagination', message: 'Page must be >= 1, limit must be between 1 and 100' }]
      });
    }

    // Parse filters
    const filters = {};

    if (req.query.status) {
      const statusList = req.query.status.split(',').map(s => s.trim());
      const validStatuses = ['Pending', 'Processing', 'Completed', 'Rejected'];
      const invalidStatuses = statusList.filter(s => !validStatuses.includes(s));

      if (invalidStatuses.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: [{ field: 'status', message: `Invalid status values: ${invalidStatuses.join(', ')}` }]
        });
      }

      filters.status = statusList;
    }

    if (req.query.startDate) {
      const startDate = new Date(req.query.startDate);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: [{ field: 'startDate', message: 'Invalid date format' }]
        });
      }
      filters.startDate = startDate.toISOString();
    }

    if (req.query.endDate) {
      const endDate = new Date(req.query.endDate);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: [{ field: 'endDate', message: 'Invalid date format' }]
        });
      }
      filters.endDate = endDate.toISOString();
    }

    const result = await labRequestService.getPatientLabRequests(
      patientId,
      filters,
      { page, limit }
    );

    res.status(200).json({
      success: true,
      data: result.requests,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error in getPatientLabRequests:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * POST /api/lab-requests
 * Create a new lab request from a doctor
 * Request body:
 *   - testTypeId: UUID of the test type (required)
 *   - labId: UUID of the lab (required)
 *   - patientId: UUID of the patient (required)
 *   - priority: 'Normal' or 'Urgent' (optional, default 'Normal')
 *   - doctorNotes: Clinical notes from doctor (optional)
 */
const createLabRequest = async (req, res) => {
  try {
    const doctorId = req.user?.id;
    const { testTypeId, labId, patientId, priority = 'Normal', doctorNotes = null } = req.body;

    // Validate authentication
    if (!doctorId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Doctor ID is required'
      });
    }

    // Validate required fields
    const validationErrors = [];

    if (!testTypeId) {
      validationErrors.push({
        field: 'testTypeId',
        message: 'Test Type ID is required'
      });
    }

    if (!labId) {
      validationErrors.push({
        field: 'labId',
        message: 'Lab ID is required'
      });
    }

    if (!patientId) {
      validationErrors.push({
        field: 'patientId',
        message: 'Patient ID is required'
      });
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: validationErrors
      });
    }

    // Validate priority
    const validPriorities = ['Normal', 'Urgent'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{
          field: 'priority',
          message: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`
        }]
      });
    }

    // Verify test type exists and is active
    const { data: testType, error: testTypeError } = await supabase
      .from('test_types')
      .select('id, name, status')
      .eq('id', testTypeId)
      .single();

    if (testTypeError || !testType) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Test type not found'
      });
    }

    if (testType.status !== 'Active') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Test type is not active'
      });
    }

    // Verify lab exists and is approved
    const { data: lab, error: labError } = await supabase
      .from('labs')
      .select('id, name, status, user_id')
      .eq('id', labId)
      .eq('is_deleted', false)
      .single();

    if (labError || !lab) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Lab not found'
      });
    }

    if (lab.status !== 'Approved') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Lab is not approved'
      });
    }

    console.log('✅ Lab found:', lab.name, '| Owner ID:', lab.user_id);

    // Verify lab offers this test type (optional check - skip if not configured)
    const { data: labTestType } = await supabase
      .from('lab_test_types')
      .select('id')
      .eq('lab_id', labId)
      .eq('test_type_id', testTypeId)
      .eq('is_available', true)
      .single();

    // If lab_test_types not configured, auto-add it
    if (!labTestType) {
      await supabase.from('lab_test_types').upsert({
        lab_id: labId,
        test_type_id: testTypeId,
        is_available: true,
      }, { onConflict: 'lab_id,test_type_id' });
    }

    // Create the lab request
    const labRequest = await labRequestService.createLabRequest({
      doctor_id: doctorId,
      patient_id: patientId,
      lab_id: labId,
      test_type_id: testTypeId,
      priority,
      doctor_notes: doctorNotes
    });

    // Create audit log entry
    await labAuditLogService.logAction(
      doctorId,
      'CREATE',
      'Lab Request',
      labRequest.id,
      {
        testType: testType.name,
        lab: lab.name,
        priority,
        doctorNotes: doctorNotes ? 'provided' : 'not provided'
      },
      req.ip,
      req.get('user-agent')
    );

    // Trigger notification to lab owner
    try {
      if (!lab.user_id) {
        console.warn('⚠️ Lab owner user_id is null or undefined');
      } else {
        const notification = {
          user_id: lab.user_id,
          type: 'lab_request',
          message: `New lab test request: ${testType.name}`,
          is_read: false,
          created_at: new Date().toISOString()
        };

        const { data: insertedNotif, error: notifError } = await supabase
          .from('notifications')
          .insert([notification])
          .select();

        if (notifError) {
          console.error('Error creating notification:', notifError);
        }
      }
    } catch (notificationError) {
      console.error('Error in notification creation:', notificationError);
    }

    res.status(201).json({
      success: true,
      message: 'Lab request created successfully',
      data: {
        id: labRequest.id,
        status: labRequest.status,
        priority: labRequest.priority,
        testType: testType.name,
        lab: lab.name,
        createdAt: labRequest.createdAt
      }
    });
  } catch (error) {
    console.error('Error in createLabRequest:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * PUT /api/lab-requests/:id/accept
 * Accept a lab request (change status to Processing)
 * Request body:
 *   - version: Current version of the request (for optimistic locking)
 */
const acceptLabRequest = async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const { version } = req.body;
    const userId = req.user?.id;

    // Validate authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User ID is required'
      });
    }

    // Validate request ID
    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'id', message: 'Request ID is required' }]
      });
    }

    // Get lab staff info to verify they belong to the lab
    const { data: labStaff, error: staffError } = await supabase
      .from('lab_staff')
      .select('id, lab_id, user_id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single();

    // If not found in lab_staff, check if the user is the lab owner
    let staffUserId;
    let userLabId;

    if (staffError || !labStaff) {
      // Check labs table for the lab owner
      const { data: lab, error: labOwnerError } = await supabase
        .from('labs')
        .select('id, name')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .single();

      if (labOwnerError || !lab) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only lab staff or lab owners can accept requests'
        });
      }

      // Auto-register the lab owner as a staff member so the FK constraint is satisfied
      const { data: newStaff, error: insertError } = await supabase
        .from('lab_staff')
        .upsert({
          lab_id: lab.id,
          user_id: userId,
          full_name: lab.name + ' Owner',
          email: req.user.email,
          role: 'Lab Technician',
          status: 'Active',
          is_deleted: false,
          created_by: userId,
        }, { onConflict: 'user_id' })
        .select('user_id')
        .single();

      if (insertError) {
        console.error('Failed to auto-register lab owner as staff:', insertError);
        return res.status(500).json({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to verify lab ownership'
        });
      }

      staffUserId = newStaff.user_id;
      userLabId = lab.id;
    } else {
      staffUserId = labStaff.user_id;
      userLabId = labStaff.lab_id;
    }

    // Get the request to verify it belongs to this lab
    const { data: request, error: requestError } = await supabase
      .from('lab_requests')
      .select('id, lab_id, doctor_id, status, version')
      .eq('id', requestId)
      .eq('is_deleted', false)
      .single();

    if (requestError || !request) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Lab request not found'
      });
    }

    // Verify the request belongs to this lab
    if (request.lab_id !== userLabId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to accept this request'
      });
    }

    // Accept the request
    const updatedRequest = await labRequestService.acceptLabRequest(
      requestId,
      staffUserId,
      version
    );

    // Create audit log entry
    await labAuditLogService.logAction(
      userId,
      'UPDATE',
      'Lab Request',
      requestId,
      {
        action: 'accepted',
        previousStatus: request.status,
        newStatus: 'Processing',
        acceptedBy: staffUserId
      },
      req.ip,
      req.get('user-agent')
    );

    // Trigger notification to doctor
    try {
      const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select('user_id, full_name')
        .eq('user_id', request.doctor_id)
        .single();

      if (!doctorError && doctor) {
        // Create notification for doctor — only insert columns that exist in the table
        try {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: doctor.user_id,
              type: 'lab_request_accepted',
              message: `Your lab request has been accepted and is now being processed`,
            });
          if (notifError) console.warn('Could not create notification:', notifError);
        } catch (notificationError) {
          console.warn('Could not create notification:', notificationError);
        }
      }
    } catch (notificationError) {
      console.warn('Error creating doctor notification:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'Lab request accepted successfully',
      data: {
        id: updatedRequest.id,
        status: updatedRequest.status,
        acceptedAt: updatedRequest.acceptedAt,
        version: updatedRequest.version
      }
    });
  } catch (error) {
    console.error('Error in acceptLabRequest:', error);

    // Handle optimistic locking conflict
    if (error.message && error.message.includes('Concurrent update conflict')) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: error.message
      });
    }

    // Handle invalid status transition
    if (error.message && error.message.includes('Cannot accept request')) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * PUT /api/lab-requests/:id/reject
 * Reject a lab request (change status to Rejected)
 * Request body:
 *   - rejectionReason: Reason for rejection (required)
 *   - version: Current version of the request (for optimistic locking)
 */
const rejectLabRequest = async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const { rejectionReason, version } = req.body;
    const userId = req.user?.id;

    // Validate authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User ID is required'
      });
    }

    // Validate request ID
    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'id', message: 'Request ID is required' }]
      });
    }

    // Validate rejection reason
    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'rejectionReason', message: 'Rejection reason is required' }]
      });
    }

    if (typeof rejectionReason !== 'string' || rejectionReason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'rejectionReason', message: 'Rejection reason cannot be empty' }]
      });
    }

    // Get lab staff info to verify they belong to the lab
    const { data: labStaff, error: staffError } = await supabase
      .from('lab_staff')
      .select('id, lab_id, user_id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single();

    // If not found in lab_staff, check if the user is the lab owner
    let staffUserId;
    let userLabId;

    if (staffError || !labStaff) {
      const { data: lab, error: labOwnerError } = await supabase
        .from('labs')
        .select('id, name')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .single();

      if (labOwnerError || !lab) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only lab staff or lab owners can reject requests'
        });
      }

      // Auto-register the lab owner as a staff member so the FK constraint is satisfied
      const { data: newStaff, error: insertError } = await supabase
        .from('lab_staff')
        .upsert({
          lab_id: lab.id,
          user_id: userId,
          full_name: lab.name + ' Owner',
          email: req.user.email,
          role: 'Lab Technician',
          status: 'Active',
          is_deleted: false,
          created_by: userId,
        }, { onConflict: 'user_id' })
        .select('user_id')
        .single();

      if (insertError) {
        console.error('Failed to auto-register lab owner as staff:', insertError);
        return res.status(500).json({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to verify lab ownership'
        });
      }

      staffUserId = newStaff.user_id;
      userLabId = lab.id;
    } else {
      staffUserId = labStaff.user_id;
      userLabId = labStaff.lab_id;
    }

    // Get the request to verify it belongs to this lab
    const { data: request, error: requestError } = await supabase
      .from('lab_requests')
      .select('id, lab_id, doctor_id, status, version')
      .eq('id', requestId)
      .eq('is_deleted', false)
      .single();

    if (requestError || !request) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Lab request not found'
      });
    }

    // Verify the request belongs to this lab
    if (request.lab_id !== userLabId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to reject this request'
      });
    }

    // Reject the request
    const updatedRequest = await labRequestService.rejectLabRequest(
      requestId,
      staffUserId,
      rejectionReason,
      version
    );

    // Create audit log entry
    await labAuditLogService.logAction(
      userId,
      'UPDATE',
      'Lab Request',
      requestId,
      {
        action: 'rejected',
        previousStatus: request.status,
        newStatus: 'Rejected',
        rejectionReason: rejectionReason.trim(),
        rejectedBy: staffUserId
      },
      req.ip,
      req.get('user-agent')
    );

    // Trigger notification to doctor with rejection reason
    try {
      const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select('user_id, full_name')
        .eq('user_id', request.doctor_id)
        .single();

      if (!doctorError && doctor) {
        // Create notification for doctor
        try {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: doctor.user_id,
              type: 'lab_request_rejected',
              message: `Your lab request has been rejected. Reason: ${rejectionReason.trim()}`,
            });
          if (notifError) console.warn('Could not create notification:', notifError);
        } catch (notificationError) {
          console.warn('Could not create notification:', notificationError);
        }
      }
    } catch (notificationError) {
      console.warn('Error creating doctor notification:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'Lab request rejected successfully',
      data: {
        id: updatedRequest.id,
        status: updatedRequest.status,
        rejectionReason: updatedRequest.rejectionReason,
        rejectedAt: updatedRequest.rejectedAt,
        version: updatedRequest.version
      }
    });
  } catch (error) {
    console.error('Error in rejectLabRequest:', error);

    // Handle optimistic locking conflict
    if (error.message && error.message.includes('Concurrent update conflict')) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: error.message
      });
    }

    // Handle invalid status transition
    if (error.message && error.message.includes('Cannot reject request')) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * DELETE /api/labs/requests/:id
 * Delete a lab request (only the doctor who created it can delete)
 */
const deleteLabRequest = async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const userId = req.user?.id;

    // Validate authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User ID is required'
      });
    }

    // Validate request ID
    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'id', message: 'Request ID is required' }]
      });
    }

    // Get the request
    const { data: request, error: requestError } = await supabase
      .from('lab_requests')
      .select('id, doctor_id, lab_id, status')
      .eq('id', requestId)
      .eq('is_deleted', false)
      .single();

    if (requestError || !request) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Lab request not found'
      });
    }

    // Verify the request belongs to this doctor
    if (request.doctor_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only delete your own lab requests'
      });
    }

    // Soft delete the request (mark as deleted)
    const { error: deleteError } = await supabase
      .from('lab_requests')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', requestId);

    if (deleteError) {
      throw deleteError;
    }

    // Create audit log entry
    await labAuditLogService.logAction(
      userId,
      'DELETE',
      'Lab Request',
      requestId,
      {
        previousStatus: request.status,
        lab_id: request.lab_id,
        reason: 'Doctor initiated deletion'
      },
      req.ip,
      req.get('user-agent')
    );

    res.status(200).json({
      success: true,
      message: 'Lab request deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteLabRequest:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

module.exports = {
  getLabRequests,
  getLabRequestById,
  getDoctorLabRequests,
  getPatientLabRequests,
  createLabRequest,
  acceptLabRequest,
  rejectLabRequest,
  deleteLabRequest
};
