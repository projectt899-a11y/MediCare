/**
 * Lab Audit Log Service
 * Handles audit logging for all lab operations
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Log a lab action
 */
const logAction = async (userId, actionType, resourceType, resourceId, changes = null, ipAddress = null, userAgent = null) => {
  try {
    const { data, error } = await supabase
      .from('lab_audit_logs')
      .insert({
        user_id: userId,
        action_type: actionType,
        resource_type: resourceType,
        resource_id: resourceId,
        changes: changes || null,
        ip_address: ipAddress,
        user_agent: userAgent
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error logging lab audit action:', error);
    throw error;
  }
};

/**
 * Get lab audit logs with filtering and pagination
 */
const getLabAuditLogs = async (filters = {}, pagination = {}) => {
  try {
    const {
      action_type = null,
      resource_type = null,
      user_id = null,
      resource_id = null,
      start_date = null,
      end_date = null
    } = filters;

    const {
      page = 1,
      limit = 50
    } = pagination;

    let query = supabase
      .from('lab_audit_logs')
      .select('*', { count: 'exact' });

    // Apply filters
    if (action_type) {
      query = query.eq('action_type', action_type);
    }

    if (resource_type) {
      query = query.eq('resource_type', resource_type);
    }

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    if (resource_id) {
      query = query.eq('resource_id', resource_id);
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    // Sort by created_at descending
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      logs: data,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    console.error('Error getting lab audit logs:', error);
    throw error;
  }
};

/**
 * Get audit log by ID
 */
const getLabAuditLogById = async (logId) => {
  try {
    const { data, error } = await supabase
      .from('lab_audit_logs')
      .select('*')
      .eq('id', logId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Log not found
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error getting lab audit log:', error);
    throw error;
  }
};

/**
 * Get audit logs for a specific resource
 */
const getResourceAuditLogs = async (resourceType, resourceId, pagination = {}) => {
  try {
    const { page = 1, limit = 50 } = pagination;

    let query = supabase
      .from('lab_audit_logs')
      .select('*', { count: 'exact' })
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: false });

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      logs: data,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    console.error('Error getting resource audit logs:', error);
    throw error;
  }
};

module.exports = {
  logAction,
  getLabAuditLogs,
  getLabAuditLogById,
  getResourceAuditLogs
};
