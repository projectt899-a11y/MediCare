/**
 * Bulk Action Service
 * Handles bulk operations on users (delete, status update, role change)
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Bulk delete users
 */
const bulkDeleteUsers = async (userIds, adminId) => {
  try {
    if (!userIds || userIds.length === 0) {
      throw new Error('At least one user must be selected');
    }

    // Validate all user IDs exist
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .in('id', userIds);

    if (fetchError) throw fetchError;

    if (!users || users.length === 0) {
      throw new Error('No valid users found');
    }

    if (users.length !== userIds.length) {
      throw new Error('One or more user IDs are invalid');
    }

    // Delete users (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .in('id', userIds);

    if (deleteError) throw deleteError;

    // Record bulk delete action in activity logs
    for (const userId of userIds) {
      await supabase
        .from('activity_logs')
        .insert({
          user_id: userId,
          activity_type: 'bulk_action',
          description: 'User deleted by admin',
          metadata: { action: 'delete', admin_id: adminId },
          created_by: adminId
        });
    }

    return {
      success: true,
      deletedCount: userIds.length,
      message: `Successfully deleted ${userIds.length} user(s)`
    };
  } catch (error) {
    console.error('Error in bulkDeleteUsers:', error);
    throw error;
  }
};

/**
 * Bulk update user status
 */
const bulkUpdateStatus = async (userIds, status, adminId) => {
  try {
    if (!userIds || userIds.length === 0) {
      throw new Error('At least one user must be selected');
    }

    if (!status || !['active', 'inactive'].includes(status)) {
      throw new Error('Invalid status value');
    }

    // Validate all user IDs exist
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .in('id', userIds);

    if (fetchError) throw fetchError;

    if (!users || users.length === 0) {
      throw new Error('No valid users found');
    }

    if (users.length !== userIds.length) {
      throw new Error('One or more user IDs are invalid');
    }

    // Update status for all users
    const { error: updateError } = await supabase
      .from('users')
      .update({ account_status: status })
      .in('id', userIds);

    if (updateError) throw updateError;

    // Record status change in activity logs
    for (const userId of userIds) {
      await supabase
        .from('activity_logs')
        .insert({
          user_id: userId,
          activity_type: 'bulk_action',
          description: `User status changed to ${status} by admin`,
          metadata: { action: 'status_change', new_status: status, admin_id: adminId },
          created_by: adminId
        });
    }

    return {
      success: true,
      updatedCount: userIds.length,
      message: `Successfully updated status for ${userIds.length} user(s) to ${status}`
    };
  } catch (error) {
    console.error('Error in bulkUpdateStatus:', error);
    throw error;
  }
};

/**
 * Bulk change user role
 */
const bulkChangeRole = async (userIds, role, adminId) => {
  try {
    if (!userIds || userIds.length === 0) {
      throw new Error('At least one user must be selected');
    }

    if (!role || !['doctor', 'patient', 'lab'].includes(role)) {
      throw new Error('Invalid role value');
    }

    // Validate all user IDs exist
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, role')
      .in('id', userIds);

    if (fetchError) throw fetchError;

    if (!users || users.length === 0) {
      throw new Error('No valid users found');
    }

    if (users.length !== userIds.length) {
      throw new Error('One or more user IDs are invalid');
    }

    // Update role for all users
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: role })
      .in('id', userIds);

    if (updateError) throw updateError;

    // Record role change in activity logs and profile_changes
    for (const user of users) {
      // Activity log
      await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          activity_type: 'bulk_action',
          description: `User role changed from ${user.role} to ${role} by admin`,
          metadata: { action: 'role_change', old_role: user.role, new_role: role, admin_id: adminId },
          created_by: adminId
        });

      // Profile change record
      await supabase
        .from('profile_changes')
        .insert({
          user_id: user.id,
          field_name: 'role',
          old_value: user.role,
          new_value: role,
          is_sensitive: true,
          changed_by: adminId
        });
    }

    return {
      success: true,
      updatedCount: userIds.length,
      message: `Successfully changed role for ${userIds.length} user(s) to ${role}`
    };
  } catch (error) {
    console.error('Error in bulkChangeRole:', error);
    throw error;
  }
};

module.exports = {
  bulkDeleteUsers,
  bulkUpdateStatus,
  bulkChangeRole
};
