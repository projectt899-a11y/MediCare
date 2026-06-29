/**
 * Admin Schedule Controller
 * Handles HTTP requests for doctor schedule management
 */

const adminScheduleService = require('../services/adminScheduleService');

/**
 * GET /api/admin/doctors/:doctorId/schedule
 * Get doctor's schedule
 */
const getDoctorSchedule = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const schedule = await adminScheduleService.getDoctorSchedule(doctorId);

    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Error in getDoctorSchedule:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * POST /api/admin/doctors/:doctorId/schedule
 * Create or update doctor's schedule
 */
const createOrUpdateSchedule = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { schedule } = req.body;

    if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: [{ field: 'schedule', message: 'Schedule must be a non-empty array' }]
      });
    }

    // Validate each schedule slot
    const errors = [];
    schedule.forEach((slot, index) => {
      if (slot.day_of_week < 0 || slot.day_of_week > 6) {
        errors.push({
          field: `schedule[${index}].day_of_week`,
          message: 'Day of week must be 0-6'
        });
      }

      if (!slot.start_time || !slot.end_time) {
        errors.push({
          field: `schedule[${index}]`,
          message: 'Start time and end time are required'
        });
      }

      if (slot.start_time && slot.end_time && slot.start_time >= slot.end_time) {
        errors.push({
          field: `schedule[${index}].end_time`,
          message: 'End time must be after start time'
        });
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: errors
      });
    }

    const result = await adminScheduleService.createOrUpdateSchedule(doctorId, schedule, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Schedule updated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in createOrUpdateSchedule:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * DELETE /api/admin/doctors/:doctorId/schedule/:scheduleId
 * Delete specific schedule slot
 */
const deleteScheduleSlot = async (req, res) => {
  try {
    const { scheduleId } = req.params;

    await adminScheduleService.deleteScheduleSlot(scheduleId, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteScheduleSlot:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

module.exports = {
  getDoctorSchedule,
  createOrUpdateSchedule,
  deleteScheduleSlot
};
