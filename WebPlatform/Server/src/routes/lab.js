const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Controllers
const labController = require('../controllers/labController');
const labRequestController = require('../controllers/labRequestController');
const labResultController = require('../controllers/labResultController');

// Middleware
const labResultUpload = require('../utils/labResultUploadConfig');

// ============================================================================
// PUBLIC LOOKUP ROUTES (no auth required - for doctors to create requests)
// ============================================================================

/**
 * GET /api/labs/approved
 * Get all approved labs
 */
router.get('/approved', async (req, res) => {
  try {
    const { supabase } = require('../lib/database');
    const { data, error } = await supabase
      .from('labs')
      .select('id, name, lab_type, address, phone_number')
      .eq('is_approved', true)
      .eq('status', 'Approved')
      .eq('is_deleted', false)
      .order('name');
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/labs/test-types
 * Get all active test types
 */
router.get('/test-types', async (req, res) => {
  try {
    const { supabase } = require('../lib/database');
    const { data, error } = await supabase
      .from('test_types')
      .select('id, name, description')
      .eq('status', 'Active')
      .order('name');
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Apply auth middleware to all routes below
router.use(authMiddleware);

// ============================================================================
// LAB NOTIFICATION ROUTES
// ============================================================================

/**
 * GET /api/labs/notifications
 * Get notifications for the logged-in lab user
 */
router.get('/notifications', async (req, res) => {
  try {
    const { supabase } = require('../lib/database');
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, message, is_read, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/labs/notifications/read-all
 * Mark all lab notifications as read
 */
router.patch('/notifications/read-all', async (req, res) => {
  try {
    const { supabase } = require('../lib/database');
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/labs/notifications/:notificationId
 * Delete a specific notification
 */
router.delete('/notifications/:notificationId', async (req, res) => {
  try {
    const { supabase } = require('../lib/database');
    const { notificationId } = req.params;
    
    // Delete notification only if it belongs to the current user
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', req.user.id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// DOCTOR / PATIENT SPECIFIC ROUTES
// (must be before /:id to avoid being matched as a lab ID)
// ============================================================================

/**
 * GET /api/labs/doctor/requests
 * Get lab requests for the current doctor
 */
router.get('/doctor/requests', labRequestController.getDoctorLabRequests);

/**
 * GET /api/labs/doctor/results
 * Get lab results for the current doctor
 */
router.get('/doctor/results', labResultController.getDoctorLabResults);

/**
 * GET /api/labs/patient/requests
 * Get lab requests for the current patient
 */
router.get('/patient/requests', labRequestController.getPatientLabRequests);

/**
 * GET /api/labs/patient/results
 * Get completed lab results for the current patient
 */
router.get('/patient/results', labResultController.getPatientLabResults);

// ============================================================================
// LAB MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /api/labs/:id
 * Get lab details
 */
router.get('/:id', labController.getLabDetails);

/**
 * PUT /api/labs/:id
 * Update lab information
 */
router.put('/:id', labController.updateLabInfo);

// ============================================================================
// LAB STAFF MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /api/labs/:id/staff
 * Get lab staff list
 */
router.get('/:id/staff', labController.getLabStaffList);

/**
 * POST /api/labs/:id/staff
 * Add lab staff member
 */
router.post('/:id/staff', labController.addLabStaffMember);

/**
 * PUT /api/labs/:id/staff/:staffId
 * Update lab staff member
 */
router.put('/:id/staff/:staffId', labController.updateLabStaffMember);

/**
 * DELETE /api/labs/:id/staff/:staffId
 * Remove lab staff member
 */
router.delete('/:id/staff/:staffId', labController.removeLabStaffMember);

// ============================================================================
// LAB TEST TYPE MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /api/labs/:id/test-types
 * Get lab test types
 */
router.get('/:id/test-types', labController.getLabTestTypes);

/**
 * POST /api/labs/:id/test-types
 * Add test type to lab
 */
router.post('/:id/test-types', labController.addTestTypeToLab);

/**
 * DELETE /api/labs/:id/test-types/:typeId
 * Remove test type from lab
 */
router.delete('/:id/test-types/:typeId', labController.removeTestTypeFromLab);

// ============================================================================
// LAB REQUEST ROUTES
// ============================================================================

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
router.post('/requests', labRequestController.createLabRequest);

/**
 * GET /api/lab-requests
 * Get lab requests with filtering, searching, and pagination
 * Query parameters:
 *   - labId: Lab ID (required)
 *   - status: comma-separated list of statuses
 *   - priority: comma-separated list of priorities
 *   - startDate: ISO date string for start of date range
 *   - endDate: ISO date string for end of date range
 *   - searchTerm: search term
 *   - searchField: 'patient_name', 'doctor_name', or 'request_id'
 *   - page: page number (default 1)
 *   - limit: items per page (default 20)
 */
router.get('/requests/list', labRequestController.getLabRequests);

/**
 * GET /api/lab-requests/:id
 * Get a single lab request by ID
 */
router.get('/requests/:id', labRequestController.getLabRequestById);

/**
 * PUT /api/lab-requests/:id/accept
 * Accept a lab request (change status to Processing)
 * Request body:
 *   - version: Current version of the request (for optimistic locking)
 */
router.put('/requests/:id/accept', labRequestController.acceptLabRequest);

/**
 * PUT /api/lab-requests/:id/reject
 * Reject a lab request (change status to Rejected)
 * Request body:
 *   - rejectionReason: Reason for rejection (required)
 *   - version: Current version of the request (for optimistic locking)
 */
router.put('/requests/:id/reject', labRequestController.rejectLabRequest);

/**
 * DELETE /api/labs/requests/:id
 * Delete a lab request (only the doctor who created it can delete)
 */
router.delete('/requests/:id', labRequestController.deleteLabRequest);

/**
 * GET /api/patient/lab-requests
 * Get lab requests for the current patient
 */

// ============================================================================
// LAB RESULT ROUTES
// ============================================================================

/**
 * POST /api/lab-results
 * Submit a lab result (file upload or manual entry)
 * Request body:
 *   - requestId: UUID of the lab request (required)
 *   - resultType: 'File Upload' or 'Manual Entry' (required)
 *   - resultValues: Object with test values for manual entry (required if resultType is 'Manual Entry')
 *   - doctorVisibleNotes: Notes visible to doctor and patient (optional)
 *   - internalLabNotes: Notes visible only to lab staff (optional)
 *   - isDraft: Boolean to save as draft (optional, default false)
 * File upload:
 *   - file: Multipart file upload (required if resultType is 'File Upload')
 */
router.post('/results', labResultUpload.single('file'), labResultController.submitLabResult);

/**
 * GET /api/lab-results/:id
 * Get lab result by ID
 */
router.get('/results/:id', labResultController.getLabResult);

/**
 * GET /api/lab-results/request/:requestId
 * Get lab result by request ID
 */
router.get('/results/request/:requestId', labResultController.getLabResultByRequest);

/**
 * GET /api/lab-results/:id/download
 * Generate signed URL for file download
 */
router.get('/results/:id/download', labResultController.downloadLabResultFile);

module.exports = router;
