/**
 * Admin Audit Log Service
 * Handles audit logging for all admin actions
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Log an admin action
 */
const logAction = async (adminId, actionType, resourceType, resourceId, changes, status, errorMessage = null, ipAddress = null, userAgent = null) => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        admin_id: adminId,
        action_type: actionType,
        resource_type: resourceType,
        resource_id: resourceId,
        changes: changes || null,
        status: status,
        error_message: errorMessage,
        ip_address: ipAddress,
        user_agent: userAgent
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error logging audit action:', error);
    throw error;
  }
};

/**
 * Get audit logs with filtering and pagination
 */
const getAuditLogs = async (filters = {}, pagination = {}) => {
  try {
    const {
      action_type = null,
      resource_type = null,
      admin_id = null,
      start_date = null,
      end_date = null
    } = filters;

    const {
      page = 1,
      limit = 50
    } = pagination;

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    // Apply filters
    if (action_type) {
      query = query.eq('action_type', action_type);
    }

    if (resource_type) {
      query = query.eq('resource_type', resource_type);
    }

    if (admin_id) {
      query = query.eq('admin_id', admin_id);
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

    // Fetch admin names from auth.users using admin API
    const adminIds = [...new Set(data.map(log => log.admin_id))];
    let adminMap = {};
    
    try {
      const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      (authUsers?.users || []).forEach(user => {
        adminMap[user.id] = user.email;
      });
    } catch (err) {
      console.error('Error fetching admin emails:', err);
    }

    // Map admin names to logs
    const logs = data.map(log => {
      return {
        ...log,
        admin_name: adminMap[log.admin_id] || 'Unknown'
      };
    });

    return {
      logs,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    console.error('Error getting audit logs:', error);
    throw error;
  }
};

/**
 * Get audit log by ID
 */
const getAuditLogById = async (logId) => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('id', logId)
      .single();

    if (error) throw error;

    // Get admin name from auth.users using admin API
    let adminEmail = 'Unknown';
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(data.admin_id);
      adminEmail = authUser?.user?.email || 'Unknown';
    } catch (err) {
      console.error('Error fetching admin email:', err);
    }

    return {
      ...data,
      admin_name: adminEmail
    };
  } catch (error) {
    console.error('Error getting audit log:', error);
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
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: false });

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Fetch admin names from auth.users using admin API
    const adminIds = [...new Set(data.map(log => log.admin_id))];
    let adminMap = {};
    
    try {
      const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      (authUsers?.users || []).forEach(user => {
        adminMap[user.id] = user.email;
      });
    } catch (err) {
      console.error('Error fetching admin emails:', err);
    }

    // Map admin names to logs
    const logs = data.map(log => {
      return {
        ...log,
        admin_name: adminMap[log.admin_id] || 'Unknown'
      };
    });

    return {
      logs,
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

/**
 * Get audit logs for a specific admin
 */
const getAdminAuditLogs = async (adminId, pagination = {}) => {
  try {
    const { page = 1, limit = 50 } = pagination;

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('admin_id', adminId)
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
    console.error('Error getting admin audit logs:', error);
    throw error;
  }
};

module.exports = {
  logAction,
  getAuditLogs,
  getAuditLogById,
  getResourceAuditLogs,
  getAdminAuditLogs
};
