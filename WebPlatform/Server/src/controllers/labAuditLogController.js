/**
 * Lab Audit Log Controller
 * Handles HTTP requests for lab audit log retrieval
 */

const labAuditLogService = require('../services/labAuditLogService');

/**
 * GET /api/lab-audit-logs
 * Get lab audit logs with filtering and pagination
 * Query parameters:
 *   - action_type: Filter by action type (CREATE, UPDATE, DELETE, APPROVE, REJECT, UPLOAD, DOWNLOAD, VIEW)
 *   - resource_type: Filter by resource type (Lab, Lab Request, Lab Result, Lab Staff, Test Type)
 *   - user_id: Filter by user ID
 *   - resource_id: Filter by resource ID
 *   - start_date: ISO date string for start of date range
 *   - end_date: ISO date string for end of date range
 *   - page: Page number (default 1)
 *   - limit: Items per page (default 20, max 100)
 */
const getAuditLogs = async (req, res) => {
  try {
    const {
      action_type,
      resource_type,
      user_id,
      resource_id,
      start_date,
      end_date,
      page = 1,
      limit = 20
    } = req.query;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit) || 20), 100);

    // Build filters object
    const filters = {};

    if (action_type) {
      filters.action_type = action_type;
    }

    if (resource_type) {
      filters.resource_type = resource_type;
    }

    if (user_id) {
      filters.user_id = user_id;
    }

    if (resource_id) {
      filters.resource_id = resource_id;
    }

    if (start_date) {
      filters.start_date = start_date;
    }

    if (end_date) {
      filters.end_date = end_date;
    }

    const pagination = {
      page: pageNum,
      limit: limitNum
    };

    const result = await labAuditLogService.getLabAuditLogs(filters, pagination);

    res.status(200).json({
      success: true,
      data: result.logs,
      pagination: result.pagination
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
 * GET /api/lab-audit-logs/:id
 * Get specific lab audit log entry
 */
const getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'id', message: 'Audit log ID is required' }]
      });
    }

    const log = await labAuditLogService.getLabAuditLogById(id);

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Audit log entry not found'
      });
    }

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

module.exports = {
  getAuditLogs,
  getAuditLogById
};
