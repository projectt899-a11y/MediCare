const express = require('express');
const router = express.Router();
const multer = require('multer');
const { supabase } = require('../lib/database');

// Memory storage for Supabase uploads (profile pictures)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG and PNG images allowed'), false);
    }
  }
});

// Memory storage for message attachments
const messageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for messages
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'), false);
  },
});

const authenticatePatient = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid token' });

    if (user.user_metadata?.role !== 'patient') {
      return res.status(403).json({ error: 'Access denied: Not a patient' });
    }

    req.user = {
      userId: user.id, // UUID
      email: user.email,
      role: user.user_metadata.role,
      fullName: user.user_metadata.full_name || 'Patient'
    };
    next();
  } catch (err) {
    res.status(500).json({ error: 'Auth error' });
  }
};

// GET /api/patient/profile - جلب بيانات المريض الحالي
router.get('/profile', authenticatePatient, async (req, res) => {
  try {
    const { data: patient, error } = await supabase
      .from('patients')
      .select('user_id, full_name, phone_number, age, blood_type, address, gender, email, profile_picture')
      .eq('user_id', req.user.userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Patient profile error:', error);
      return res.status(500).json({ error: 'Server error' });
    }

    // If patient not found, return default profile
    if (!patient) {
      return res.json({
        fullName: req.user.fullName || 'Patient',
        email: req.user.email,
        phone: null,
        age: null,
        gender: 'N/A',
        bloodType: 'N/A',
        address: 'N/A',
        profilePicture: null,
        allergies: 'N/A',
        chronicDiseases: 'N/A',
        medications: 'N/A'
      });
    }

    res.json({
      fullName: patient.full_name,
      email: patient.email || req.user.email,
      phone: patient.phone_number,
      age: patient.age,
      gender: patient.gender || 'N/A',
      bloodType: patient.blood_type || 'N/A',
      address: patient.address || 'N/A',
      profilePicture: patient.profile_picture || null,
      allergies: 'N/A',
      chronicDiseases: 'N/A',
      medications: 'N/A'
    });
    
  } catch (err) {
    console.error('Patient profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/patient/profile
router.put('/profile', authenticatePatient, upload.single('profilePicture'), async (req, res) => {

  try {
    const updates = {
      full_name: req.body.fullName,
      phone_number: req.body.phone,
      age: req.body.age ? Number(req.body.age) : null,
      gender: req.body.gender,
      blood_type: req.body.bloodType,
      address: req.body.address
    };

    if (req.file) {
      const file = req.file;
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${req.user.userId}-${Date.now()}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });
      
      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      updates.profile_picture = publicUrl;
      console.log('Profile picture uploaded:', publicUrl);
    }

    console.log('Updating patient with:', updates);

    const { error: updateError} = await supabase
      .from('patients')
      .update(updates)
      .eq('user_id', req.user.userId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    // Record profile changes activity
    try {
      const activityLoggingService = require('../services/activityLoggingService');
      
      // Record each field change
      for (const [field, newValue] of Object.entries(updates)) {
        if (newValue !== null && newValue !== undefined) {
          await activityLoggingService.recordProfileChange(
            req.user.userId,
            field,
            null, // old value not tracked for simplicity
            String(newValue),
            req.user.userId
          );
        }
      }
    } catch (activityErr) {
      console.error('Failed to record profile change activity:', activityErr);
      // Don't fail the profile update if activity logging fails
    }

    res.json({ message: 'Profile updated successfully', profilePicture: updates.profile_picture });
  } catch (err) {
    console.error('Patient update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/patient/appointments - Book a new appointment
router.post('/appointments', authenticatePatient, async (req, res) => {
  const { doctor_id, appointment_time, appointment_type } = req.body;

  console.log('📝 Appointment booking request:', {
    doctor_id,
    appointment_time,
    appointment_type,
    patient_id: req.user.userId
  });

  if (!doctor_id || !appointment_time) {
    return res.status(400).json({ error: 'Doctor ID and appointment time are required' });
  }

  try {
    // Validate appointment time is in the future
    const appointmentDate = new Date(appointment_time);
    const now = new Date();
    console.log('⏰ Time validation:', {
      appointmentDate: appointmentDate.toISOString(),
      now: now.toISOString(),
      isInFuture: appointmentDate > now
    });

    if (appointmentDate <= now) {
      return res.status(400).json({ error: 'Appointment time must be in the future' });
    }

    // Check if doctor exists
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('user_id')
      .eq('user_id', doctor_id)
      .single();

    if (doctorError || !doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Check for conflicting appointments (same doctor, same time slot - within 30 min)
    const { data: conflicting } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctor_id)
      .gte('appointment_time', new Date(appointmentDate.getTime() - 30 * 60000).toISOString())
      .lte('appointment_time', new Date(appointmentDate.getTime() + 30 * 60000).toISOString())
      .eq('status', 'Confirmed');

    if (conflicting && conflicting.length > 0) {
      return res.status(409).json({ error: 'This time slot is already booked. Please choose another time.' });
    }

    // Create the appointment
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        doctor_id,
        patient_id: req.user.userId,
        appointment_time,
        appointment_type: appointment_type || 'Consultation',
        status: 'Pending'
      })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Appointment created successfully:', {
      id: data.id,
      appointment_time: data.appointment_time,
      status: data.status,
      doctor_id: data.doctor_id,
      patient_id: data.patient_id
    });

    // Record appointment booking activity
    try {
      const activityLoggingService = require('../services/activityLoggingService');
      await activityLoggingService.recordAppointment(
        req.user.userId,
        doctor_id,
        appointment_time,
        appointment_type || 'Consultation',
        'scheduled'
      );
    } catch (activityErr) {
      console.error('Failed to record appointment activity:', activityErr);
      // Don't fail the appointment booking if activity logging fails
    }

    // Notify the doctor
    const aptDate = new Date(appointment_time).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    await supabase.from('notifications').insert({
      user_id: doctor_id,
      type: 'new_appointment',
      message: `${req.user.fullName} booked an appointment on ${aptDate}`
    });

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment: data
    });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ error: 'Failed to book appointment', details: err.message });
  }
});

// GET /api/patient/appointments - Get all appointments for the patient
router.get('/appointments', authenticatePatient, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_time,
        status,
        doctor:doctor_id (
          user_id,
          full_name,
          specialty
        )
      `)
      .eq('patient_id', req.user.userId)
      .order('appointment_time', { ascending: false });

    if (error) throw error;

    // Format the response
    const formatted = (data || []).map(apt => ({
      id: apt.id,
      doctor: apt.doctor?.full_name || 'Unknown Doctor',
      specialization: apt.doctor?.specialty || 'N/A',
      date: new Date(apt.appointment_time).toISOString().split('T')[0],
      time: new Date(apt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: apt.status,
      appointment_time: apt.appointment_time
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Appointments fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// GET /api/patient/diagnoses - Get all diagnoses for the patient
router.get('/diagnoses', authenticatePatient, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('doctor_reviews')
      .select('id, diagnosis, created_at, doctor_name, specialty')
      .eq('patient_id', req.user.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Map fields to match frontend expectations
    const formatted = (data || []).map(d => ({
      id: d.id,
      diagnosis_text: d.diagnosis,
      created_at: d.created_at,
      doctor_name: d.doctor_name || 'Unknown Doctor',
      specialization: d.specialty || ''
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Diagnoses fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch diagnoses' });
  }
});

// GET /api/patient/ai-analysis - Get AI analysis from latest X-Ray
router.get('/ai-analysis', authenticatePatient, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('xray_history')
      .select('id, image_url, diagnosis, created_at')
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.json(null);
    }

    const analysis = data[0];
    res.json({
      image_url: analysis.image_url,
      ai_diagnosis: analysis.diagnosis,
      created_at: analysis.created_at
    });
  } catch (err) {
    console.error('AI analysis fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch AI analysis' });
  }
});

// GET /api/patient/pills - Get treatment plan for the patient
router.get('/pills', authenticatePatient, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('treatment_plan')
      .select('id, medication_name, dosage, frequency, meal_timing, start_date, end_date, notes, status, created_at, updated_at')
      .eq('patient_id', req.user.userId)
      .eq('status', 'Active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Map fields to match frontend expectations
    const formatted = (data || []).map(item => ({
      id: item.id,
      name: item.medication_name,
      dosage: item.dosage,
      frequency: item.frequency,
      meal_timing: item.meal_timing,
      start_date: item.start_date,
      end_date: item.end_date,
      notes: item.notes,
      status: item.status
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Pills fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch treatment plan' });
  }
});

// PUT /api/patient/appointments/:id - Reschedule an appointment
router.put('/appointments/:id', authenticatePatient, async (req, res) => {
  const appointmentId = req.params.id;
  const { appointment_time } = req.body;

  if (!appointment_time) {
    return res.status(400).json({ error: 'Appointment time is required' });
  }

  try {
    // Verify the appointment belongs to this patient
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, patient_id')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (appointment.patient_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update the appointment
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ appointment_time })
      .eq('id', appointmentId);

    if (updateError) throw updateError;

    res.json({ message: 'Appointment rescheduled successfully' });
  } catch (err) {
    console.error('Reschedule error:', err);
    res.status(500).json({ error: 'Failed to reschedule appointment' });
  }
});

// DELETE /api/patient/appointments/:id - Cancel an appointment
router.delete('/appointments/:id', authenticatePatient, async (req, res) => {
  const appointmentId = req.params.id;

  try {
    // Verify the appointment belongs to this patient
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, patient_id, doctor_id, appointment_time')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (appointment.patient_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update status to cancelled
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status: 'Cancelled' })
      .eq('id', appointmentId);

    if (updateError) throw updateError;

    // Notify the doctor
    const aptDate = new Date(appointment.appointment_time).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    await supabase.from('notifications').insert({
      user_id: appointment.doctor_id,
      type: 'cancelled_appointment',
      message: `${req.user.fullName} cancelled their appointment on ${aptDate}`
    });

    res.json({ message: 'Appointment cancelled successfully' });
  } catch (err) {
    console.error('Cancel error:', err);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

router.get('/chats', authenticatePatient, async (req, res) => {
  try {
    const { data: lastMessages, error: msgError } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        receiver_id,
        message_text,
        sent_at,
        is_read
      `)
      .eq('sender_id', req.user.userId)
      .order('sent_at', { ascending: false });

    if (msgError) throw msgError;

    const doctorIds = [...new Set(lastMessages.map(msg => msg.receiver_id))];
    if (doctorIds.length === 0) {
      return res.json([]);
    }

    const { data: doctors, error: docError } = await supabase
      .from('doctors')
      .select('user_id, full_name, profile_picture')
      .in('user_id', doctorIds);

    if (docError) throw docError;

    const chats = doctorIds.map(doctorId => {
      const lastMsg = lastMessages.find(msg => msg.receiver_id === doctorId);
      const doctor = doctors.find(d => d.user_id === doctorId) || {};
      
      // Count all unread messages sent to this doctor (messages patient sent that doctor hasn't read)
      const unreadCount = lastMessages.filter(msg => 
        msg.receiver_id === doctorId && !msg.is_read
      ).length;

      return {
        id: doctorId,
        name: doctor.full_name || 'Dr. Unknown',
        avatar: doctor.full_name ? doctor.full_name.charAt(0).toUpperCase() : 'D',
        profilePicture: doctor.profile_picture || null,
        lastMessage: lastMsg?.message_text || '',
        time: lastMsg ? new Date(lastMsg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        unread: unreadCount
      };
    });

    res.json(chats);
  } catch (err) {
    console.error('Patient chats fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

router.get('/chats/:doctorId', authenticatePatient, async (req, res) => {
  const doctorId = req.params.doctorId;

  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        receiver_id,
        message_text,
        file_path,
        file_type,
        file_name,
        sent_at
      `)
      .or(`and(sender_id.eq.${req.user.userId},receiver_id.eq.${doctorId}),and(sender_id.eq.${doctorId},receiver_id.eq.${req.user.userId})`)
      .order('sent_at', { ascending: true });

    if (error) throw error;

    // Mark as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', req.user.userId)
      .eq('sender_id', doctorId)
      .is('is_read', false);

    res.json(data || []);
  } catch (err) {
    console.error('Patient chat messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/chats/:doctorId', authenticatePatient, messageUpload.single('attachment'), async (req, res) => {
  const doctorId = req.params.doctorId;
  const { message_text } = req.body;

  if (!message_text?.trim() && !req.file) {
    return res.status(400).json({ error: 'Message text or attachment is required' });
  }

  let filePath = null;
  let fileType = null;
  let fileName = null;

  try {
    // Upload file to Supabase Storage if present
    if (req.file) {
      const fileExt = req.file.originalname.split('.').pop();
      const uniqueFileName = `${req.user.userId}-${Date.now()}.${fileExt}`;
      const supabasePath = `messages/${uniqueFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('messages')
        .upload(supabasePath, req.file.buffer, {
          contentType: req.file.mimetype,
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('messages')
        .getPublicUrl(supabasePath);

      filePath = urlData.publicUrl;
      fileType = req.file.mimetype;
      fileName = req.file.originalname;
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: req.user.userId,
        receiver_id: doctorId,
        message_text: message_text?.trim() || '',
        file_path: filePath,
        file_type: fileType,
        file_name: fileName,
      })
      .select()
      .single();

    if (error) throw error;

    // Notify the doctor about new message
    await supabase.from('notifications').insert({
      user_id: doctorId,
      type: 'new_message',
      message: `New message from ${req.user.fullName}`
    });

    res.status(201).json(data);
  } catch (err) {
    console.error('Patient send message error:', err);
    res.status(500).json({ error: 'Failed to send message', details: err.message });
  }
});

// GET /api/patient/notifications
router.get('/notifications', authenticatePatient, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, message, is_read, created_at')
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Ensure all notifications have proper is_read value (default to false if null)
    const cleanedData = (data || []).map(notif => ({
      ...notif,
      is_read: notif.is_read === true ? true : false
    }));
    
    res.json(cleanedData);
  } catch (err) {
    console.error('Notifications fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PATCH /api/patient/notifications/read-all
router.patch('/notifications/read-all', authenticatePatient, async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.userId)
      .eq('is_read', false);

    if (error) throw error;
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

// PATCH /api/patient/notifications/:id/read - Mark a single notification as read
router.patch('/notifications/:id/read', authenticatePatient, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId)
      .select('id');

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', data: data[0] });
  } catch (err) {
    console.error('Update notification error:', err);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// DELETE /api/patient/notifications/:id
router.delete('/notifications/:id', authenticatePatient, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId)
      .select('id');

    if (error) {
      console.error('Supabase delete error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// GET /api/patient/assigned-nurses - Get all nurses assigned to this patient
router.get('/assigned-nurses', authenticatePatient, async (req, res) => {
  try {
    // Get all active assignments for this patient
    const { data: assignments, error: assignmentError } = await supabase
      .from('nurse_patient_assignments')
      .select('nurse_id, assignment_date, status')
      .eq('patient_id', req.user.userId)
      .eq('status', 'active');

    if (assignmentError) {
      return res.status(400).json({
        error: 'Failed to fetch assignments',
        details: assignmentError.message
      });
    }

    if (!assignments || assignments.length === 0) {
      return res.json([]);
    }

    // Get all users to fetch nurse details
    const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      return res.status(500).json({
        error: 'Failed to fetch nurse details',
        details: listError.message
      });
    }

    // Map assignments to nurse details
    const nurses = assignments
      .map(assignment => {
        const nurse = allUsers.users.find(u => u.id === assignment.nurse_id);
        return nurse ? {
          id: nurse.id,
          full_name: nurse.user_metadata?.full_name || '',
          email: nurse.email,
          phone_number: nurse.user_metadata?.phone_number || '',
          gender: nurse.user_metadata?.gender || '',
          assignment_date: assignment.assignment_date,
          status: assignment.status
        } : null;
      })
      .filter(nurse => nurse !== null);

    res.json(nurses);
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// FOLLOW-UP QUESTIONS ENDPOINTS
// ============================================================================

// GET /api/follow-up-requests - Get all follow-up requests for a patient
router.get('/follow-up-requests', authenticatePatient, async (req, res) => {
  try {
    const patientId = req.query.patient_id || req.user.userId;

    // Verify patient is requesting their own data
    if (patientId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized: Cannot access other patient\'s data' });
    }

    const { data: requests, error } = await supabase
      .from('follow_up_requests')
      .select('id, patient_id, nurse_id, created_by_nurse_id, title, description, status, created_at')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch follow-up requests', details: error.message });
    }

    // Collect all nurse IDs (nurse_id or created_by_nurse_id as fallback)
    const nurseIds = [...new Set((requests || []).map(r => r.nurse_id || r.created_by_nurse_id).filter(Boolean))];
    let nurseMap = {};
    if (nurseIds.length > 0) {
      try {
        const { data: allUsers } = await supabase.auth.admin.listUsers();
        (allUsers?.users || []).forEach(u => {
          if (nurseIds.includes(u.id)) {
            nurseMap[u.id] = u.user_metadata?.full_name || '';
          }
        });
      } catch (err) {
        console.error('Error fetching nurse names:', err);
      }
    }

    const enrichedRequests = (requests || []).map(request => {
      const effectiveNurseId = request.nurse_id || request.created_by_nurse_id;
      return {
        ...request,
        nurse_name: (effectiveNurseId && nurseMap[effectiveNurseId]) || 'Unknown'
      };
    });

    res.json(enrichedRequests);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// GET /api/follow-up-requests/:requestId - Get follow-up request details with questions and answers
router.get('/follow-up-requests/:requestId', authenticatePatient, async (req, res) => {
  try {
    const { requestId } = req.params;

    // Get the request
    const { data: request, error: requestError } = await supabase
      .from('follow_up_requests')
      .select('id, patient_id, nurse_id, created_by_nurse_id, title, description, status, created_at')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      return res.status(404).json({ error: 'Follow-up request not found' });
    }

    // Verify patient owns this request
    if (request.patient_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized: Cannot access other patient\'s data' });
    }

    // Get nurse name using auth.admin — use nurse_id or created_by_nurse_id as fallback
    const effectiveNurseId = request.nurse_id || request.created_by_nurse_id;
    let nurseName = 'Unknown';
    if (effectiveNurseId) {
      try {
        const { data: allUsers } = await supabase.auth.admin.listUsers();
        const nurse = (allUsers?.users || []).find(u => u.id === effectiveNurseId);
        if (nurse?.user_metadata?.full_name) {
          nurseName = nurse.user_metadata.full_name;
        }
      } catch (err) {
        console.error('Error fetching nurse name:', err);
      }
    }

    // Get questions
    const { data: questions, error: questionsError } = await supabase
      .from('follow_up_questions')
      .select('id, request_id, question, created_at')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    if (questionsError) {
      return res.status(500).json({ error: 'Failed to fetch questions', details: questionsError.message });
    }

    // Get answers
    const { data: answers, error: answersError } = await supabase
      .from('follow_up_answers')
      .select('id, question_id, patient_id, answer, created_at')
      .eq('patient_id', req.user.userId)
      .in('question_id', (questions || []).map(q => q.id));

    if (answersError) {
      return res.status(500).json({ error: 'Failed to fetch answers', details: answersError.message });
    }

    res.json({
      request: {
        ...request,
        nurse_name: nurseName
      },
      questions: questions || [],
      answers: answers || []
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// POST /api/patient/follow-up-answers - Submit an answer to a follow-up question
router.post('/follow-up-answers', authenticatePatient, async (req, res) => {
  try {
    const { follow_up_question_id, patient_id, answer_text } = req.body;

    // Validate required fields
    if (!follow_up_question_id || !answer_text) {
      return res.status(400).json({ error: 'Question ID and answer text are required' });
    }

    // Verify patient is submitting their own answer
    if (patient_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized: Cannot submit answers for other patients' });
    }

    // Check if question exists — also fetch the follow-up request to get the nurse ID
    const { data: question, error: questionError } = await supabase
      .from('follow_up_questions')
      .select('id, request_id')
      .eq('id', follow_up_question_id)
      .single();

    if (questionError || !question) {
      console.error('❌ [FOLLOW-UP ANSWER] Question not found:', questionError?.message);
      return res.status(404).json({ error: 'Question not found' });
    }

    // Fetch the follow-up request to get the nurse to notify
    const { data: followUpRequest } = await supabase
      .from('follow_up_requests')
      .select('created_by_nurse_id, nurse_id, title')
      .eq('id', question.request_id)
      .single();

    const nurseToNotify = followUpRequest?.created_by_nurse_id || followUpRequest?.nurse_id;
    const patientName = req.user.fullName || 'A patient';
    const requestTitle = followUpRequest?.title || 'a follow-up request';

    // Check if answer already exists
    const { data: existingAnswer } = await supabase
      .from('follow_up_answers')
      .select('id')
      .eq('question_id', follow_up_question_id)
      .eq('patient_id', req.user.userId)
      .single();

    if (existingAnswer) {
      // Update existing answer
      const { data: updated, error: updateError } = await supabase
        .from('follow_up_answers')
        .update({
          answer: answer_text,
          created_at: new Date().toISOString()
        })
        .eq('question_id', follow_up_question_id)
        .eq('patient_id', req.user.userId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ [FOLLOW-UP ANSWER] Update error:', updateError.message);
        return res.status(500).json({ error: 'Failed to update answer', details: updateError.message });
      }

      // Notify the nurse that the patient updated their answer
      if (nurseToNotify) {
        await supabase.from('notifications').insert({
          user_id: nurseToNotify,
          type: 'follow_up_answer_updated',
          message: `${patientName} updated their answer in "${requestTitle}"`
        });
      }

      return res.json({ data: updated, message: 'Answer updated successfully' });
    }

    // Insert new answer
    const { data: answer, error: insertError } = await supabase
      .from('follow_up_answers')
      .insert({
        question_id: follow_up_question_id,
        request_id: question.request_id,
        patient_id: req.user.userId,
        answer: answer_text,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ [FOLLOW-UP ANSWER] Insert error:', insertError.message);
      return res.status(500).json({ error: 'Failed to submit answer', details: insertError.message });
    }

    // Notify the nurse that the patient submitted an answer
    if (nurseToNotify) {
      await supabase.from('notifications').insert({
        user_id: nurseToNotify,
        type: 'follow_up_answer_submitted',
        message: `${patientName} answered a question in "${requestTitle}"`
      });
    }

    res.status(201).json({ data: answer, message: 'Answer submitted successfully' });
  } catch (err) {
    console.error('❌ [FOLLOW-UP ANSWER] Error:', err.message);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// GET /api/patient/:patientId/nurses - Get nurses assigned to a patient
router.get('/:patientId/nurses', authenticatePatient, async (req, res) => {
  try {
    const { patientId } = req.params;

    // Verify patient is requesting their own data
    if (patientId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized: Cannot access other patient\'s data' });
    }

    // Get all active assignments for this patient
    const { data: assignments, error: assignmentError } = await supabase
      .from('nurse_patient_assignments')
      .select('nurse_id, assignment_date, status')
      .eq('patient_id', patientId)
      .eq('status', 'active');

    if (assignmentError) {
      return res.status(500).json({ error: 'Failed to fetch assignments', details: assignmentError.message });
    }

    if (!assignments || assignments.length === 0) {
      return res.json([]);
    }

    // Get nurse details from auth.users
    const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      return res.status(500).json({ error: 'Failed to fetch nurse details', details: listError.message });
    }

    // Map assignments to nurse details
    const nurses = assignments
      .map(assignment => {
        const nurse = allUsers.users.find(u => u.id === assignment.nurse_id);
        return nurse ? {
          id: nurse.id,
          full_name: nurse.user_metadata?.full_name || '',
          email: nurse.email,
          phone_number: nurse.user_metadata?.phone_number || '',
          gender: nurse.user_metadata?.gender || '',
          account_status: nurse.user_metadata?.account_status || 'active',
          created_at: nurse.created_at
        } : null;
      })
      .filter(nurse => nurse !== null);

    res.json(nurses);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET /api/patient/lab-history - Get lab history with images and diagnosis
router.get('/lab-history', authenticatePatient, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('lab_history')
      .select('id, diagnosis, image_url, created_at')
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Lab history fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch lab history' });
    }

    // Process URLs - generate signed URLs for authenticated access
    const processedReports = await Promise.all(
      (data || []).map(async (report) => {
        let imageUrl = report.image_url;
        
        try {
          if (imageUrl) {
            // Check if it's already a full URL or just a file path
            if (imageUrl.startsWith('http')) {
              // It's a full URL - extract just the file path
              const urlParts = imageUrl.split('/lab-results/');
              if (urlParts.length > 1) {
                const filePath = urlParts[1];
                
                const { data: signedData, error: signError } = await supabase.storage
                  .from('lab-results')
                  .createSignedUrl(filePath, 3600); // 1 hour expiry
                
                if (!signError && signedData?.signedUrl) {
                  imageUrl = signedData.signedUrl;
                } else {
                  console.warn(`⚠️ Failed to generate signed URL for: ${filePath}`);
                }
              }
            } else {
              // It's just a file path
              const { data: signedData, error: signError } = await supabase.storage
                .from('lab-results')
                .createSignedUrl(imageUrl, 3600); // 1 hour expiry
              
              if (!signError && signedData?.signedUrl) {
                imageUrl = signedData.signedUrl;
              } else {
                console.warn(`⚠️ Failed to generate signed URL for: ${imageUrl}`);
              }
            }
          }
        } catch (err) {
          console.warn(`⚠️ Error processing image URL:`, err.message);
        }
        
        return {
          ...report,
          image_url: imageUrl
        };
      })
    );

    res.json(processedReports);
  } catch (err) {
    console.error('❌ Lab history error:', err);
    res.status(500).json({ error: 'Failed to fetch lab history' });
  }
});

// GET /api/patient/lab-image-check - Debug endpoint to check lab images in storage
router.get('/lab-image-check', authenticatePatient, async (req, res) => {
  try {
    console.log('🔍 Checking lab images in storage...');
    
    // Try to list files from lab-results bucket
    const { data: files, error: listError } = await supabase.storage
      .from('lab-results')
      .list('', { limit: 100 });
    
    if (listError) {
      console.error('❌ Error listing lab-results bucket:', listError);
      return res.status(500).json({ 
        error: 'Cannot access lab-results bucket',
        details: listError.message,
        message: 'The lab-results bucket may not be accessible or may not exist'
      });
    }
    
    console.log(`📁 Found ${files?.length || 0} files in lab-results bucket`);
    if (files && files.length > 0) {
      console.log('Files:', files.map(f => f.name).join(', '));
    }
    
    // Also get lab history for this patient to compare
    const { data: labHistory, error: historyError } = await supabase
      .from('lab_history')
      .select('id, image_url, created_at')
      .eq('user_id', req.user.userId);
    
    if (historyError) {
      console.error('❌ Error fetching lab history:', historyError);
      return res.status(500).json({ 
        error: 'Cannot fetch lab history',
        details: historyError.message
      });
    }
    
    console.log(`📊 Patient has ${labHistory?.length || 0} lab reports`);
    
    res.json({
      bucketFiles: {
        count: files?.length || 0,
        files: files?.map(f => ({
          name: f.name,
          id: f.id,
          created_at: f.created_at,
          updated_at: f.updated_at,
          metadata: f.metadata
        })) || []
      },
      patientLabReports: labHistory?.map(r => ({
        id: r.id,
        image_url: r.image_url,
        created_at: r.created_at
      })) || [],
      message: 'Lab storage diagnostic data'
    });
  } catch (err) {
    console.error('❌ Lab image check error:', err);
    res.status(500).json({ error: 'Failed to check lab images' });
  }
});

module.exports = router;