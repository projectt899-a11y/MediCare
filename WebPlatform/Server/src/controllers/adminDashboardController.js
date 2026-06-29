/**
 * Admin Dashboard Controller
 * Handles HTTP requests for dashboard statistics
 */

const adminDashboardService = require('../services/adminDashboardService');

/**
 * GET /api/admin/dashboard/statistics
 * Get all dashboard statistics
 */
const getAllStatistics = async (req, res) => {
  try {
    // Always fetch fresh statistics (no cache)
    const statistics = await adminDashboardService.getAllStatistics();

    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error in getAllStatistics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * GET /api/admin/dashboard/statistics/users
 * Get user statistics only
 */
const getUserStatistics = async (req, res) => {
  try {
    // Try to get cached statistics
    const cached = await adminDashboardService.getCachedStatistics('dashboard_user_stats');
    if (cached) {
      return res.status(200).json({
        success: true,
        data: cached
      });
    }

    // Get fresh statistics
    const statistics = await adminDashboardService.getUserStatistics();

    // Cache the statistics
    await adminDashboardService.cacheStatistics('dashboard_user_stats', statistics, 5);

    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error in getUserStatistics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * GET /api/admin/dashboard/statistics/cases
 * Get medical case statistics
 */
const getCaseStatistics = async (req, res) => {
  try {
    // Try to get cached statistics
    const cached = await adminDashboardService.getCachedStatistics('dashboard_case_stats');
    if (cached) {
      return res.status(200).json({
        success: true,
        data: cached
      });
    }

    // Get fresh statistics
    const statistics = await adminDashboardService.getCaseStatistics();

    // Cache the statistics
    await adminDashboardService.cacheStatistics('dashboard_case_stats', statistics, 5);

    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error in getCaseStatistics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * GET /api/admin/dashboard/statistics/lab-tests
 * Get lab test statistics
 */
const getLabTestStatistics = async (req, res) => {
  try {
    // Try to get cached statistics
    const cached = await adminDashboardService.getCachedStatistics('dashboard_lab_stats');
    if (cached) {
      return res.status(200).json({
        success: true,
        data: cached
      });
    }

    // Get fresh statistics
    const statistics = await adminDashboardService.getLabTestStatistics();

    // Cache the statistics
    await adminDashboardService.cacheStatistics('dashboard_lab_stats', statistics, 5);

    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error in getLabTestStatistics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

module.exports = {
  getAllStatistics,
  getUserStatistics,
  getCaseStatistics,
  getLabTestStatistics
};
