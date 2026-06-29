const { supabase } = require('../lib/database');
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Memory storage for Supabase uploads (profile pictures)
const profileUpload = multer({
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

// Memory storage for certificates (PDF and images)
const certificateUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'), false);
  },
});

// Multer storage for message attachments (memory storage for Supabase upload)
const messageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for messages
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'), false);
  },
});

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (user.user_metadata?.role !== 'doctor') {
      return res.status(403).json({ error: 'Access denied: Not a doctor' });
    }

    req.user = {
      userId: user.id, 
      email: user.email,
      role: user.user_metadata.role,
      fullName: user.user_metadata.full_name || 'Doctor'
    };
    next();
  } catch (err) {
    res.status(500).json({ error: 'Auth error' });
  }
};

// ============================================================================
// NURSE ASSIGNMENT ENDPOINT (MUST BE BEFORE OTHER ROUTES)
// ============================================================================

// GET /api/doctor/nurses - Get active nurses for assignment (Doctor access)
router.get('/nurses', authenticate, async (req, res) => {
  try {
    // Try to get nurses from database first (more reliable)
    const { data: nursesFromDb, error: dbError } = await supabase
      .from('users')
      .select('id, email, user_metadata')
      .eq('role', 'nurse')
      .eq('account_status', 'active');

    if (!dbError && nursesFromDb && nursesFromDb.length > 0) {
      const nurses = nursesFromDb.map(user => ({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
        phone_number: user.user_metadata?.phone_number || '',
        gender: user.user_metadata?.gender || '',
        account_status: 'active',
        role: 'nurse',
        created_at: user.created_at,
        updated_at: user.updated_at
      }));

      return res.json({
        data: {
          nurses: nurses
        },
        message: 'Active nurses retrieved successfully'
      });
    }

    // Fallback: Get from auth.users if database query fails
    const { data: allUsers, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('❌ [DOCTOR NURSES] Error listing users:', usersError.message);
      return res.status(400).json({
        error: 'Failed to fetch nurses',
        details: usersError.message
      });
    }

    if (!allUsers || !allUsers.users) {
      return res.json({
        data: {
          nurses: []
        },
        message: 'No nurses available'
      });
    }

    // Filter for active nurses only
    const nurses = allUsers.users
      .filter(user => {
        const isNurse = user.user_metadata?.role === 'nurse';
        const isActive = user.user_metadata?.account_status === 'active';
        return isNurse && isActive;
      })
      .map(user => ({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
        phone_number: user.user_metadata?.phone_number || '',
        gender: user.user_metadata?.gender || '',
        account_status: user.user_metadata?.account_status || 'active',
        role: 'nurse',
        created_at: user.created_at,
        updated_at: user.updated_at
      }));

    res.json({
      data: {
        nurses: nurses
      },
      message: 'Active nurses retrieved successfully'
    });
  } catch (error) {
    console.error('❌ [DOCTOR NURSES] Error fetching nurses:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/doctor/assign-patient-to-nurse - Assign patient to nurse (Doctor access)
router.post('/assign-patient-to-nurse', authenticate, async (req, res) => {
  try {
    const { nurse_id, patient_id } = req.body;
    
    console.log('📋 [ASSIGN] Nurse-Patient assignment request');

    if (!nurse_id || !patient_id) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'nurse_id and patient_id are required'
      });
    }

    // Get all users and find the nurse
    const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.log('❌ [ASSIGN] Error listing users:', listError.message);
      return res.status(500).json({
        error: 'Failed to verify nurse',
        details: listError.message
      });
    }

    const nurse = allUsers.users.find(u => u.id === nurse_id);

    if (!nurse || nurse.user_metadata?.role !== 'nurse' || nurse.user_metadata?.account_status !== 'active') {
      console.log('❌ [ASSIGN] Nurse not found or not active');
      return res.status(404).json({
        error: 'Nurse not found or is not active'
      });
    }

    // Use the same allUsers list we already fetched
    const patient = allUsers.users.find(u => u.id === patient_id);

    if (!patient || patient.user_metadata?.role !== 'patient') {
      console.log('❌ [ASSIGN] Patient not found');
      return res.status(404).json({
        error: 'Patient not found'
      });
    }

    // Check for existing active assignment with THIS SPECIFIC NURSE
    const { data: existingActiveAssignment } = await supabase
      .from('nurse_patient_assignments')
      .select('id')
      .eq('nurse_id', nurse_id)
      .eq('patient_id', patient_id)
      .eq('status', 'active')
      .single();

    if (existingActiveAssignment) {
      console.log('⚠️ [ASSIGN] This nurse is already assigned to this patient');
      return res.status(409).json({
        error: 'This nurse is already assigned to this patient'
      });
    }

    // Check for existing inactive assignment (reactivate it)
    const { data: existingInactiveAssignment } = await supabase
      .from('nurse_patient_assignments')
      .select('id')
      .eq('nurse_id', nurse_id)
      .eq('patient_id', patient_id)
      .eq('status', 'inactive')
      .single();

    if (existingInactiveAssignment) {
      // Reactivate the existing assignment
      console.log('📝 [ASSIGN] Reactivating existing assignment...');
      const { data: assignment, error } = await supabase
        .from('nurse_patient_assignments')
        .update({
          status: 'active',
          assignment_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingInactiveAssignment.id)
        .select()
        .single();

      if (error) {
        console.error('❌ [ASSIGN] Reactivation error:', error.message);
        return res.status(400).json({
          error: 'Failed to reactivate assignment',
          details: error.message
        });
      }

      console.log('✅ [ASSIGN] Success - Assignment reactivated - Nurse:', nurse.user_metadata?.full_name);
      
      // Send notification to the nurse
      try {
        const patientName = patient.user_metadata?.full_name || 'Patient';
        const doctorName = req.user.fullName || 'Doctor';
        const message = `You have been assigned to care for ${patientName} by ${doctorName}`;
        
        console.log('📧 [ASSIGN] Attempting to create notification - Nurse:', nurse_id, 'Message:', message);
        
        const { data: notifData, error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: nurse_id,
            type: 'nurse_assignment',
            message: message,
            is_read: false
          })
          .select();
        
        if (notifError) {
          console.error('❌ [ASSIGN] Failed to send notification - Error details:', {
            message: notifError.message,
            code: notifError.code,
            hint: notifError.hint,
            details: notifError.details
          });
        } else {
          console.log('✅ [ASSIGN] Notification created successfully:', notifData);
        }
      } catch (notifError) {
        console.error('❌ [ASSIGN] Exception creating notification:', notifError.message);
      }
      
      res.status(201).json({
        data: assignment,
        message: 'Patient assigned to nurse successfully'
      });
      return;
    }

    // Create new assignment
    console.log('📝 [ASSIGN] Creating new assignment...');
    const { data: assignment, error } = await supabase
      .from('nurse_patient_assignments')
      .insert([{
        nurse_id,
        patient_id,
        assigned_by_doctor_id: req.user.userId,
        assignment_date: new Date().toISOString(),
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ [ASSIGN] Creation error:', error.message);
      return res.status(400).json({
        error: 'Failed to create assignment',
        details: error.message
      });
    }

    console.log('✅ [ASSIGN] Success - Nurse:', nurse.user_metadata?.full_name, 'Patient:', patient.user_metadata?.full_name);
    
    // Send notification to the nurse
    try {
      const patientName = patient.user_metadata?.full_name || 'Patient';
      const doctorName = req.user.fullName || 'Doctor';
      const message = `You have been assigned to care for ${patientName} by ${doctorName}`;
      
      console.log('📧 [ASSIGN] Attempting to create notification - Nurse:', nurse_id, 'Message:', message);
      
      const { data: notifData, error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: nurse_id,
          type: 'nurse_assignment',
          message: message,
          is_read: false
        })
        .select();
      
      if (notifError) {
        console.error('❌ [ASSIGN] Failed to send notification - Error details:', {
          message: notifError.message,
          code: notifError.code,
          hint: notifError.hint,
          details: notifError.details
        });
      } else {
        console.log('✅ [ASSIGN] Notification created successfully:', notifData);
      }
    } catch (notifError) {
      console.error('❌ [ASSIGN] Exception creating notification:', notifError.message);
    }
    
    res.status(201).json({
      data: assignment,
      message: 'Patient assigned to nurse successfully'
    });
  } catch (error) {
    console.error('❌ [ASSIGN] Error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/doctor/unassign-patient-from-nurse - Remove nurse from patient
router.delete('/unassign-patient-from-nurse', authenticate, async (req, res) => {
  try {
    const { nurse_id, patient_id } = req.body;
    
    console.log('🗑️ [UNASSIGN] Nurse-Patient unassignment request');
    console.log('   Nurse ID:', nurse_id);
    console.log('   Patient ID:', patient_id);

    if (!nurse_id || !patient_id) {
      console.log('❌ [UNASSIGN] Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'nurse_id and patient_id are required'
      });
    }

    // Find the active assignment
    const { data: existingAssignment, error: checkError } = await supabase
      .from('nurse_patient_assignments')
      .select('id, status')
      .eq('nurse_id', nurse_id)
      .eq('patient_id', patient_id)
      .eq('status', 'active')
      .single();

    console.log('   Existing assignment:', existingAssignment);
    console.log('   Check error:', checkError);

    if (checkError || !existingAssignment) {
      console.log('❌ [UNASSIGN] Assignment not found');
      return res.status(404).json({
        error: 'Assignment not found'
      });
    }

    // First, delete any old inactive records with same nurse_id and patient_id
    console.log('🧹 [UNASSIGN] Cleaning up old inactive records...');
    await supabase
      .from('nurse_patient_assignments')
      .delete()
      .eq('nurse_id', nurse_id)
      .eq('patient_id', patient_id)
      .eq('status', 'inactive');

    // Now update the active assignment to inactive
    const { data: assignment, error: updateError } = await supabase
      .from('nurse_patient_assignments')
      .update({ 
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', existingAssignment.id)
      .select()
      .single();

    if (updateError || !assignment) {
      console.log('❌ [UNASSIGN] Update error:', updateError);
      return res.status(404).json({
        error: 'Failed to unassign nurse'
      });
    }

    console.log('✅ [UNASSIGN] Success - Assignment marked as inactive');
    
    // Send notification to the nurse
    try {
      const { data: patientData } = await supabase
        .from('nurse_patient_assignments')
        .select('*')
        .eq('id', existingAssignment.id)
        .single();
      
      // Get patient and doctor names
      const { data: allUsers } = await supabase.auth.admin.listUsers();
      const patient = allUsers?.users?.find(u => u.id === patient_id);
      const patientName = patient?.user_metadata?.full_name || 'Patient';
      const doctorName = req.user.fullName || 'Doctor';
      const message = `Your assignment to care for ${patientName} has been terminated by ${doctorName}`;
      
      const { data: notifData, error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: nurse_id,
          type: 'nurse_unassignment',
          message: message,
          is_read: false
        })
        .select();
      
      if (notifError) {
        console.error('❌ Failed to send unassignment notification:', notifError);
      } else {
        console.log('✅ Unassignment notification created for nurse:', notifData);
      }
    } catch (notifError) {
      console.error('❌ Exception creating unassignment notification:', notifError.message);
    }
    
    res.json({
      message: 'Nurse unassigned from patient successfully'
    });
  } catch (error) {
    console.error('❌ [UNASSIGN] Error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/doctor/patient-nurses/:patientId - Get all nurses assigned to a patient
router.get('/patient-nurses/:patientId', authenticate, async (req, res) => {
  try {
    const { patientId } = req.params;

    // Get ONLY active assignments for this patient
    const { data: assignments, error: assignmentError } = await supabase
      .from('nurse_patient_assignments')
      .select('nurse_id, assignment_date, status')
      .eq('patient_id', patientId)
      .eq('status', 'active');  // Only active assignments

    if (assignmentError) {
      return res.status(400).json({
        error: 'Failed to fetch assignments',
        details: assignmentError.message
      });
    }

    if (!assignments || assignments.length === 0) {
      return res.json({
        data: {
          nurses: []
        },
        message: 'No nurses assigned to this patient'
      });
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

    res.json({
      data: {
        nurses: nurses
      },
      message: 'Nurses retrieved successfully'
    });
  } catch (error) {
    console.error('❌ [GET NURSES] Error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// OTHER DOCTOR ROUTES
// ============================================================================

// GET /api/doctor/notifications
router.get('/notifications', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, message, is_read, created_at')
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Notifications fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PATCH /api/doctor/notifications/read-all
router.patch('/notifications/read-all', authenticate, async (req, res) => {
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

// DELETE /api/doctor/notifications/:id
router.delete('/notifications/:id', authenticate, async (req, res) => {
  try {
    console.log('DELETE notification:', req.params.id, 'for user:', req.user.userId);
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

// POST /api/doctor/diagnoses - Save diagnosis for a patient
router.post('/diagnoses', authenticate, async (req, res) => {
  const { patient_id, diagnosis_text, related_id, related_type, image_url } = req.body;

  if (!patient_id || !diagnosis_text?.trim()) {
    return res.status(400).json({ error: 'Patient ID and diagnosis text are required' });
  }

  try {
    // Fetch doctor's specialty from doctors table
    const { data: doctorData, error: doctorError } = await supabase
      .from('doctors')
      .select('specialty')
      .eq('user_id', req.user.userId)
      .single();

    if (doctorError) {
      console.error('Error fetching doctor specialty:', doctorError);
    }

    const specialty = doctorData?.specialty || null;

    // Insert into doctor_reviews table
    const { data, error } = await supabase
      .from('doctor_reviews')
      .insert({
        doctor_id: req.user.userId,
        doctor_name: req.user.fullName,
        patient_id,
        diagnosis: diagnosis_text.trim(),
        specialty,
        status: 'Pending',
        related_id: related_id || null,
        related_type: related_type || null,
        image_url: image_url || null
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Save diagnosis error:', err);
    res.status(500).json({ error: 'Failed to save diagnosis' });
  }
});

// GET /api/doctor/diagnoses/:patientId - Get latest diagnosis for a patient
router.get('/diagnoses/:patientId', authenticate, async (req, res) => {
  const patientId = req.params.patientId;

  try {
    const { data, error } = await supabase
      .from('doctor_reviews')
      .select('id, diagnosis, created_at, status, doctor_name, specialty, related_id, related_type, image_url')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    res.json(data || null);
  } catch (err) {
    console.error('Fetch diagnosis error:', err);
    res.status(500).json({ error: 'Failed to fetch diagnosis' });
  }
});

// PUT /api/doctor/diagnoses/:diagnosisId - Update diagnosis
router.put('/diagnoses/:diagnosisId', authenticate, async (req, res) => {
  const diagnosisId = req.params.diagnosisId;
  const { diagnosis, status, related_id, related_type, image_url } = req.body;

  // Build update object with only provided fields
  const updateData = {};
  
  if (diagnosis !== undefined && diagnosis?.trim()) {
    updateData.diagnosis = diagnosis.trim();
  }
  if (status !== undefined) {
    updateData.status = status;
  }
  if (related_id !== undefined) {
    updateData.related_id = related_id;
  }
  if (related_type !== undefined) {
    updateData.related_type = related_type;
  }
  if (image_url !== undefined) {
    updateData.image_url = image_url;
  }

  try {
    const { data, error } = await supabase
      .from('doctor_reviews')
      .update(updateData)
      .eq('id', diagnosisId)
      .eq('doctor_id', req.user.userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Diagnosis not found or you do not have permission to update it' });
      }
      throw error;
    }
    res.json(data);
  } catch (err) {
    console.error('Update diagnosis error:', err);
    res.status(500).json({ error: 'Failed to update diagnosis' });
  }
});

// GET /api/doctor/treatment-plan/:patientId - Get treatment plan for a patient
router.get('/treatment-plan/:patientId', authenticate, async (req, res) => {
  const patientId = req.params.patientId;
  try {
    const { data, error } = await supabase
      .from('treatment_plan')
      .select('id, medication_name, dosage, frequency, meal_timing, start_date, end_date, notes, status, created_at, updated_at')
      .eq('patient_id', patientId)
      .eq('status', 'Active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Get treatment plan error:', err);
    res.status(500).json({ error: 'Failed to fetch treatment plan' });
  }
});

// POST /api/doctor/treatment-plan - Add treatment plan item for a patient
router.post('/treatment-plan', authenticate, async (req, res) => {
  const { patient_id, medication_name, dosage, frequency, meal_timing, start_date, end_date, notes } = req.body;
  if (!patient_id || !medication_name || !frequency) {
    return res.status(400).json({ error: 'patient_id, medication_name, and frequency are required' });
  }
  try {
    const { data, error } = await supabase
      .from('treatment_plan')
      .insert({
        doctor_id: req.user.userId,
        patient_id,
        medication_name,
        dosage: dosage || null,
        frequency: frequency || '1x daily',
        meal_timing: meal_timing || 'After meal',
        start_date: start_date || new Date().toISOString(),
        end_date: end_date || null,
        notes: notes || null,
        status: 'Active'
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Add treatment plan error:', err);
    res.status(500).json({ error: 'Failed to add treatment plan', details: err.message });
  }
});

// PUT /api/doctor/treatment-plan/:treatmentId - Update treatment plan item
router.put('/treatment-plan/:treatmentId', authenticate, async (req, res) => {
  const treatmentId = req.params.treatmentId;
  const { medication_name, dosage, frequency, meal_timing, start_date, end_date, notes, status } = req.body;

  try {
    const updateData = {};
    if (medication_name !== undefined) updateData.medication_name = medication_name;
    if (dosage !== undefined) updateData.dosage = dosage;
    if (frequency !== undefined) updateData.frequency = frequency;
    if (meal_timing !== undefined) updateData.meal_timing = meal_timing;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('treatment_plan')
      .update(updateData)
      .eq('id', treatmentId)
      .eq('doctor_id', req.user.userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Treatment plan not found or you do not have permission to update it' });
      }
      throw error;
    }
    res.json(data);
  } catch (err) {
    console.error('Update treatment plan error:', err);
    res.status(500).json({ error: 'Failed to update treatment plan', details: err.message });
  }
});

// DELETE /api/doctor/treatment-plan/:treatmentId - Delete treatment plan item
router.delete('/treatment-plan/:treatmentId', authenticate, async (req, res) => {
  const treatmentId = req.params.treatmentId;
  try {
    const { error } = await supabase
      .from('treatment_plan')
      .delete()
      .eq('id', treatmentId)
      .eq('doctor_id', req.user.userId);

    if (error) throw error;
    res.json({ message: 'Treatment plan deleted' });
  } catch (err) {
    console.error('Delete treatment plan error:', err);
    res.status(500).json({ error: 'Failed to delete treatment plan' });
  }
});

// GET /api/doctor/dashboard
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const doctorId = req.user.userId;

    // Get today's date in UTC
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    
    const todayDateStr = `${year}-${month}-${day}`;
    const todayStart = new Date(`${todayDateStr}T00:00:00Z`);
    const todayEnd = new Date(`${todayDateStr}T23:59:59Z`);

    // Total unique patients + active cases
    const { data: allApts, error: allAptsError } = await supabase
      .from('appointments')
      .select('patient_id, status, appointment_time, id')
      .eq('doctor_id', doctorId);

    if (allAptsError) console.error('allApts error:', allAptsError);

    const uniquePatients = new Set((allApts || []).map(a => a.patient_id));
    const totalPatients = uniquePatients.size;

    const activeCases = (allApts || []).filter(a =>
      ['confirmed', 'pending'].includes(a.status?.toLowerCase())
    );
    const uniqueActiveCases = new Set(activeCases.map(a => a.patient_id)).size;

    // Today's appointments
    const { data: todayApts, error: todayError } = await supabase
      .from('appointments')
      .select('id, status, appointment_time')
      .eq('doctor_id', doctorId)
      .gte('appointment_time', todayStart.toISOString())
      .lte('appointment_time', todayEnd.toISOString());

    if (todayError) console.error('todayApts error:', todayError);

    const todayTotal = (todayApts || []).length;
    const todayCompleted = (todayApts || []).filter(a => a.status?.toLowerCase() === 'completed').length;
    const todayUpcoming = todayTotal - todayCompleted;

    // Count pending appointments (not just today, but all pending)
    const pendingApts = (allApts || []).filter(a => a.status?.toLowerCase() === 'pending');

    // Recent activities — from yesterday onwards (1 day back + all future)
    const yesterdayDate = new Date();
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
    const yesterdayYear = yesterdayDate.getUTCFullYear();
    const yesterdayMonth = String(yesterdayDate.getUTCMonth() + 1).padStart(2, '0');
    const yesterdayDay = String(yesterdayDate.getUTCDate()).padStart(2, '0');
    
    const yesterday = new Date(`${yesterdayYear}-${yesterdayMonth}-${yesterdayDay}T00:00:00Z`);

    const { data: recentData, error: recentError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_time,
        status,
        patient:patient_id (full_name)
      `)
      .eq('doctor_id', doctorId)
      .gte('appointment_time', yesterday.toISOString())
      .order('appointment_time', { ascending: true });

    if (recentError) console.error('recentData error:', recentError);

    const recentActivities = (recentData || []).map(apt => ({
      id: apt.id,
      patient: apt.patient?.full_name || 'Unknown',
      lastUpdate: new Date(apt.appointment_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: apt.status
    }));

    res.json({
      totalPatients,
      todayAppointments: { total: todayTotal, completed: todayCompleted, upcoming: todayUpcoming },
      activeCases: uniqueActiveCases,
      pendingAppointments: pendingApts.length,
      recentActivities
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET /profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const { data: doctor, error } = await supabase
      .from('doctors')
      .select(`*, email:users(email)`)
      .eq('user_id', req.user.userId)
      .single();

    if (error || !doctor) return res.status(404).json({ error: 'Profile not found' });

    const { data: certs } = await supabase
      .from('certificates')
      .select(`
        id,
        name,
        issue_date,
        file
      `)
      .eq('doctor_id', req.user.userId);

    // Format certificates to match frontend expectations
    const formattedCerts = (certs || []).map(cert => ({
      id: cert.id,
      name: cert.name,
      issue_date: cert.issue_date,
      file: cert.file
    }));

    res.json({
      ...doctor,
      certificates: formattedCerts
    });
  } catch (err) {
    console.error('Doctor profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /profile (with file upload)
router.put('/profile', authenticate, profileUpload.single('profilePicture'), async (req, res) => {
  try {
    const updates = {
      full_name: req.body.fullName,
      phone_number: req.body.phone,
      gender: req.body.gender,
      date_of_birth: req.body.dateOfBirth,
      specialty: req.body.specialization,
      years_of_experience: req.body.yearsOfExperience,
      clinic_name: req.body.clinicName,
      biography: req.body.biography
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

    console.log('Updating doctor with:', updates);

    const { error } = await supabase
      .from('doctors')
      .update(updates)
      .eq('user_id', req.user.userId);

    if (error) {
      console.error('Database update error:', error);
      throw error;
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

    res.json({ message: 'Profile updated', profilePicture: updates.profile_picture });
  } catch (err) {
    console.error('Doctor update error:', err);
    res.status(500).json({ error: 'Update failed', details: err.message });
  }
});

// Appointments GET
router.get('/appointments', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_time,
        status,
        appointment_type,
        patient:patient_id (full_name)
      `)
      .eq('doctor_id', req.user.userId)
      .order('appointment_time');

    if (error) throw error;

    // Format the response to match frontend expectation and remove duplicates
    const uniqueAppointmentsMap = new Map();
    (data || []).forEach(item => {
      const appointmentId = item.id;
      // Only add if not already in map (keeps first occurrence)
      if (!uniqueAppointmentsMap.has(appointmentId)) {
        uniqueAppointmentsMap.set(appointmentId, {
          id: appointmentId,
          patient: item.patient?.full_name || 'Unknown Patient',
          date: new Date(item.appointment_time).toISOString().split('T')[0],
          time: new Date(item.appointment_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          status: item.status,
          type: item.appointment_type || 'Consultation'
        });
      }
    });

    const formatted = Array.from(uniqueAppointmentsMap.values());
    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// PUT /api/doctor/appointments/:id - Update appointment status
router.put('/appointments/:id', authenticate, async (req, res) => {
  const appointmentId = req.params.id;
  const { status } = req.body;

  console.log('PUT /appointments/:id called with:', { appointmentId, status, doctorId: req.user.userId });

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!validStatuses.includes(status.toLowerCase())) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    // First verify the appointment belongs to this doctor
    const { data: appointmentCheck, error: checkError } = await supabase
      .from('appointments')
      .select('id, doctor_id')
      .eq('id', appointmentId)
      .single();

    console.log('Appointment check:', { appointmentCheck, checkError });

    if (checkError || !appointmentCheck) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (appointmentCheck.doctor_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to update this appointment' });
    }

    // Update the appointment status
    const { data, error } = await supabase
      .from('appointments')
      .update({ status: status.toLowerCase() })
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      throw error;
    }

    console.log('Update successful:', data);

    // Notify patient if appointment is confirmed
    if (status.toLowerCase() === 'confirmed') {
      try {
        const aptDate = new Date(data.appointment_time).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        await supabase.from('notifications').insert({
          user_id: data.patient_id,
          type: 'appointment_confirmed',
          message: `Your appointment with ${req.user.fullName} has been confirmed for ${aptDate}`
        });
      } catch (notificationError) {
        console.warn('Failed to send confirmation notification:', notificationError);
        // Don't fail the appointment update if notification fails
      }
    }

    res.json({ message: 'Appointment status updated', data });
  } catch (err) {
    console.error('Update appointment error:', err);
    res.status(500).json({ error: 'Failed to update appointment', details: err.message });
  }
});

// DELETE /api/doctor/appointments/:id - Delete appointment
router.delete('/appointments/:id', authenticate, async (req, res) => {
  const appointmentId = req.params.id;

  console.log('DELETE /appointments/:id called with:', { appointmentId, doctorId: req.user.userId });

  try {
    // First verify the appointment belongs to this doctor
    const { data: appointmentCheck, error: checkError } = await supabase
      .from('appointments')
      .select('id, doctor_id')
      .eq('id', appointmentId)
      .single();

    console.log('Appointment check:', { appointmentCheck, checkError });

    if (checkError || !appointmentCheck) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (appointmentCheck.doctor_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this appointment' });
    }

    // Delete the appointment
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', appointmentId);

    if (error) {
      console.error('Delete error:', error);
      throw error;
    }

    console.log('Delete successful');
    res.json({ message: 'Appointment deleted successfully' });
  } catch (err) {
    console.error('Delete appointment error:', err);
    res.status(500).json({ error: 'Failed to delete appointment', details: err.message });
  }
});

// POST /api/doctor/certificates - Upload new certificate
router.post(
  "/certificates",
  authenticate,
  certificateUpload.single("certificate"),
  async (req, res) => {
    console.log("=== CERTIFICATE UPLOAD STARTED ===");
    console.log("User:", req.user);
    console.log("Body:", req.body);
    console.log("File:", req.file ? req.file.originalname : "NO FILE");

    if (!req.file) {
      console.log("No file received");
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { name, issue_date } = req.body;
    if (!name) {
      console.log("Missing name");
      return res.status(400).json({ error: "Certificate name is required" });
    }

    try {
      // Upload to Supabase Storage
      const file = req.file;
      const fileExt = file.originalname.split('.').pop();
      const fileName = `cert-${req.user.userId}-${Date.now()}.${fileExt}`;
      const filePath = `certificates/${fileName}`;

      console.log(`[CERTIFICATE] Attempting to upload to 'certificates' bucket`);
      console.log(`[CERTIFICATE] File path: ${filePath}`);
      console.log(`[CERTIFICATE] File size: ${file.size} bytes`);
      console.log(`[CERTIFICATE] File type: ${file.mimetype}`);

      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });
      
      if (uploadError) {
        console.error('[CERTIFICATE] ❌ Storage upload error:', uploadError);
        throw uploadError;
      }
      
      console.log('[CERTIFICATE] ✅ File uploaded successfully to storage');
      
      const { data: { publicUrl } } = supabase.storage
        .from('certificates')
        .getPublicUrl(filePath);

      console.log("[CERTIFICATE] Certificate uploaded to:", publicUrl);

      // Insert certificate record
      console.log(`[CERTIFICATE] Inserting record into certificates table for doctor: ${req.user.userId}`);
      const { data, error } = await supabase
        .from("certificates")
        .insert({
          doctor_id: req.user.userId,
          name: name,
          issue_date: issue_date || null,
          file: publicUrl,
        })
        .select(`
          id, name, issue_date, file
        `)
        .single();

      if (error) {
        console.error("[CERTIFICATE] ❌ Supabase insert error:", error);
        throw error;
      }

      console.log("[CERTIFICATE] ✅ Certificate record inserted successfully");

      // Format response to match frontend expectations
      const formattedData = {
        id: data.id,
        name: data.name,
        issue_date: data.issue_date,
        file: data.file
      };

      console.log("[CERTIFICATE] ✅ Upload complete:", formattedData);
      res.status(201).json(formattedData);
    } catch (err) {
      console.error("[CERTIFICATE] ❌ CERTIFICATE UPLOAD ERROR:", err);
      res.status(500).json({ 
        error: "Upload failed", 
        details: err.message,
        code: err.code,
        hint: err.hint
      });
    }
  }
);

router.delete("/certificates/:id", authenticate, async (req, res) => {
  const certificateId = req.params.id;

  try {
    const { data, error } = await supabase
      .from("certificates")
      .delete()
      .eq("id", certificateId)
      .eq("doctor_id", req.user.userId)
      .select("id")
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Certificate not found or not owned" });
    }

    res.json({ message: "Certificate deleted" });
  } catch (err) {
    console.error("Delete certificate error:", err.message);
    res.status(500).json({ error: "Delete failed" });
  }
});

router.post("/change-password", authenticate, async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters" });
  }

  try {
    // Get the token from the request header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: "No authentication token" });
    }

    // Use the admin API to update the user's password
    const { data, error } = await supabase.auth.admin.updateUserById(
      req.user.userId,
      { password: newPassword }
    );

    if (error) {
      console.error("Supabase password update error:", error);
      throw error;
    }

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err.message, err);
    res.status(500).json({ error: "Failed to change password", details: err.message });
  }
});

// GET /api/doctor/patients 
router.get('/patients', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        patient_id,
        patients!inner (
          user_id,
          full_name,
          age,
          gender,
          blood_type,
          address
        )
      `)
      .eq('doctor_id', req.user.userId)
      .order('full_name', {foreignTable: 'patients'});

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    // Format response to match frontend and remove duplicates
    const uniquePatientsMap = new Map();
    (data || []).forEach(item => {
      const patientId = item.patients.user_id;
      // Only add if not already in map (keeps first occurrence)
      if (!uniquePatientsMap.has(patientId)) {
        uniquePatientsMap.set(patientId, {
          id: patientId,
          name: item.patients.full_name || 'Unknown',
          age: item.patients.age,
          gender: item.patients.gender || 'N/A',
          status: 'Active' 
        });
      }
    });

    const formatted = Array.from(uniquePatientsMap.values());

    res.status(200).json(formatted);
  } catch (err) {
    console.error('PATIENTS ROUTE ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch patients', details: err.message});
  }
});

// POST /api/doctor/patients - Add new patient
router.post('/patients', authenticate, async (req, res) => {
  try {
    const { full_name, age, phone, gender, email } = req.body;

    // Validation
    if (!full_name || !age || !phone || !gender) {
      return res.status(400).json({ 
        error: 'Missing required fields: full_name, age, phone, gender' 
      });
    }

    // Create user account for the patient (optional - if you want them to have login)
    // For now, we'll just create a patient record without user account
    
    // Insert patient into database
    const { data: newPatient, error } = await supabase
      .from('patients')
      .insert({
        full_name,
        age: parseInt(age),
        phone,
        gender,
        email: email || null,
        // You might want to link to a user_id if creating user account
        // user_id: userId
      })
      .select()
      .single();

    if (error) {
      console.error('Insert patient error:', error);
      throw error;
    }

    // Format response to match frontend expectation
    const formatted = {
      id: newPatient.user_id || newPatient.id,
      name: newPatient.full_name,
      age: newPatient.age,
      gender: newPatient.gender,
      status: 'Active'
    };

    res.status(201).json(formatted);
  } catch (err) {
    console.error('ADD PATIENT ERROR:', err);
    res.status(500).json({ error: 'Failed to add patient', details: err.message });
  }
});

// GET /api/doctor/patients/:id 
router.get('/patients/:id', authenticate, async (req, res) => {
  const patientId = req.params.id;

  try {
    // 1. Fetch patient data
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('user_id, full_name, age, gender, blood_type, address, email, phone_number')
      .eq('user_id', patientId)
      .single();

    if (patientError || !patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // 2. Fetch ALL appointments for this patient with this doctor
    const { data: appointmentsData, error: aptsError } = await supabase
      .from('appointments')
      .select('appointment_time, status')
      .eq('doctor_id', req.user.userId)
      .eq('patient_id', patientId)
      .order('appointment_time', { ascending: false });

    // 3. Filter for past appointments in JavaScript
    const now = new Date();
    const pastAppointments = (appointmentsData || []).filter(apt => 
      new Date(apt.appointment_time) < now
    );

    // 4. Get the most recent past appointment
    const lastVisit = pastAppointments.length > 0 
      ? new Date(pastAppointments[0].appointment_time).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : 'No past visits';

    res.json({
      id: patient.user_id,
      name: patient.full_name,
      age: patient.age,
      gender: patient.gender || 'N/A',
      email: patient.email || 'N/A',
      phone: patient.phone_number || 'N/A',
      bloodType: patient.blood_type || 'N/A',
      allergies: 'N/A',
      lastVisit,
      symptoms: [],
      medicalHistory: [],
      aiAnalysis: { probability: 'N/A', conditions: [], recommendation: 'N/A' },
      diagnosis: 'N/A',
      treatmentPlan: 'N/A'
    });
  } catch (err) {
    console.error('Patient case error:', err.message, err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// GET /api/doctor/chats - جلب قايمة المحادثات (المرضى اللي كلموهم الدكتور)
router.get('/chats', authenticate, async (req, res) => {
  try {
    const { data: lastMessages, error: msgError} = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        receiver_id,
        message_text,
        sent_at,
        is_read
      `)
      .eq('receiver_id', req.user.userId)
      .order('sent_at', { ascending: false });

    if (msgError) throw msgError;

    const patientIds = [...new Set(lastMessages.map(msg => msg.sender_id))];
    if (patientIds.length === 0){
      return res.json([]);
    }

    const { data: patients, error: patError } = await supabase
      .from('patients')
      .select(`
        user_id,
        full_name,
        profile_picture
      `)
      .in('user_id', patientIds);
    
    if (patError) throw patError;

    const chats = patientIds.map(patientId => {
      const lastMsg = lastMessages.find(msg => msg.sender_id === patientId);
      const patient = patients.find(p => p.user_id === patientId) || {};
      
      // Count all unread messages from this patient
      const unreadCount = lastMessages.filter(msg => 
        msg.sender_id === patientId && !msg.is_read
      ).length;

      return {
        id: patientId,
        name: patient.full_name || 'Unknown Patient',
        avatar: patient.full_name ? patient.full_name.charAt(0).toUpperCase() : 'P',
        profilePicture: patient.profile_picture || null,
        lastMessage: lastMsg?.message_text || '',
        time: lastMsg ? new Date(lastMsg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        unread: unreadCount
      };
    });

    res.json(chats);
  } catch (err) {
    console.error('Chats fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch chats', details: err.message });
  }
});

// GET /api/doctor/chats/:patientId
router.get('/chats/:patientId', authenticate, async (req, res) => {
  const patientId = req.params.patientId;

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
      .or(`and(sender_id.eq.${req.user.userId},receiver_id.eq.${patientId}),and(sender_id.eq.${patientId},receiver_id.eq.${req.user.userId})`)
      .order('sent_at', { ascending: true });

    if (error) throw error;

    // Mark as read (اختياري)
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', req.user.userId)
      .eq('sender_id', patientId)
      .is('is_read', false);

    res.json(data || []);
  } catch (err) {
    console.error('Chat messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/doctor/chats/:patientId 
router.post('/chats/:patientId', authenticate, messageUpload.single('attachment'), async (req, res) => {
  const patientId = req.params.patientId;
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

    // Insert message into database
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: req.user.userId,
        receiver_id: patientId,
        message_text: message_text?.trim() || '',
        file_path: filePath,
        file_type: fileType,
        file_name: fileName,
      })
      .select()
      .single();

    if (error) throw error;

    // Notify the patient about new message
    await supabase.from('notifications').insert({
      user_id: patientId,
      type: 'new_message',
      message: `New message from ${req.user.fullName}`
    });

    res.status(201).json(data);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message', details: err.message });
  }
});

// GET /api/doctor/availability
// Fetch authenticated doctor's availability slots
router.get('/availability', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('doctor_availability')
      .select('id, day_of_week, start_time, end_time, is_available, created_at')
      .eq('doctor_id', req.user.userId)
      .order('day_of_week', { ascending: true });

    if (error) {
      console.error('Error fetching availability:', error);
      throw error;
    }

    res.json(data || []);
  } catch (err) {
    console.error('Fetch availability error:', err);
    res.status(500).json({ error: 'Failed to fetch availability', details: err.message });
  }
});

// GET /api/stats - Get platform statistics (doctors and patients count) - PUBLIC
router.get('/stats', async (req, res) => {
  try {
    // Get count of doctors from doctors table
    const { count: doctorCount, error: docErr } = await supabase
      .from('doctors')
      .select('*', { count: 'exact', head: true });

    // Get count of patients from patients table
    const { count: patientCount, error: patErr } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });

    const finalDoctorCount = doctorCount || 0;
    const finalPatientCount = patientCount || 0;

    res.json({
      doctors: finalDoctorCount,
      patients: finalPatientCount
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch statistics'
    });
  }
});

// GET /api/doctor/search - Search and filter doctors (for patients) - PUBLIC
router.get('/search', async (req, res) => {
  try {
    let query = supabase.from('doctors').select('user_id, full_name, specialty, years_of_experience, rating, rating_count, is_available, price, profile_picture');

    // Filter by name (partial match)
    if (req.query.name) {
      query = query.ilike('full_name', `%${req.query.name}%`);
    }

    // Filter by specialization (case-insensitive match)
    if (req.query.specialization) {
      console.log('Filtering by specialization:', req.query.specialization);
      query = query.ilike('specialty', `%${req.query.specialization}%`);
    }

    // Filter by rating (minimum rating)
    if (req.query.rating) {
      const minRating = parseFloat(req.query.rating);
      query = query.gte('rating', minRating);
    }

    // Default ordering: highest rating first
    query = query.order('rating', { ascending: false, nullsFirst: false });

    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    // Get availability for each doctor
    const formatted = await Promise.all((data || []).map(async (doc) => {
      // Fetch availability slots for this doctor
      const { data: availabilityData } = await supabase
        .from('doctor_availability')
        .select('day_of_week')
        .eq('doctor_id', doc.user_id);

      // Extract unique days and format them
      const availableDays = availabilityData 
        ? [...new Set(availabilityData.map(a => a.day_of_week))].sort()
        : [];

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const availabilityText = availableDays.length > 0 
        ? availableDays.map(day => dayNames[parseInt(day)] || day).join(', ')
        : 'Not Available';

      return {
        id: doc.user_id,
        name: doc.full_name,
        specialization: doc.specialty,
        experience: doc.years_of_experience ? `${doc.years_of_experience} years` : 'N/A',
        rating: doc.rating || 0,
        availability: availabilityText,
        profilePicture: doc.profile_picture || null
      };
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Doctor search error:', err);
    res.status(500).json({ error: 'Failed to search doctors', details: err.message });
  }
});

// GET /api/doctor - Get all doctors (for patients to browse) - PUBLIC
router.get('/', async (req, res) => {
  try {
    const { data: doctors, error } = await supabase
      .from('doctors')
      .select('user_id, full_name, specialty, years_of_experience, clinic_name, biography, profile_picture')
      .order('full_name');

    if (error) throw error;

    const formatted = doctors.map(doc => ({
      id: doc.user_id,
      name: doc.full_name,
      specialization: doc.specialty,
      yearsOfExperience: doc.years_of_experience,
      clinicName: doc.clinic_name,
      bio: doc.biography,
      profilePicture: doc.profile_picture,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Get doctors error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/doctor/:id/availability - Get doctor's availability slots (for patients) - PUBLIC
router.get('/:id/availability', async (req, res) => {
  try {
    const doctorId = req.params.id;
    console.log('Fetching availability for doctor:', doctorId);

    const { data, error } = await supabase
      .from('doctor_availability')
      .select('id, day_of_week, start_time, end_time, is_available')
      .eq('doctor_id', doctorId)
      .eq('is_available', true)
      .order('day_of_week', { ascending: true });

    if (error) {
      console.error('Error fetching doctor availability:', error);
      throw error;
    }

    console.log('Availability data found:', data?.length || 0, 'slots');
    res.json(data || []);
  } catch (err) {
    console.error('Fetch doctor availability error:', err);
    res.status(500).json({ error: 'Failed to fetch availability', details: err.message });
  }
});

// GET /api/doctor/:id - Get doctor profile by ID (for patients to view) - PUBLIC
router.get('/:id', async (req, res) => {
  try {
    const doctorId = req.params.id;

    const { data: doctor, error } = await supabase
      .from('doctors')
      .select('user_id, full_name, specialty, years_of_experience, clinic_name, biography, profile_picture, license_file_path')
      .eq('user_id', doctorId)
      .single();

    if (error || !doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Get certificates
    const { data: certs } = await supabase
      .from('certificates')
      .select(`
        id,
        name,
        issue_date,
        file
      `)
      .eq('doctor_id', doctorId);

    res.json({
      id: doctor.user_id,
      name: doctor.full_name,
      specialization: doctor.specialty,
      yearsOfExperience: doctor.years_of_experience,
      clinicName: doctor.clinic_name,
      bio: doctor.biography,
      profilePicture: doctor.profile_picture,
      licenseFilePath: doctor.license_file_path,
      certificates: certs || [],
      education: [], // Can be added to database later
    });
  } catch (err) {
    console.error('Get doctor error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get("/download-certificate/:id", authenticate, async (req, res) => {
  const certificateId = req.params.id;

  try {
    // Verify the certificate belongs to this doctor
    const { data: cert, error } = await supabase
      .from("certificates")
      .select("file, name")
      .eq("id", certificateId)
      .eq("doctor_id", req.user.userId)
      .single();

    if (error || !cert) {
      return res.status(404).json({ error: "Certificate not found or access denied" });
    }

    // Redirect to the Supabase public URL
    res.redirect(cert.file);
  } catch (err) {
    console.error("Download certificate error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// ============ X-RAY IMAGE AND DIAGNOSIS ENDPOINTS ============

/**
 * Validation helper for diagnosis text
 * Returns error message if invalid, null if valid
 */
function validateDiagnosisText(text) {
  if (!text || typeof text !== 'string') {
    return 'Diagnosis text is required';
  }
  
  const trimmed = text.trim();
  
  if (trimmed.length === 0) {
    return 'Diagnosis cannot be empty';
  }
  
  if (trimmed.length < 10) {
    return 'Diagnosis must be at least 10 characters';
  }
  
  if (trimmed.length > 5000) {
    return 'Diagnosis cannot exceed 5000 characters';
  }
  
  return null;
}

// GET /api/doctor/xray-images/:patientId
// Retrieve all X-Ray images for a patient with AI diagnoses and doctor diagnoses
router.get('/xray-images/:patientId', authenticate, async (req, res) => {
  const patientId = req.params.patientId;

  try {
    // Fetch all X-Ray images for the patient
    const { data: xrayImages, error: xrayError } = await supabase
      .from('xray_history')
      .select('id, image_url, diagnosis, created_at')
      .eq('user_id', patientId)
      .order('created_at', { ascending: false });

    if (xrayError) {
      console.error('Error fetching X-Ray images:', xrayError);
      throw xrayError;
    }

    // For each image, fetch any existing doctor diagnoses
    const imagesWithDiagnoses = await Promise.all(
      (xrayImages || []).map(async (image) => {
        const { data: doctorDiagnoses, error: diagError } = await supabase
          .from('doctor_reviews')
          .select('id, diagnosis, created_at')
          .eq('related_id', image.id)
          .eq('related_type', 'xray')
          .order('created_at', { ascending: false });

        if (diagError) {
          console.error('Error fetching doctor diagnoses for image:', diagError);
        }

        return {
          ...image,
          doctorDiagnoses: doctorDiagnoses || []
        };
      })
    );

    res.json(imagesWithDiagnoses);
  } catch (err) {
    console.error('Fetch X-Ray images error:', err);
    res.status(500).json({ error: 'Failed to fetch X-Ray images', details: err.message });
  }
});

// POST /api/doctor/xray-diagnosis
// Add final diagnosis for a single X-Ray image
router.post('/xray-diagnosis', authenticate, async (req, res) => {
  const { xray_image_id, diagnosis_text } = req.body;

  // Validate input
  if (!xray_image_id) {
    return res.status(400).json({ error: 'xray_image_id is required' });
  }

  const validationError = validateDiagnosisText(diagnosis_text);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    // Verify the X-Ray image exists and get patient_id
    const { data: xrayImage, error: xrayError } = await supabase
      .from('xray_history')
      .select('id, user_id')
      .eq('id', xray_image_id)
      .single();

    if (xrayError || !xrayImage) {
      return res.status(404).json({ error: 'X-Ray image not found' });
    }

    // Get doctor's specialty
    const { data: doctorData, error: doctorError } = await supabase
      .from('doctors')
      .select('specialty')
      .eq('user_id', req.user.userId)
      .single();

    if (doctorError) {
      console.error('Error fetching doctor specialty:', doctorError);
    }

    const specialty = doctorData?.specialty || 'General';

    // Insert diagnosis into doctor_reviews table
    const { data, error } = await supabase
      .from('doctor_reviews')
      .insert({
        doctor_id: req.user.userId,
        doctor_name: req.user.fullName,
        specialty: specialty,
        patient_id: xrayImage.user_id,
        related_id: xray_image_id,
        related_type: 'xray',
        diagnosis: diagnosis_text.trim(),
        status: 'Pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting diagnosis:', error);
      throw error;
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Add diagnosis error:', err);
    res.status(500).json({ error: 'Failed to add diagnosis', details: err.message });
  }
});

// POST /api/doctor/xray-diagnosis/bulk
// Add same diagnosis for multiple X-Ray images
router.post('/xray-diagnosis/bulk', authenticate, async (req, res) => {
  const { xray_image_ids, diagnosis_text } = req.body;

  // Validate input
  if (!Array.isArray(xray_image_ids) || xray_image_ids.length === 0) {
    return res.status(400).json({ error: 'xray_image_ids must be a non-empty array' });
  }

  const validationError = validateDiagnosisText(diagnosis_text);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    // Verify all X-Ray images exist and get their user_ids
    const { data: xrayImages, error: xrayError } = await supabase
      .from('xray_history')
      .select('id, user_id')
      .in('id', xray_image_ids);

    if (xrayError) {
      console.error('Error verifying X-Ray images:', xrayError);
      throw xrayError;
    }

    if (!xrayImages || xrayImages.length !== xray_image_ids.length) {
      return res.status(404).json({ error: 'One or more X-Ray images not found' });
    }

    // Get doctor's specialty
    const { data: doctorData, error: doctorError } = await supabase
      .from('doctors')
      .select('specialty')
      .eq('user_id', req.user.userId)
      .single();

    if (doctorError) {
      console.error('Error fetching doctor specialty:', doctorError);
    }

    const specialty = doctorData?.specialty || 'General';

    // Create diagnosis records for each image
    const diagnosisRecords = xrayImages.map(image => ({
      doctor_id: req.user.userId,
      doctor_name: req.user.fullName,
      specialty: specialty,
      patient_id: image.user_id,
      related_id: image.id,
      related_type: 'xray',
      diagnosis: diagnosis_text.trim(),
      status: 'Pending'
    }));

    const { data, error } = await supabase
      .from('doctor_reviews')
      .insert(diagnosisRecords)
      .select();

    if (error) {
      console.error('Error inserting bulk diagnoses:', error);
      throw error;
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Bulk diagnosis error:', err);
    res.status(500).json({ error: 'Failed to add bulk diagnoses', details: err.message });
  }
});

// PUT /api/doctor/xray-diagnosis/:diagnosisId
// Update existing diagnosis
router.put('/xray-diagnosis/:diagnosisId', authenticate, async (req, res) => {
  const diagnosisId = req.params.diagnosisId;
  const { diagnosis_text } = req.body;

  // Validate input
  const validationError = validateDiagnosisText(diagnosis_text);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    // Verify the diagnosis exists and belongs to the authenticated doctor
    const { data: existingDiagnosis, error: checkError } = await supabase
      .from('doctor_reviews')
      .select('id, doctor_id')
      .eq('id', diagnosisId)
      .single();

    if (checkError || !existingDiagnosis) {
      return res.status(404).json({ error: 'Diagnosis not found' });
    }

    if (existingDiagnosis.doctor_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to update this diagnosis' });
    }

    // Update the diagnosis
    const { data, error } = await supabase
      .from('doctor_reviews')
      .update({
        diagnosis: diagnosis_text.trim()
      })
      .eq('id', diagnosisId)
      .select()
      .single();

    if (error) {
      console.error('Error updating diagnosis:', error);
      throw error;
    }

    res.json(data);
  } catch (err) {
    console.error('Update diagnosis error:', err);
    res.status(500).json({ error: 'Failed to update diagnosis', details: err.message });
  }
});

// GET /api/doctor/patient-lab-history/:patientId - Get lab history for a patient
router.get('/patient-lab-history/:patientId', authenticate, async (req, res) => {
  try {
    const { patientId } = req.params;

    const { data, error } = await supabase
      .from('lab_history')
      .select('id, diagnosis, image_url, created_at')
      .eq('user_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Lab history fetch error:', error);
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
                }
              }
            } else {
              // It's just a file path
              const { data: signedData, error: signError } = await supabase.storage
                .from('lab-results')
                .createSignedUrl(imageUrl, 3600); // 1 hour expiry
              
              if (!signError && signedData?.signedUrl) {
                imageUrl = signedData.signedUrl;
              }
            }
          }
        } catch (err) {
          console.warn('Error processing image URL:', err.message);
        }
        
        return {
          ...report,
          image_url: imageUrl
        };
      })
    );

    res.json(processedReports);
  } catch (err) {
    console.error('Lab history error:', err);
    res.status(500).json({ error: 'Failed to fetch lab history' });
  }
});

module.exports = router;
