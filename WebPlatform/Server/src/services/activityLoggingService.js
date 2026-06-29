/**
 * Activity Logging Service
 * Handles recording and retrieving user activities
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Record a login activity
 */
const recordLogin = async (userId, ipAddress, userAgent = null) => {
  try {
    const { data, error } = await supabase
      .from('login_sessions')
      .insert({
        user_id: userId,
        login_time: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    // Record in activity_logs
    await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        activity_type: 'login',
        description: 'User logged in',
        metadata: { ip_address: ipAddress, user_agent: userAgent, session_id: data?.id }
      });

    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Record a logout activity
 */
const recordLogout = async (userId, sessionId) => {
  try {
    const logoutTime = new Date().toISOString();

    // If no sessionId provided, find the most recent active session for this user
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      const { data: activeSessions, error: fetchError } = await supabase
        .from('login_sessions')
        .select('id, is_active, login_time')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('login_time', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }
      
      if (activeSessions && activeSessions.length > 0) {
        activeSessionId = activeSessions[0].id;
      } else {
        // No active session found, just record the logout activity without updating session
        const { error: insertError } = await supabase
          .from('activity_logs')
          .insert({
            user_id: userId,
            activity_type: 'logout',
            description: 'User logged out',
            metadata: { note: 'No active session found' }
          });
        
        if (insertError) {
          throw insertError;
        }
        return { success: true, note: 'No active session found' };
      }
    }

    // Update login session with logout time
    const { data: updateData, error: updateError } = await supabase
      .from('login_sessions')
      .update({
        logout_time: logoutTime,
        is_active: false
      })
      .eq('id', activeSessionId)
      .select();

    if (updateError) {
      throw updateError;
    }

    // Record in activity_logs
    const { error: activityError } = await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        activity_type: 'logout',
        description: 'User logged out',
        metadata: { session_id: activeSessionId }
      });

    if (activityError) {
      throw activityError;
    }

    return { success: true };
  } catch (error) {
    throw error;
  }
};

/**
 * Record an appointment booking (uses existing appointments table)
 */
const recordAppointment = async (userId, doctorId, appointmentDate, appointmentTime, status = 'scheduled') => {
  try {
    // Get doctor name for activity log
    const { data: doctor } = await supabase
      .from('doctors')
      .select('full_name')
      .eq('user_id', doctorId)
      .single();

    // Record in activity_logs
    await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        activity_type: 'appointment_booked',
        description: `Appointment booked with ${doctor?.full_name || 'Doctor'} on ${appointmentDate}`,
        metadata: {
          doctor_id: doctorId,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          status: status
        }
      });

    return { success: true };
  } catch (error) {
    console.error('❌ Error recording appointment:', error.message);
    throw error;
  }
};

/**
 * Record a profile change
 */
const recordProfileChange = async (userId, fieldName, oldValue, newValue, changedBy) => {
  try {
    const sensitiveFields = ['email', 'phone', 'role'];
    const isSensitive = sensitiveFields.includes(fieldName);

    const { data, error } = await supabase
      .from('profile_changes')
      .insert({
        user_id: userId,
        field_name: fieldName,
        old_value: oldValue ? String(oldValue) : null,
        new_value: newValue ? String(newValue) : null,
        is_sensitive: isSensitive,
        changed_by: changedBy
      })
      .select()
      .single();

    if (error) throw error;

    // Record in activity_logs
    await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        activity_type: 'profile_changed',
        description: `Profile field '${fieldName}' changed`,
        metadata: {
          field_name: fieldName,
          old_value: oldValue,
          new_value: newValue,
          is_sensitive: isSensitive
        },
        created_by: changedBy
      });

    return data;
  } catch (error) {
    console.error('❌ Error recording profile change:', error.message);
    throw error;
  }
};

/**
 * Get activity log for a user with filtering and pagination
 */
const getActivityLog = async (userId, filters = {}, pagination = {}) => {
  try {
    const {
      type = null,
      startDate = null,
      endDate = null
    } = filters;

    const {
      page = 1,
      limit = 50
    } = pagination;

    let query = supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    // Apply type filter
    if (type) {
      query = query.eq('activity_type', type);
    }

    // Apply date filters
    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Sort by created_at descending (most recent first)
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      activities: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    };
  } catch (error) {
    console.error('❌ Error getting activity log:', error.message);
    throw error;
  }
};

/**
 * Get login history for a user
 */
const getLoginHistory = async (userId, pagination = {}) => {
  try {
    const { page = 1, limit = 50 } = pagination;

    let query = supabase
      .from('login_sessions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('login_time', { ascending: false });

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Calculate duration for each session
    const sessions = (data || []).map(session => {
      let duration = null;
      if (session.logout_time) {
        const loginTime = new Date(session.login_time);
        const logoutTime = new Date(session.logout_time);
        duration = Math.floor((logoutTime - loginTime) / 1000); // in seconds
      }

      return {
        ...session,
        duration
      };
    });

    // Get current active session if exists
    const { data: currentSession } = await supabase
      .from('login_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    return {
      sessions,
      currentSession: currentSession || null,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    };
  } catch (error) {
    console.error('❌ Error getting login history:', error.message);
    throw error;
  }
};

/**
 * Get appointment history for a user
 */
const getAppointmentHistory = async (userId, filters = {}, pagination = {}) => {
  try {
    const { status = null } = filters;
    const { page = 1, limit = 50 } = pagination;

    // Determine if user is a doctor or patient
    const { data: doctor } = await supabase
      .from('doctors')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    const { data: patient } = await supabase
      .from('patients')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    let query = supabase
      .from('appointments')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // If user is a doctor, get appointments where they are the doctor
    if (doctor) {
      query = query.eq('doctor_id', userId);
    } 
    // If user is a patient, get appointments where they are the patient
    else if (patient) {
      query = query.eq('patient_id', userId);
    } 
    // If neither, return empty
    else {
      return {
        appointments: [],
        totalCount: 0,
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0
        }
      };
    }

    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // If doctor, get patient names; if patient, get doctor names
    let appointments = (data || []);

    if (doctor) {
      // Get patient names from patients table
      const patientIds = [...new Set((data || []).map(a => a.patient_id))];
      const { data: patients } = await supabase
        .from('patients')
        .select('user_id, full_name')
        .in('user_id', patientIds);

      appointments = (data || []).map(apt => {
        const patientInfo = patients?.find(p => p.user_id === apt.patient_id);
        return {
          ...apt,
          doctorName: patientInfo?.full_name || 'Unknown',
          isPatientName: true
        };
      });
    } else {
      // Get doctor names from doctors table
      const doctorIds = [...new Set((data || []).map(a => a.doctor_id))];
      const { data: doctors } = await supabase
        .from('doctors')
        .select('user_id, full_name')
        .in('user_id', doctorIds);

      appointments = (data || []).map(apt => {
        const doctorInfo = doctors?.find(d => d.user_id === apt.doctor_id);
        return {
          ...apt,
          doctorName: doctorInfo?.full_name || 'Unknown',
          isPatientName: false
        };
      });
    }

    return {
      appointments,
      totalCount: count || 0,
      userType: doctor ? 'doctor' : 'patient',
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    };
  } catch (error) {
    console.error('❌ Error getting appointment history:', error.message);
    throw error;
  }
};

/**
 * Get profile changes for a user
 */
const getProfileChanges = async (userId, pagination = {}) => {
  try {
    const { page = 1, limit = 50 } = pagination;

    let query = supabase
      .from('profile_changes')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('changed_at', { ascending: false });

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Get names of users who made changes
    const changedByIds = [...new Set((data || []).map(c => c.changed_by))];
    
    // Try to get user names from doctors table first, then patients
    let userNames = {};
    
    if (changedByIds.length > 0) {
      const { data: doctors } = await supabase
        .from('doctors')
        .select('user_id, full_name')
        .in('user_id', changedByIds);
      
      (doctors || []).forEach(doc => {
        userNames[doc.user_id] = doc.full_name;
      });
      
      // Get remaining users from patients table
      const remainingIds = changedByIds.filter(id => !userNames[id]);
      if (remainingIds.length > 0) {
        const { data: patients } = await supabase
          .from('patients')
          .select('user_id, full_name')
          .in('user_id', remainingIds);
        
        (patients || []).forEach(pat => {
          userNames[pat.user_id] = pat.full_name;
        });
      }
    }

    const changes = (data || []).map(change => {
      return {
        ...change,
        changedByName: userNames[change.changed_by] || 'Unknown'
      };
    });

    return {
      changes,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    };
  } catch (error) {
    console.error('❌ Error getting profile changes:', error.message);
    throw error;
  }
};

module.exports = {
  recordLogin,
  recordLogout,
  recordAppointment,
  recordProfileChange,
  getActivityLog,
  getLoginHistory,
  getAppointmentHistory,
  getProfileChanges
};
