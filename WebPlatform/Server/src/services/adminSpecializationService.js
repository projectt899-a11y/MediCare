/**
 * Admin Specialization Service
 * Handles medical specialization management
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get all specializations with pagination
 */
const getAllSpecializations = async (filters = {}, pagination = {}) => {
  try {
    const { active_only = false } = filters;
    const { page = 1, limit = 50 } = pagination;

    console.log('Fetching specializations with filters:', filters, 'pagination:', pagination);

    let query = supabase
      .from('medical_specializations')
      .select('*', { count: 'exact' });

    // Only filter by active_only if explicitly requested
    if (active_only === true) {
      query = query.eq('is_active', true);
    }

    query = query.order('name', { ascending: true });

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    console.log('Query result - error:', error, 'data count:', data?.length, 'total count:', count);

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    // Get doctor count for each specialization
    const specializations = await Promise.all(
      (data || []).map(async (spec) => {
        const { count: doctorCount } = await supabase
          .from('doctor_specializations')
          .select('*', { count: 'exact' })
          .eq('specialization_id', spec.id);

        return {
          ...spec,
          doctor_count: doctorCount || 0
        };
      })
    );

    console.log('Returning specializations:', specializations.length);

    return {
      specializations,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    };
  } catch (error) {
    console.error('Error getting specializations:', error);
    throw error;
  }
};

/**
 * Create new specialization
 */
const createSpecialization = async (name, description, adminId) => {
  try {
    // Validate input
    if (!name || name.trim() === '') {
      throw new Error('Specialization name is required');
    }

    // Check if specialization already exists
    const { data: existing, error: existError } = await supabase
      .from('medical_specializations')
      .select('id')
      .eq('name', name.trim())
      .maybeSingle();

    if (existing) {
      throw new Error('Specialization already exists');
    }

    // Create specialization
    const { data, error } = await supabase
      .from('medical_specializations')
      .insert({
        name: name.trim(),
        description: description || null,
        is_active: true,
        created_by: adminId
      })
      .select()
      .single();

    if (error) throw error;

    // Log audit action
    await supabase
      .from('audit_logs')
      .insert({
        admin_id: adminId,
        action_type: 'CREATE',
        resource_type: 'Specialization',
        resource_id: data.id,
        changes: { name, description },
        status: 'Success'
      });

    return data;
  } catch (error) {
    console.error('Error creating specialization:', error);
    throw error;
  }
};

/**
 * Update specialization
 */
const updateSpecialization = async (specializationId, updates, adminId) => {
  try {
    const { name, description, is_active } = updates;

    // If name is being updated, check for duplicates
    if (name) {
      const { data: existing } = await supabase
        .from('medical_specializations')
        .select('id')
        .eq('name', name.trim())
        .neq('id', specializationId)
        .maybeSingle();

      if (existing) {
        throw new Error('Specialization name already exists');
      }
    }

    // Update specialization
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('medical_specializations')
      .update(updateData)
      .eq('id', specializationId)
      .select()
      .single();

    if (error) throw error;

    // Log audit action
    await supabase
      .from('audit_logs')
      .insert({
        admin_id: adminId,
        action_type: 'UPDATE',
        resource_type: 'Specialization',
        resource_id: specializationId,
        changes: updates,
        status: 'Success'
      });

    return data;
  } catch (error) {
    console.error('Error updating specialization:', error);
    throw error;
  }
};

/**
 * Delete specialization
 */
const deleteSpecialization = async (specializationId, adminId) => {
  try {
    // Check if any doctors are assigned to this specialization
    const { count: doctorCount, error: countError } = await supabase
      .from('doctor_specializations')
      .select('*', { count: 'exact' })
      .eq('specialization_id', specializationId);

    if (countError) throw countError;

    if (doctorCount > 0) {
      throw new Error(`Cannot delete specialization with ${doctorCount} assigned doctors`);
    }

    // Delete specialization
    const { error } = await supabase
      .from('medical_specializations')
      .delete()
      .eq('id', specializationId);

    if (error) throw error;

    // Log audit action
    await supabase
      .from('audit_logs')
      .insert({
        admin_id: adminId,
        action_type: 'DELETE',
        resource_type: 'Specialization',
        resource_id: specializationId,
        changes: null,
        status: 'Success'
      });

    return { success: true };
  } catch (error) {
    console.error('Error deleting specialization:', error);
    throw error;
  }
};

module.exports = {
  getAllSpecializations,
  createSpecialization,
  updateSpecialization,
  deleteSpecialization
};
