/**
 * Activity Logging Controller
 * Handles HTTP requests for activity log retrieval and recording
 */

const activityLoggingService = require('../services/activityLoggingService');

/**
 * POST /api/admin/activity-log/record-login
 * Record a login activity
 */
const recordLogin = async (req, res) => {
  try {
    const { userId, ipAddress, userAgent } = req.body;

    if (!userId || !ipAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, ipAddress'
      });
    }

    const result = await activityLoggingService.recordLogin(userId, ipAddress, userAgent);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Login activity recorded successfully'
    });
  } catch (error) {
    console.error('Error in recordLogin:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * POST /api/admin/activity-log/record-logout
 * Record a logout activity
 */
const recordLogout = async (req, res) => {
  try {
    const { userId, sessionId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: userId'
      });
    }

    const result = await activityLoggingService.recordLogout(userId, sessionId);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Logout activity recorded successfully'
    });
  } catch (error) {
    console.error('Error in recordLogout:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * GET /api/users/:userId/activity-log
 * Get activity log for a user with filtering and pagination
 */
const getActivityLog = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, startDate, endDate, page, limit } = req.query;

    const filters = {
      type: type || null,
      startDate: startDate || null,
      endDate: endDate || null
    };

    const pagination = {
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 50, 50)
    };

    const result = await activityLoggingService.getActivityLog(userId, filters, pagination);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Activity log retrieved successfully'
    });
  } catch (error) {
    console.error('Error in getActivityLog:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * GET /api/users/:userId/login-history
 * Get login history for a user
 */
const getLoginHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page, limit } = req.query;

    const pagination = {
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 50, 50)
    };

    const result = await activityLoggingService.getLoginHistory(userId, pagination);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Login history retrieved successfully'
    });
  } catch (error) {
    console.error('Error in getLoginHistory:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * GET /api/users/:userId/appointments
 * Get appointment history for a user
 */
const getAppointmentHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, page, limit } = req.query;

    const filters = {
      status: status || null
    };

    const pagination = {
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 50, 50)
    };

    const result = await activityLoggingService.getAppointmentHistory(userId, filters, pagination);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Appointment history retrieved successfully'
    });
  } catch (error) {
    console.error('Error in getAppointmentHistory:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * GET /api/users/:userId/profile-changes
 * Get profile changes for a user
 */
const getProfileChanges = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page, limit } = req.query;

    const pagination = {
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 50, 50)
    };

    const result = await activityLoggingService.getProfileChanges(userId, pagination);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Profile changes retrieved successfully'
    });
  } catch (error) {
    console.error('Error in getProfileChanges:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

module.exports = {
  recordLogin,
  recordLogout,
  getActivityLog,
  getLoginHistory,
  getAppointmentHistory,
  getProfileChanges
};
