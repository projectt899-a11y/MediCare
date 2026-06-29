/**
 * Test Type Service
 * Handles all test type management operations
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get all test types with optional filtering
 */
const getAllTestTypes = async (filters = {}, pagination = {}) => {
  try {
    const { status = null } = filters;
    const { page = 1, limit = 20 } = pagination;

    let query = supabase
      .from('test_types')
      .select('*', { count: 'exact' });

    // Apply status filter if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Sort by name
    query = query.order('name', { ascending: true });

    // Apply pagination
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
    console.error('Error getting all test types:', error);
    throw error;
  }
};

/**
 * Get test type by ID
 */
const getTestTypeById = async (testTypeId) => {
  try {
    const { data, error } = await supabase
      .from('test_types')
      .select('*')
      .eq('id', testTypeId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Test type not found
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error getting test type by ID:', error);
    throw error;
  }
};

/**
 * Create a new test type
 */
const createTestType = async (testTypeData) => {
  try {
    const { name, description, custom_fields, created_by } = testTypeData;

    const { data, error } = await supabase
      .from('test_types')
      .insert({
        name: name,
        description: description || null,
        status: 'Active',
        custom_fields: custom_fields || [],
        created_by: created_by
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating test type:', error);
    throw error;
  }
};

/**
 * Update test type details
 */
const updateTestType = async (testTypeId, updateData) => {
  try {
    const allowedFields = ['name', 'description', 'custom_fields'];
    const updateObject = {};

    for (const field of allowedFields) {
      if (field in updateData) {
        updateObject[field] = updateData[field];
      }
    }

    // Always update the updated_at timestamp
    updateObject.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('test_types')
      .update(updateObject)
      .eq('id', testTypeId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Test type not found
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error updating test type:', error);
    throw error;
  }
};

/**
 * Update test type status (activate/deactivate)
 */
const updateTestTypeStatus = async (testTypeId, status) => {
  try {
    // Validate status
    if (!['Active', 'Inactive'].includes(status)) {
      throw new Error('Invalid status. Must be "Active" or "Inactive"');
    }

    const { data, error } = await supabase
      .from('test_types')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', testTypeId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Test type not found
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error updating test type status:', error);
    throw error;
  }
};

/**
 * Get test type by name
 */
const getTestTypeByName = async (name) => {
  try {
    const { data, error } = await supabase
      .from('test_types')
      .select('*')
      .eq('name', name)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Test type not found
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error getting test type by name:', error);
    throw error;
  }
};

module.exports = {
  getAllTestTypes,
  getTestTypeById,
  createTestType,
  updateTestType,
  updateTestTypeStatus,
  getTestTypeByName
};
