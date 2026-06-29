/**
 * Admin Availability Controller
 * Handles doctor availability management
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get doctor availability slots
 * GET /api/admin/doctors/:doctorId/availability
 */
exports.getDoctorAvailability = async (req, res) => {
  try {
    const { doctorId } = req.params;

    // Fetch availability slots from database
    const { data, error } = await supabase
      .from('doctor_availability')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching availability:', error);
      return res.status(500).json({ error: 'Failed to fetch availability' });
    }

    // Transform database format to frontend format
    const slots = (data || []).map(slot => ({
      id: slot.id,
      doctorId: slot.doctor_id,
      dayOfWeek: slot.day_of_week,
      startTime: slot.start_time,
      endTime: slot.end_time,
      isAvailable: slot.is_available,
    }));

    res.json(slots);
  } catch (err) {
    console.error('Error in getDoctorAvailability:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Save doctor availability (create, update, delete)
 * POST /api/admin/doctors/:doctorId/availability
 */
exports.saveDoctorAvailability = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { create = [], update = [], delete: deleteIds = [] } = req.body;
    const adminId = req.user.id;

    // Validate input
    if (!Array.isArray(create) || !Array.isArray(update) || !Array.isArray(deleteIds)) {
      return res.status(400).json({ error: 'Invalid request format' });
    }

    // Start transaction-like operations
    const results = {
      created: [],
      updated: [],
      deleted: [],
    };

    // Create new slots
    if (create.length > 0) {
      const createData = create.map(slot => ({
        doctor_id: doctorId,
        day_of_week: slot.dayOfWeek,
        start_time: slot.startTime,
        end_time: slot.endTime,
        is_available: slot.isAvailable !== false,
        created_by: adminId,
        created_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('doctor_availability')
        .insert(createData)
        .select();

      if (error) {
        console.error('Error creating availability:', error);
        return res.status(500).json({ error: 'Failed to create availability slots' });
      }

      results.created = data || [];

      // Log audit entry for each created slot
      for (const slot of data || []) {
        await logAuditEntry(adminId, 'CREATE', 'Schedule', slot.id, {
          doctor_id: doctorId,
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
        });
      }
    }

    // Update existing slots
    if (update.length > 0) {
      for (const slot of update) {
        const { error } = await supabase
          .from('doctor_availability')
          .update({
            day_of_week: slot.dayOfWeek,
            start_time: slot.startTime,
            end_time: slot.endTime,
            is_available: slot.isAvailable !== false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', slot.id);

        if (error) {
          console.error('Error updating availability:', error);
          return res.status(500).json({ error: 'Failed to update availability slots' });
        }

        results.updated.push(slot.id);

        // Log audit entry
        await logAuditEntry(adminId, 'UPDATE', 'Schedule', slot.id, {
          day_of_week: slot.dayOfWeek,
          start_time: slot.startTime,
          end_time: slot.endTime,
        });
      }
    }

    // Delete slots
    if (deleteIds.length > 0) {
      const { error } = await supabase
        .from('doctor_availability')
        .delete()
        .in('id', deleteIds);

      if (error) {
        console.error('Error deleting availability:', error);
        return res.status(500).json({ error: 'Failed to delete availability slots' });
      }

      results.deleted = deleteIds;

      // Log audit entries
      for (const id of deleteIds) {
        await logAuditEntry(adminId, 'DELETE', 'Schedule', id, {
          doctor_id: doctorId,
        });
      }
    }

    res.json({
      success: true,
      message: 'Availability updated successfully',
      data: results,
    });
  } catch (err) {
    console.error('Error in saveDoctorAvailability:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Validate availability slot
 * POST /api/admin/doctors/availability/validate
 */
exports.validateAvailabilitySlot = async (req, res) => {
  try {
    const { dayOfWeek, startTime, endTime } = req.body;
    const errors = {};

    // Validate day of week
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      errors.dayOfWeek = 'Please select a valid day of the week';
    }

    // Validate time format
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime)) {
      errors.startTime = 'Invalid time format. Use HH:MM';
    }
    if (!timeRegex.test(endTime)) {
      errors.endTime = 'Invalid time format. Use HH:MM';
    }

    // Validate time range
    if (timeRegex.test(startTime) && timeRegex.test(endTime)) {
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      const startTotalMin = startHour * 60 + startMin;
      const endTotalMin = endHour * 60 + endMin;

      if (endTotalMin <= startTotalMin) {
        errors.endTime = 'End time must be after start time';
      }
    }

    const isValid = Object.keys(errors).length === 0;

    res.json({
      valid: isValid,
      errors: isValid ? {} : errors,
    });
  } catch (err) {
    console.error('Error in validateAvailabilitySlot:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Helper function to log audit entries
 */
async function logAuditEntry(adminId, actionType, resourceType, resourceId, changes) {
  try {
    await supabase
      .from('audit_logs')
      .insert({
        admin_id: adminId,
        action_type: actionType,
        resource_type: resourceType,
        resource_id: resourceId,
        changes: changes,
        created_at: new Date().toISOString(),
      });
  } catch (err) {
    console.error('Error logging audit entry:', err);
    // Don't throw - audit logging shouldn't block the main operation
  }
}
