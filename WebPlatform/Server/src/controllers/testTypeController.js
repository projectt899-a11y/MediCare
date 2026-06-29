/**
 * Test Type Controller
 * Handles test type management endpoints
 */

const testTypeService = require('../services/testTypeService');
const labAuditLogService = require('../services/labAuditLogService');

/**
 * Validation helper for test type name
 */
const validateTestTypeName = (name) => {
  if (!name || typeof name !== 'string') {
    return false;
  }
  return name.trim().length > 0 && name.trim().length <= 100;
};

/**
 * Validation helper for custom fields
 */
const validateCustomFields = (fields) => {
  if (!Array.isArray(fields)) {
    return false;
  }

  return fields.every(field => {
    return (
      field.name &&
      field.type &&
      field.label &&
      ['text', 'number', 'dropdown', 'date'].includes(field.type) &&
      typeof field.required === 'boolean'
    );
  });
};

/**
 * GET /api/test-types
 * List all test types with optional filtering
 * Query parameters:
 *   - status: 'Active' or 'Inactive' (optional)
 *   - page: page number (default 1)
 *   - limit: items per page (default 20)
 */
const listTestTypes = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filters = {};
    if (status) {
      if (!['Active', 'Inactive'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status',
          message: 'Status must be "Active" or "Inactive"'
        });
      }
      filters.status = status;
    }

    const result = await testTypeService.getAllTestTypes(
      filters,
      { page: parseInt(page), limit: parseInt(limit) }
    );

    return res.status(200).json({
      success: true,
      data: result.testTypes,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error listing test types:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to list test types'
    });
  }
};

/**
 * POST /api/test-types
 * Create a new test type (admin only)
 * Request body:
 *   - name: Test type name (required, unique)
 *   - description: Test type description (optional)
 *   - customFields: Array of custom field definitions (optional)
 *     Each field should have: name, type, label, required, options (for dropdown)
 */
const createTestType = async (req, res) => {
  try {
    const { name, description, customFields } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Test type name is required'
      });
    }

    if (!validateTestTypeName(name)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Test type name must be between 1 and 100 characters'
      });
    }

    // Check if test type with this name already exists
    const existingTestType = await testTypeService.getTestTypeByName(name.trim());
    if (existingTestType) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: 'A test type with this name already exists'
      });
    }

    // Validate custom fields if provided
    if (customFields && !validateCustomFields(customFields)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid custom fields format. Each field must have: name, type, label, required'
      });
    }

    // Create test type
    const testType = await testTypeService.createTestType({
      name: name.trim(),
      description: description ? description.trim() : null,
      custom_fields: customFields || [],
      created_by: req.user.id
    });

    // Log the action
    await labAuditLogService.logAction(
      req.user.id,
      'CREATE',
      'Test Type',
      testType.id,
      {
        name: testType.name,
        description: testType.description,
        customFields: testType.custom_fields
      },
      req.ip,
      req.get('user-agent')
    );

    return res.status(201).json({
      success: true,
      message: 'Test type created successfully',
      data: testType
    });
  } catch (error) {
    console.error('Error creating test type:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to create test type'
    });
  }
};

/**
 * PUT /api/test-types/:id
 * Update test type details (admin only)
 * Request body:
 *   - name: Test type name (optional)
 *   - description: Test type description (optional)
 *   - customFields: Array of custom field definitions (optional)
 */
const updateTestType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, customFields } = req.body;

    // Get existing test type
    const existingTestType = await testTypeService.getTestTypeById(id);
    if (!existingTestType) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Test type not found'
      });
    }

    // Validate name if provided
    if (name !== undefined) {
      if (!validateTestTypeName(name)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Test type name must be between 1 and 100 characters'
        });
      }

      // Check if another test type with this name exists
      if (name.trim() !== existingTestType.name) {
        const duplicateTestType = await testTypeService.getTestTypeByName(name.trim());
        if (duplicateTestType) {
          return res.status(409).json({
            success: false,
            error: 'Conflict',
            message: 'A test type with this name already exists'
          });
        }
      }
    }

    // Validate custom fields if provided
    if (customFields !== undefined && !validateCustomFields(customFields)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid custom fields format. Each field must have: name, type, label, required'
      });
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (customFields !== undefined) updateData.custom_fields = customFields;

    // Update test type
    const updatedTestType = await testTypeService.updateTestType(id, updateData);

    // Log the action
    await labAuditLogService.logAction(
      req.user.id,
      'UPDATE',
      'Test Type',
      id,
      {
        changes: updateData,
        previousValues: {
          name: existingTestType.name,
          description: existingTestType.description,
          customFields: existingTestType.custom_fields
        }
      },
      req.ip,
      req.get('user-agent')
    );

    return res.status(200).json({
      success: true,
      message: 'Test type updated successfully',
      data: updatedTestType
    });
  } catch (error) {
    console.error('Error updating test type:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update test type'
    });
  }
};

/**
 * PUT /api/test-types/:id/status
 * Activate or deactivate a test type (admin only)
 * Request body:
 *   - status: 'Active' or 'Inactive' (required)
 */
const updateTestTypeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Status is required'
      });
    }

    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Status must be "Active" or "Inactive"'
      });
    }

    // Get existing test type
    const existingTestType = await testTypeService.getTestTypeById(id);
    if (!existingTestType) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Test type not found'
      });
    }

    // Check if status is already the same
    if (existingTestType.status === status) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `Test type is already ${status}`
      });
    }

    // Update status
    const updatedTestType = await testTypeService.updateTestTypeStatus(id, status);

    // Log the action
    await labAuditLogService.logAction(
      req.user.id,
      'UPDATE',
      'Test Type',
      id,
      {
        action: status === 'Active' ? 'ACTIVATE' : 'DEACTIVATE',
        previousStatus: existingTestType.status,
        newStatus: status
      },
      req.ip,
      req.get('user-agent')
    );

    return res.status(200).json({
      success: true,
      message: `Test type ${status === 'Active' ? 'activated' : 'deactivated'} successfully`,
      data: updatedTestType
    });
  } catch (error) {
    console.error('Error updating test type status:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update test type status'
    });
  }
};

module.exports = {
  listTestTypes,
  createTestType,
  updateTestType,
  updateTestTypeStatus
};
