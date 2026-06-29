/**
 * Admin User Controller
 * Handles HTTP requests for user management
 */

const adminUserService = require('../services/adminUserService');
const auditLogService = require('../services/adminAuditLogService');

/**
 * GET /api/admin/users
 * Get all users with filtering and pagination
 */
const getAllUsers = async (req, res) => {
  try {
    const { role, status, search, sortBy, sortOrder, page, limit } = req.query;

    const filters = {
      role: role || null,
      status: status || null,
      search: search || null,
      sortBy: sortBy || 'created_at',
      sortOrder: sortOrder || 'desc'
    };

    const pagination = {
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 20, 100)
    };

    const result = await adminUserService.getAllUsers(filters, pagination);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * GET /api/admin/users/:userId
 * Get user details by ID
 */
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await adminUserService.getUserById(userId);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error in getUserById:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * PUT /api/admin/users/:userId/status
 * Update user account status (activate/deactivate)
 */
const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { account_status, reason } = req.body;

    if (!account_status) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'account_status', message: 'Account status is required' }]
      });
    }

    const user = await adminUserService.updateUserStatus(userId, account_status, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Account status updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error in updateUserStatus:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * POST /api/admin/users/:userId/approve
 * Approve doctor registration
 */
const approveDoctorRegistration = async (req, res) => {
  try {
    const { userId } = req.params;
    const specialization_id = req.body?.specialization_id || null;

    const user = await adminUserService.approveDoctorRegistration(userId, specialization_id, req.user?.id);

    res.status(200).json({
      success: true,
      message: 'Registration approved successfully',
      data: user
    });
  } catch (error) {
    console.error('Error in approveDoctorRegistration:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * POST /api/admin/users/:userId/reject
 * Reject doctor registration
 */
const rejectDoctorRegistration = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    await adminUserService.rejectDoctorRegistration(userId, reason || 'No reason provided', req.user.id);

    res.status(200).json({
      success: true,
      message: 'Registration rejected successfully'
    });
  } catch (error) {
    console.error('Error in rejectDoctorRegistration:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * PUT /api/admin/users/:userId/specialization
 * Assign specialization to doctor
 */
const assignSpecializationToDoctor = async (req, res) => {
  try {
    const { userId } = req.params;
    const { specialization_id } = req.body;

    if (!specialization_id) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'specialization_id', message: 'Specialization ID is required' }]
      });
    }

    const result = await adminUserService.assignSpecializationToDoctor(userId, specialization_id, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Specialization assigned successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in assignSpecializationToDoctor:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserStatus,
  approveDoctorRegistration,
  rejectDoctorRegistration,
  assignSpecializationToDoctor
};
