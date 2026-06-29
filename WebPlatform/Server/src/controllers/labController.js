/**
 * Lab Controller
 * Handles HTTP requests for lab management
 */

const labService = require('../services/labService');
const labAuditLogService = require('../services/labAuditLogService');

/**
 * Validation helpers
 */
const validateEmail = (email) => {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/;
  return emailRegex.test(email);
};

const validatePhoneNumber = (phone) => {
  const phoneRegex = /^\+?[0-9\s\-()]{10,}$/;
  return phoneRegex.test(phone);
};

const validateLicenseNumber = (license) => {
  // License number should be alphanumeric and not empty
  return license && license.trim().length > 0 && /^[a-zA-Z0-9\-]+$/.test(license);
};

/**
 * GET /api/labs/:id
 * Get lab details
 */
const getLabDetails = async (req, res) => {
  try {
    const { id: labId } = req.params;

    if (!labId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'id', message: 'Lab ID is required' }]
      });
    }

    const lab = await labService.getLabById(labId);

    if (!lab) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Lab not found'
      });
    }

    res.status(200).json({
      success: true,
      data: lab
    });
  } catch (error) {
    console.error('Error in getLabDetails:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * PUT /api/labs/:id
 * Update lab information
 */
const updateLabInfo = async (req, res) => {
  try {
    const { id: labId } = req.params;
    const { name, address, phone_number, email, license_number, license_file_path, license_expiration_date } = req.body;
    const userId = req.user?.id;

    if (!labId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'id', message: 'Lab ID is required' }]
      });
    }

    // Validate input
    const validationErrors = [];

    if (email && !validateEmail(email)) {
      validationErrors.push({
        field: 'email',
        message: 'Invalid email format'
      });
    }

    if (phone_number && !validatePhoneNumber(phone_number)) {
      validationErrors.push({
        field: 'phone_number',
        message: 'Invalid phone number format (must be at least 10 digits)'
      });
    }

    if (license_number && !validateLicenseNumber(license_number)) {
      validationErrors.push({
        field: 'license_number',
        message: 'Invalid license number format (alphanumeric and hyphens only)'
      });
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: validationErrors
      });
    }

    // Check if lab exists
    const existingLab = await labService.getLabById(labId);
    if (!existingLab) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Lab not found'
      });
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (phone_number !== undefined) updateData.phone_number = phone_number;
    if (email !== undefined) updateData.email = email;
    if (license_number !== undefined) updateData.license_number = license_number;
    if (license_file_path !== undefined) updateData.license_file_path = license_file_path;
    if (license_expiration_date !== undefined) updateData.license_expiration_date = license_expiration_date;

    // Track changes for audit log
    const changes = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (existingLab[key] !== value) {
        changes[key] = {
          old: existingLab[key],
          new: value
        };
      }
    }

    // Update lab
    const updatedLab = await labService.updateLab(labId, updateData);

    if (!updatedLab) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Lab not found'
      });
    }

    // Log the update action
    try {
      await labAuditLogService.logAction(
        userId,
        'UPDATE',
        'Lab',
        labId,
        Object.keys(changes).length > 0 ? changes : null,
        req.ip,
        req.get('user-agent')
      );
    } catch (auditError) {
      console.error('Error logging audit action:', auditError);
      // Don't fail the request if audit logging fails
    }

    res.status(200).json({
      success: true,
      message: 'Lab information updated successfully',
      data: updatedLab
    });
  } catch (error) {
    console.error('Error in updateLabInfo:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * GET /api/labs/:id/staff
 * Get lab staff list
 */
const getLabStaffList = async (req, res) => {
  try {
    const { id: labId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!labId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'id', message: 'Lab ID is required' }]
      });
    }

    // Check if lab exists
    const lab = await labService.getLabById(labId);
    if (!lab) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Lab not found'
      });
    }

    const result = await labService.getLabStaff(labId, {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100)
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in getLabStaffList:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * POST /api/labs/:id/staff
 * Add lab staff member
 */
const addLabStaffMember = async (req, res) => {
  try {
    const { id: labId } = req.params;
    const { full_name, email, role } = req.body;
    const userId = req.user?.id;

    if (!labId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'id', message: 'Lab ID is required' }]
      });
    }

    // Validate input
    const validationErrors = [];

    if (!full_name || full_name.trim().length === 0) {
      validationErrors.push({
        field: 'full_name',
        message: 'Full name is required'
      });
    }

    if (!email || !validateEmail(email)) {
      validationErrors.push({
        field: 'email',
        message: 'Valid email is required'
      });
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: validationErrors
      });
    }

    // Check if lab exists
    const lab = await labService.getLabById(labId);
    if (!lab) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Lab not found'
      });
    }

    // Check if a user with this email already exists in auth.users
    const { supabase } = require('../lib/database');
    const { data: existingUser } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .single();

    // Use existing user ID if found, otherwise use NULL
    // This allows multiple staff members without associated user accounts
    const staffUserId = existingUser?.id || null;

    // Add staff member
    const staffMember = await labService.addLabStaff(labId, {
      full_name,
      email,
      role: role || 'Lab Technician',
      user_id: staffUserId,
      created_by: userId
    });

    // Log the action
    try {
      await labAuditLogService.logAction(
        userId,
        'CREATE',
        'Lab Staff',
        staffMember.id,
        { full_name, email, role: role || 'Lab Technician' },
        req.ip,
        req.get('user-agent')
      );
    } catch (auditError) {
      console.error('Error logging audit action:', auditError);
    }

    res.status(201).json({
      success: true,
      message: 'Lab staff member added successfully',
      data: staffMember
    });
  } catch (error) {
    console.error('Error in addLabStaffMember:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * PUT /api/labs/:id/staff/:staffId
 * Update lab staff member
 */
const updateLabStaffMember = async (req, res) => {
  try {
    const { id: labId, staffId } = req.params;
    const { role, status } = req.body;
    const userId = req.user?.id;

    if (!labId || !staffId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'id', message: 'Lab ID and Staff ID are required' }]
      });
    }

    // Check if lab exists
    const lab = await labService.getLabById(labId);
    if (!lab) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Lab not found'
      });
    }

    // Update staff member
    const updatedStaff = await labService.updateLabStaff(staffId, { role, status });

    if (!updatedStaff) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Staff member not found'
      });
    }

    // Log the action
    try {
      const changes = {};
      if (role !== undefined) changes.role = role;
      if (status !== undefined) changes.status = status;

      await labAuditLogService.logAction(
        userId,
        'UPDATE',
        'Lab Staff',
        staffId,
        Object.keys(changes).length > 0 ? changes : null,
        req.ip,
        req.get('user-agent')
      );
    } catch (auditError) {
      console.error('Error logging audit action:', auditError);
    }

    res.status(200).json({
      success: true,
      message: 'Lab staff member updated successfully',
      data: updatedStaff
    });
  } catch (error) {
    console.error('Error in updateLabStaffMember:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * DELETE /api/labs/:id/staff/:staffId
 * Remove lab staff member
 */
const removeLabStaffMember = async (req, res) => {
  try {
    const { id: labId, staffId } = req.params;
    const userId = req.user?.id;

    if (!labId || !staffId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'id', message: 'Lab ID and Staff ID are required' }]
      });
    }

    // Check if lab exists
    const lab = await labService.getLabById(labId);
    if (!lab) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Lab not found'
      });
    }

    // Remove staff member
    const removedStaff = await labService.removeLabStaff(staffId);

    if (!removedStaff) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Staff member not found'
      });
    }

    // Log the action
    try {
      await labAuditLogService.logAction(
        userId,
        'DELETE',
        'Lab Staff',
        staffId,
        null,
        req.ip,
        req.get('user-agent')
      );
    } catch (auditError) {
      console.error('Error logging audit action:', auditError);
    }

    res.status(200).json({
      success: true,
      message: 'Lab staff member removed successfully'
    });
  } catch (error) {
    console.error('Error in removeLabStaffMember:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * GET /api/labs/:id/test-types
 * Get lab test types
 */
const getLabTestTypes = async (req, res) => {
  try {
    const { id: labId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!labId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'id', message: 'Lab ID is required' }]
      });
    }

    // Check if lab exists
    const lab = await labService.getLabById(labId);
    if (!lab) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Lab not found'
      });
    }

    const result = await labService.getLabTestTypes(labId, {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100)
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in getLabTestTypes:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * POST /api/labs/:id/test-types
 * Add test type to lab
 */
const addTestTypeToLab = async (req, res) => {
  try {
    const { id: labId } = req.params;
    const { test_type_id } = req.body;
    const userId = req.user?.id;

    if (!labId || !test_type_id) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'test_type_id', message: 'Test type ID is required' }]
      });
    }

    // Check if lab exists
    const lab = await labService.getLabById(labId);
    if (!lab) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Lab not found'
      });
    }

    // Add test type
    const labTestType = await labService.addTestTypeToLab(labId, test_type_id);

    // Log the action
    try {
      await labAuditLogService.logAction(
        userId,
        'CREATE',
        'Lab Test Type',
        labTestType.id,
        { test_type_id },
        req.ip,
        req.get('user-agent')
      );
    } catch (auditError) {
      console.error('Error logging audit action:', auditError);
    }

    res.status(201).json({
      success: true,
      message: 'Test type added to lab successfully',
      data: labTestType
    });
  } catch (error) {
    console.error('Error in addTestTypeToLab:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * DELETE /api/labs/:id/test-types/:typeId
 * Remove test type from lab
 */
const removeTestTypeFromLab = async (req, res) => {
  try {
    const { id: labId, typeId } = req.params;
    const userId = req.user?.id;

    if (!labId || !typeId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'id', message: 'Lab ID and Test Type ID are required' }]
      });
    }

    // Check if lab exists
    const lab = await labService.getLabById(labId);
    if (!lab) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Lab not found'
      });
    }

    // Remove test type
    const removed = await labService.removeTestTypeFromLab(labId, typeId);

    if (!removed) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Test type not found for this lab'
      });
    }

    // Log the action
    try {
      await labAuditLogService.logAction(
        userId,
        'DELETE',
        'Lab Test Type',
        typeId,
        null,
        req.ip,
        req.get('user-agent')
      );
    } catch (auditError) {
      console.error('Error logging audit action:', auditError);
    }

    res.status(200).json({
      success: true,
      message: 'Test type removed from lab successfully'
    });
  } catch (error) {
    console.error('Error in removeTestTypeFromLab:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * PUT /api/labs/:id/approve
 * Approve a lab (admin only)
 */
const approveLab = async (req, res) => {
  try {
    const { id: labId } = req.params;
    const userId = req.user?.id;

    if (!labId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'id', message: 'Lab ID is required' }]
      });
    }

    // Approve the lab
    const result = await labService.approveLab(labId, userId);

    // Log the action
    try {
      await labAuditLogService.logAction(
        userId,
        'APPROVE',
        'Lab',
        labId,
        result.changes,
        req.ip,
        req.get('user-agent')
      );
    } catch (auditError) {
      console.error('Error logging audit action:', auditError);
    }

    // TODO: Trigger notification to lab
    // await notificationService.sendLabApprovalNotification(result.lab);

    res.status(200).json({
      success: true,
      message: 'Lab approved successfully',
      data: result.lab
    });
  } catch (error) {
    console.error('Error in approveLab:', error);

    // Handle specific error cases
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: error.message
      });
    }

    if (error.message.includes('Cannot approve')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Status Transition',
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
 * PUT /api/labs/:id/reject
 * Reject a lab with reason (admin only)
 */
const rejectLab = async (req, res) => {
  try {
    const { id: labId } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;

    if (!labId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'id', message: 'Lab ID is required' }]
      });
    }

    // Validate rejection reason
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'reason', message: 'Rejection reason is required and cannot be empty' }]
      });
    }

    // Reject the lab
    const result = await labService.rejectLab(labId, reason, userId);

    // Log the action
    try {
      await labAuditLogService.logAction(
        userId,
        'REJECT',
        'Lab',
        labId,
        result.changes,
        req.ip,
        req.get('user-agent')
      );
    } catch (auditError) {
      console.error('Error logging audit action:', auditError);
    }

    // TODO: Trigger notification to lab with rejection reason
    // await notificationService.sendLabRejectionNotification(result.lab, result.reason);

    res.status(200).json({
      success: true,
      message: 'Lab rejected successfully',
      data: result.lab
    });
  } catch (error) {
    console.error('Error in rejectLab:', error);

    // Handle specific error cases
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: error.message
      });
    }

    if (error.message.includes('Cannot reject')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Status Transition',
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
 * PUT /api/labs/:id/deactivate
 * Deactivate a lab (admin only)
 */
const deactivateLab = async (req, res) => {
  try {
    const { id: labId } = req.params;
    const userId = req.user?.id;

    if (!labId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'id', message: 'Lab ID is required' }]
      });
    }

    // Deactivate the lab
    const result = await labService.deactivateLab(labId, userId);

    // Log the action
    try {
      await labAuditLogService.logAction(
        userId,
        'DEACTIVATE',
        'Lab',
        labId,
        result.changes,
        req.ip,
        req.get('user-agent')
      );
    } catch (auditError) {
      console.error('Error logging audit action:', auditError);
    }

    // TODO: Trigger notification to lab
    // await notificationService.sendLabDeactivationNotification(result.lab);

    res.status(200).json({
      success: true,
      message: 'Lab deactivated successfully',
      data: result.lab
    });
  } catch (error) {
    console.error('Error in deactivateLab:', error);

    // Handle specific error cases
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: error.message
      });
    }

    if (error.message.includes('already inactive')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Status Transition',
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
  getLabDetails,
  updateLabInfo,
  getLabStaffList,
  addLabStaffMember,
  updateLabStaffMember,
  removeLabStaffMember,
  getLabTestTypes,
  addTestTypeToLab,
  removeTestTypeFromLab,
  approveLab,
  rejectLab,
  deactivateLab
};
