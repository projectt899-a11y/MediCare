/**
 * Bulk Action Controller
 * Handles HTTP requests for bulk user operations
 */

const bulkActionService = require('../services/bulkActionService');

/**
 * POST /api/users/bulk-delete
 * Delete multiple users
 */
const bulkDeleteUsers = async (req, res) => {
  try {
    const { userIds } = req.body;
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Admin authentication required'
      });
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'At least one user must be selected'
      });
    }

    const result = await bulkActionService.bulkDeleteUsers(userIds, adminId);

    res.status(200).json({
      success: true,
      data: result,
      message: result.message
    });
  } catch (error) {
    console.error('Error in bulkDeleteUsers:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * PATCH /api/users/bulk-status
 * Update status for multiple users
 */
const bulkUpdateStatus = async (req, res) => {
  try {
    const { userIds, status } = req.body;
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Admin authentication required'
      });
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'At least one user must be selected'
      });
    }

    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Valid status (active or inactive) is required'
      });
    }

    const result = await bulkActionService.bulkUpdateStatus(userIds, status, adminId);

    res.status(200).json({
      success: true,
      data: result,
      message: result.message
    });
  } catch (error) {
    console.error('Error in bulkUpdateStatus:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * PATCH /api/users/bulk-role
 * Change role for multiple users
 */
const bulkChangeRole = async (req, res) => {
  try {
    const { userIds, role } = req.body;
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Admin authentication required'
      });
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'At least one user must be selected'
      });
    }

    if (!role || !['doctor', 'patient', 'lab'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Valid role (doctor, patient, or lab) is required'
      });
    }

    const result = await bulkActionService.bulkChangeRole(userIds, role, adminId);

    res.status(200).json({
      success: true,
      data: result,
      message: result.message
    });
  } catch (error) {
    console.error('Error in bulkChangeRole:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

module.exports = {
  bulkDeleteUsers,
  bulkUpdateStatus,
  bulkChangeRole
};
