/**
 * Admin Audit Log Controller
 * Handles HTTP requests for audit log viewing
 */

const adminAuditLogService = require('../services/adminAuditLogService');

/**
 * GET /api/admin/audit-logs
 * Get audit logs with filtering and pagination
 */
const getAuditLogs = async (req, res) => {
  try {
    const { action_type, resource_type, admin_id, start_date, end_date, page, limit } = req.query;

    const filters = {
      action_type: action_type || null,
      resource_type: resource_type || null,
      admin_id: admin_id || null,
      start_date: start_date || null,
      end_date: end_date || null
    };

    const pagination = {
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 50, 100)
    };

    const result = await adminAuditLogService.getAuditLogs(filters, pagination);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in getAuditLogs:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * GET /api/admin/audit-logs/:logId
 * Get specific audit log
 */
const getAuditLogById = async (req, res) => {
  try {
    const { logId } = req.params;

    const log = await adminAuditLogService.getAuditLogById(logId);

    res.status(200).json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Error in getAuditLogById:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * GET /api/admin/audit-logs/resource/:resourceType/:resourceId
 * Get audit logs for a specific resource
 */
const getResourceAuditLogs = async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    const { page, limit } = req.query;

    const pagination = {
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 50, 100)
    };

    const result = await adminAuditLogService.getResourceAuditLogs(resourceType, resourceId, pagination);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in getResourceAuditLogs:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * GET /api/admin/audit-logs/admin/:adminId
 * Get audit logs for a specific admin
 */
const getAdminAuditLogs = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { page, limit } = req.query;

    const pagination = {
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 50, 100)
    };

    const result = await adminAuditLogService.getAdminAuditLogs(adminId, pagination);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in getAdminAuditLogs:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

module.exports = {
  getAuditLogs,
  getAuditLogById,
  getResourceAuditLogs,
  getAdminAuditLogs
};
