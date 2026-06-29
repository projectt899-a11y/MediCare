/**
 * Admin Specialization Controller
 * Handles HTTP requests for specialization management
 */

const adminSpecializationService = require('../services/adminSpecializationService');

/**
 * GET /api/admin/specializations
 * Get all specializations with pagination
 */
const getAllSpecializations = async (req, res) => {
  try {
    const { active_only, page, limit } = req.query;

    console.log('getAllSpecializations called with query:', { active_only, page, limit });

    const filters = {
      active_only: active_only === 'true' ? true : false
    };

    const pagination = {
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 50, 100)
    };

    const result = await adminSpecializationService.getAllSpecializations(filters, pagination);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in getAllSpecializations:', error);
    
    // Extract error message safely
    let errorMessage = 'Internal Server Error';
    if (error && typeof error === 'object') {
      if (error.message) {
        errorMessage = error.message;
      } else if (error.error_description) {
        errorMessage = error.error_description;
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: errorMessage
    });
  }
};

/**
 * POST /api/admin/specializations
 * Create new specialization
 */
const createSpecialization = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'name', message: 'Specialization name is required' }]
      });
    }

    const specialization = await adminSpecializationService.createSpecialization(name, description, req.user.id);

    res.status(201).json({
      success: true,
      message: 'Specialization created successfully',
      data: specialization
    });
  } catch (error) {
    console.error('Error in createSpecialization:', error);

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
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
 * PUT /api/admin/specializations/:specializationId
 * Update specialization
 */
const updateSpecialization = async (req, res) => {
  try {
    const { specializationId } = req.params;
    const { name, description, is_active } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'At least one field must be provided for update'
      });
    }

    const specialization = await adminSpecializationService.updateSpecialization(specializationId, updates, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Specialization updated successfully',
      data: specialization
    });
  } catch (error) {
    console.error('Error in updateSpecialization:', error);

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
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
 * DELETE /api/admin/specializations/:specializationId
 * Delete specialization
 */
const deleteSpecialization = async (req, res) => {
  try {
    const { specializationId } = req.params;

    await adminSpecializationService.deleteSpecialization(specializationId, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Specialization deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteSpecialization:', error);

    if (error.message.includes('Cannot delete')) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
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

module.exports = {
  getAllSpecializations,
  createSpecialization,
  updateSpecialization,
  deleteSpecialization
};
