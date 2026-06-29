/**
 * Admin Schedule Service
 * Handles doctor schedule management
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get doctor's schedule
 */
const getDoctorSchedule = async (doctorId) => {
  try {
    const { data, error } = await supabase
      .from('doctor_availability')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('day_of_week', { ascending: true });

    if (error) throw error;

    // Format schedule with day names
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const formattedSchedule = data.map(slot => ({
      ...slot,
      day_name: dayNames[slot.day_of_week]
    }));

    return {
      doctor_id: doctorId,
      schedule: formattedSchedule
    };
  } catch (error) {
    console.error('Error getting doctor schedule:', error);
    throw error;
  }
};

/**
 * Create or update doctor schedule
 */
const createOrUpdateSchedule = async (doctorId, scheduleData, adminId) => {
  try {
    // Validate schedule data
    if (!Array.isArray(scheduleData) || scheduleData.length === 0) {
      throw new Error('Schedule data must be a non-empty array');
    }

    // Validate each schedule slot
    for (const slot of scheduleData) {
      if (slot.day_of_week < 0 || slot.day_of_week > 6) {
        throw new Error('Invalid day of week. Must be 0-6');
      }

      if (!slot.start_time || !slot.end_time) {
        throw new Error('Start time and end time are required');
      }

      // Validate time range
      if (slot.start_time >= slot.end_time) {
        throw new Error('End time must be after start time');
      }
    }

    // Delete existing schedule for this doctor
    const { error: deleteError } = await supabase
      .from('doctor_availability')
      .delete()
      .eq('doctor_id', doctorId);

    if (deleteError) throw deleteError;

    // Insert new schedule
    const scheduleToInsert = scheduleData.map(slot => ({
      doctor_id: doctorId,
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: slot.end_time,
      is_available: true,
      created_by: adminId
    }));

    const { data, error } = await supabase
      .from('doctor_availability')
      .insert(scheduleToInsert)
      .select();

    if (error) throw error;

    // Log audit action
    await supabase
      .from('audit_logs')
      .insert({
        admin_id: adminId,
        action_type: 'UPDATE',
        resource_type: 'Schedule',
        resource_id: doctorId,
        changes: { schedule: scheduleData },
        status: 'Success'
      });

    // Format response
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const formattedSchedule = data.map(slot => ({
      ...slot,
      day_name: dayNames[slot.day_of_week]
    }));

    return {
      doctor_id: doctorId,
      schedule: formattedSchedule
    };
  } catch (error) {
    console.error('Error creating/updating schedule:', error);
    throw error;
  }
};

/**
 * Delete specific schedule slot
 */
const deleteScheduleSlot = async (scheduleId, adminId) => {
  try {
    // Get the schedule to log it
    const { data: schedule, error: getError } = await supabase
      .from('doctor_availability')
      .select('*')
      .eq('id', scheduleId)
      .single();

    if (getError) throw getError;

    // Delete the schedule
    const { error: deleteError } = await supabase
      .from('doctor_availability')
      .delete()
      .eq('id', scheduleId);

    if (deleteError) throw deleteError;

    // Log audit action
    await supabase
      .from('audit_logs')
      .insert({
        admin_id: adminId,
        action_type: 'DELETE',
        resource_type: 'Schedule',
        resource_id: schedule.doctor_id,
        changes: { deleted_slot: schedule },
        status: 'Success'
      });

    return { success: true };
  } catch (error) {
    console.error('Error deleting schedule slot:', error);
    throw error;
  }
};

/**
 * Validate time range
 */
const validateTimeRange = (startTime, endTime) => {
  try {
    if (!startTime || !endTime) {
      throw new Error('Start time and end time are required');
    }

    if (startTime >= endTime) {
      throw new Error('End time must be after start time');
    }

    return true;
  } catch (error) {
    console.error('Error validating time range:', error);
    throw error;
  }
};

module.exports = {
  getDoctorSchedule,
  createOrUpdateSchedule,
  deleteScheduleSlot,
  validateTimeRange
};
