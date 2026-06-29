/**
 * Admin Routes
 * All routes require admin authentication
 */

const express = require('express');
const router = express.Router();

// Middleware
const { adminAuthMiddleware } = require('../middleware/adminAuth');

// Controllers
const adminUserController = require('../controllers/adminUserController');
const adminSpecializationController = require('../controllers/adminSpecializationController');
const adminScheduleController = require('../controllers/adminScheduleController');
const adminDashboardController = require('../controllers/adminDashboardController');
const adminAuditLogController = require('../controllers/adminAuditLogController');
const bulkActionController = require('../controllers/bulkActionController');
const activityLoggingController = require('../controllers/activityLoggingController');
const adminAvailabilityController = require('../controllers/adminAvailabilityController');
const testTypeController = require('../controllers/testTypeController');
const labAuditLogController = require('../controllers/labAuditLogController');
const labController = require('../controllers/labController');

// ============================================================================
// ACTIVITY LOG RECORDING ROUTES (No auth required - called during login/logout)
// ============================================================================

// Record login activity
router.post('/activity-log/record-login', activityLoggingController.recordLogin);

// Record logout activity
router.post('/activity-log/record-logout', activityLoggingController.recordLogout);

// Apply admin auth middleware to all routes below
router.use(adminAuthMiddleware);

// ============================================================================
// USER MANAGEMENT ROUTES
// ============================================================================

// Bulk delete users (must come before :userId routes)
router.post('/users/bulk-delete', bulkActionController.bulkDeleteUsers);

// Bulk update user status (must come before :userId routes)
router.patch('/users/bulk-status', bulkActionController.bulkUpdateStatus);

// Bulk change user role (must come before :userId routes)
router.patch('/users/bulk-role', bulkActionController.bulkChangeRole);

// Get all users
router.get('/users', adminUserController.getAllUsers);

// Get user by ID
router.get('/users/:userId', adminUserController.getUserById);

// Update user status (activate/deactivate)
router.put('/users/:userId/status', adminUserController.updateUserStatus);

// Approve doctor registration
router.post('/users/:userId/approve', adminUserController.approveDoctorRegistration);

// Reject doctor registration
router.post('/users/:userId/reject', adminUserController.rejectDoctorRegistration);

// Assign specialization to doctor
router.put('/users/:userId/specialization', adminUserController.assignSpecializationToDoctor);

// ============================================================================
// ACTIVITY LOG ROUTES
// ============================================================================

// Get activity log for a user
router.get('/users/:userId/activity-log', activityLoggingController.getActivityLog);

// Get login history for a user
router.get('/users/:userId/login-history', activityLoggingController.getLoginHistory);

// Get appointment history for a user
router.get('/users/:userId/appointments', activityLoggingController.getAppointmentHistory);

// Get profile changes for a user
router.get('/users/:userId/profile-changes', activityLoggingController.getProfileChanges);

// ============================================================================
// SPECIALIZATION MANAGEMENT ROUTES
// ============================================================================

// Get all specializations
router.get('/specializations', adminSpecializationController.getAllSpecializations);

// Create specialization
router.post('/specializations', adminSpecializationController.createSpecialization);

// Update specialization
router.put('/specializations/:specializationId', adminSpecializationController.updateSpecialization);

// Delete specialization
router.delete('/specializations/:specializationId', adminSpecializationController.deleteSpecialization);

// ============================================================================
// DOCTOR SCHEDULE ROUTES
// ============================================================================

// Get doctor schedule
router.get('/doctors/:doctorId/schedule', adminScheduleController.getDoctorSchedule);

// Create/update doctor schedule
router.post('/doctors/:doctorId/schedule', adminScheduleController.createOrUpdateSchedule);

// Delete schedule slot
router.delete('/doctors/:doctorId/schedule/:scheduleId', adminScheduleController.deleteScheduleSlot);

// ============================================================================
// DOCTOR AVAILABILITY ROUTES
// ============================================================================

// Get doctor availability
router.get('/doctors/:doctorId/availability', adminAvailabilityController.getDoctorAvailability);

// Save doctor availability (create, update, delete)
router.post('/doctors/:doctorId/availability', adminAvailabilityController.saveDoctorAvailability);

// Validate availability slot
router.post('/doctors/availability/validate', adminAvailabilityController.validateAvailabilitySlot);

// ============================================================================
// DASHBOARD STATISTICS ROUTES
// ============================================================================

// Get all statistics
router.get('/dashboard/statistics', adminDashboardController.getAllStatistics);

// Get user statistics
router.get('/dashboard/statistics/users', adminDashboardController.getUserStatistics);

// Get case statistics
router.get('/dashboard/statistics/cases', adminDashboardController.getCaseStatistics);

// Get lab test statistics
router.get('/dashboard/statistics/lab-tests', adminDashboardController.getLabTestStatistics);

// ============================================================================
// AUDIT LOG ROUTES
// ============================================================================

// Get audit logs
router.get('/audit-logs', adminAuditLogController.getAuditLogs);

// Get specific audit log
router.get('/audit-logs/:logId', adminAuditLogController.getAuditLogById);

// Get audit logs for resource
router.get('/audit-logs/resource/:resourceType/:resourceId', adminAuditLogController.getResourceAuditLogs);

// Get audit logs for admin
router.get('/audit-logs/admin/:adminId', adminAuditLogController.getAdminAuditLogs);

// ============================================================================
// LAB AUDIT LOG ROUTES
// ============================================================================

// Get lab audit logs with filtering and pagination
router.get('/lab-audit-logs', labAuditLogController.getAuditLogs);

// Get specific lab audit log entry
router.get('/lab-audit-logs/:id', labAuditLogController.getAuditLogById);

// ============================================================================
// TEST TYPE MANAGEMENT ROUTES
// ============================================================================

// Get all test types
router.get('/test-types', testTypeController.listTestTypes);

// Create test type
router.post('/test-types', testTypeController.createTestType);

// Update test type
router.put('/test-types/:id', testTypeController.updateTestType);

// Update test type status (activate/deactivate)
router.put('/test-types/:id/status', testTypeController.updateTestTypeStatus);

// ============================================================================
// LAB APPROVAL ENDPOINTS (ADMIN)
// ============================================================================

// Get pending labs
router.get('/labs/pending', async (req, res) => {
  try {
    const { supabase } = require('../lib/database');
    const { data, error } = await supabase
      .from('labs')
      .select('id, name, lab_type, phone_number, email, license_number, license_file_path, created_at')
      .eq('is_approved', false)
      .eq('status', 'Pending Approval')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve lab (POST)
router.post('/labs/:id/approve', async (req, res) => {
  try {
    const { supabase } = require('../lib/database');
    const { error } = await supabase
      .from('labs')
      .update({ is_approved: true, status: 'Approved', updated_at: new Date().toISOString() })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Lab approved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject lab (POST)
router.post('/labs/:id/reject', async (req, res) => {
  try {
    const { supabase } = require('../lib/database');
    const { error } = await supabase
      .from('labs')
      .update({ is_approved: false, status: 'Rejected', updated_at: new Date().toISOString() })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Lab rejected successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve lab (PUT)
router.put('/labs/:id/approve', labController.approveLab);

// Reject lab (PUT)
router.put('/labs/:id/reject', labController.rejectLab);

// Deactivate lab
router.put('/labs/:id/deactivate', labController.deactivateLab);

module.exports = router;
