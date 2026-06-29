/**
 * Lab Service
 * Handles all lab management operations
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get lab details by ID
 */
const getLabById = async (labId) => {
  try {
    const { data, error } = await supabase
      .from('labs')
      .select('*')
      .eq('id', labId)
      .eq('is_deleted', false)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Lab not found
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error getting lab by ID:', error);
    throw error;
  }
};

/**
 * Update lab information
 */
const updateLab = async (labId, updateData) => {
  try {
    // Prepare update object with only allowed fields
    const allowedFields = ['name', 'address', 'phone_number', 'email', 'license_number', 'license_file_path', 'license_expiration_date'];
    const updateObject = {};

    for (const field of allowedFields) {
      if (field in updateData) {
        updateObject[field] = updateData[field];
      }
    }

    // Always update the updated_at timestamp
    updateObject.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('labs')
      .update(updateObject)
      .eq('id', labId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Lab not found
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error updating lab:', error);
    throw error;
  }
};

/**
 * Get lab staff list
 */
const getLabStaff = async (labId, pagination = {}) => {
  try {
    const { page = 1, limit = 20 } = pagination;

    let query = supabase
      .from('lab_staff')
      .select('*', { count: 'exact' })
      .eq('lab_id', labId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      staff: data,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    console.error('Error getting lab staff:', error);
    throw error;
  }
};

/**
 * Add lab staff member
 */
const addLabStaff = async (labId, staffData) => {
  try {
    const { full_name, email, role, user_id, created_by } = staffData;

    const { data, error } = await supabase
      .from('lab_staff')
      .insert({
        lab_id: labId,
        user_id: user_id,
        full_name: full_name,
        email: email,
        role: role || 'Lab Technician',
        status: 'Active',
        created_by: created_by
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error adding lab staff:', error);
    throw error;
  }
};

/**
 * Update lab staff member
 */
const updateLabStaff = async (staffId, updateData) => {
  try {
    const allowedFields = ['role', 'status'];
    const updateObject = {};

    for (const field of allowedFields) {
      if (field in updateData) {
        updateObject[field] = updateData[field];
      }
    }

    updateObject.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('lab_staff')
      .update(updateObject)
      .eq('id', staffId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Staff not found
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error updating lab staff:', error);
    throw error;
  }
};

/**
 * Remove lab staff member (soft delete)
 */
const removeLabStaff = async (staffId) => {
  try {
    const { data, error } = await supabase
      .from('lab_staff')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', staffId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Staff not found
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error removing lab staff:', error);
    throw error;
  }
};

/**
 * Get lab test types
 */
const getLabTestTypes = async (labId, pagination = {}) => {
  try {
    const { page = 1, limit = 20 } = pagination;

    let query = supabase
      .from('lab_test_types')
      .select('*, test_types(*)', { count: 'exact' })
      .eq('lab_id', labId)
      .order('created_at', { ascending: false });

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      testTypes: data,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    console.error('Error getting lab test types:', error);
    throw error;
  }
};

/**
 * Add test type to lab
 */
const addTestTypeToLab = async (labId, testTypeId) => {
  try {
    const { data, error } = await supabase
      .from('lab_test_types')
      .insert({
        lab_id: labId,
        test_type_id: testTypeId,
        is_available: true
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error adding test type to lab:', error);
    throw error;
  }
};

/**
 * Remove test type from lab
 */
const removeTestTypeFromLab = async (labId, testTypeId) => {
  try {
    const { data, error } = await supabase
      .from('lab_test_types')
      .delete()
      .eq('lab_id', labId)
      .eq('test_type_id', testTypeId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error removing test type from lab:', error);
    throw error;
  }
};

/**
 * Approve a lab (admin only)
 */
const approveLab = async (labId, adminId) => {
  try {
    if (!labId || !adminId) {
      throw new Error('Missing required fields: labId, adminId');
    }

    // Get current lab to verify status and track changes
    const { data: currentLab, error: fetchError } = await supabase
      .from('labs')
      .select('id, status, name, email')
      .eq('id', labId)
      .eq('is_deleted', false)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new Error('Lab not found');
      }
      throw fetchError;
    }

    // Check if lab is in Pending Approval status
    if (currentLab.status !== 'Pending Approval') {
      throw new Error(`Cannot approve lab with status: ${currentLab.status}`);
    }

    // Update lab status to Approved
    const { data, error } = await supabase
      .from('labs')
      .update({
        status: 'Approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', labId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;

    return {
      lab: data,
      changes: {
        status: {
          old: currentLab.status,
          new: 'Approved'
        }
      }
    };
  } catch (error) {
    console.error('Error approving lab:', error);
    throw error;
  }
};

/**
 * Reject a lab (admin only)
 */
const rejectLab = async (labId, reason, adminId) => {
  try {
    if (!labId || !reason || !adminId) {
      throw new Error('Missing required fields: labId, reason, adminId');
    }

    // Validate reason is not empty
    if (typeof reason !== 'string' || reason.trim().length === 0) {
      throw new Error('Rejection reason cannot be empty');
    }

    // Get current lab to verify status and track changes
    const { data: currentLab, error: fetchError } = await supabase
      .from('labs')
      .select('id, status, name, email')
      .eq('id', labId)
      .eq('is_deleted', false)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new Error('Lab not found');
      }
      throw fetchError;
    }

    // Check if lab is in Pending Approval status
    if (currentLab.status !== 'Pending Approval') {
      throw new Error(`Cannot reject lab with status: ${currentLab.status}`);
    }

    // Update lab status to Rejected
    const { data, error } = await supabase
      .from('labs')
      .update({
        status: 'Rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', labId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;

    return {
      lab: data,
      reason: reason.trim(),
      changes: {
        status: {
          old: currentLab.status,
          new: 'Rejected'
        },
        rejection_reason: reason.trim()
      }
    };
  } catch (error) {
    console.error('Error rejecting lab:', error);
    throw error;
  }
};

/**
 * Deactivate a lab (admin only)
 */
const deactivateLab = async (labId, adminId) => {
  try {
    if (!labId || !adminId) {
      throw new Error('Missing required fields: labId, adminId');
    }

    // Get current lab to verify status and track changes
    const { data: currentLab, error: fetchError } = await supabase
      .from('labs')
      .select('id, status, name, email')
      .eq('id', labId)
      .eq('is_deleted', false)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new Error('Lab not found');
      }
      throw fetchError;
    }

    // Check if lab is already inactive
    if (currentLab.status === 'Inactive') {
      throw new Error('Lab is already inactive');
    }

    // Update lab status to Inactive
    const { data, error } = await supabase
      .from('labs')
      .update({
        status: 'Inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', labId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;

    return {
      lab: data,
      changes: {
        status: {
          old: currentLab.status,
          new: 'Inactive'
        }
      }
    };
  } catch (error) {
    console.error('Error deactivating lab:', error);
    throw error;
  }
};

module.exports = {
  getLabById,
  updateLab,
  getLabStaff,
  addLabStaff,
  updateLabStaff,
  removeLabStaff,
  getLabTestTypes,
  addTestTypeToLab,
  removeTestTypeFromLab,
  approveLab,
  rejectLab,
  deactivateLab
};
