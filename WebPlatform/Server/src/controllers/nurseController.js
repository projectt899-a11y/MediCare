/**
 * Nurse Controller
 * Handles all nurse-related operations
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================================
// NURSE MANAGEMENT
// ============================================================================

/**
 * Create a new nurse account
 * POST /api/nurses
 */
exports.createNurse = async (req, res) => {
  try {
    const { full_name, phone_number, gender, email, password } = req.body;

    // Validation
    if (!full_name || !phone_number || !gender || !email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'full_name, phone_number, gender, email, and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long'
      });
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({
        error: 'Password must contain uppercase, lowercase, and numbers'
      });
    }

    // Check if email already exists in auth.users
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      return res.status(409).json({
        error: 'Email already exists'
      });
    }

    // Create user in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name,
        phone_number: phone_number,
        gender: gender,
        role: 'nurse',
        account_status: 'active'
      }
    });

    if (authError) {
      console.error('❌ Failed to create nurse account:', authError.message);
      return res.status(400).json({
        error: 'Failed to create user account',
        details: authError.message
      });
    }

    // Log activity
    try {
      await supabase
        .from('activity_logs')
        .insert([{
          user_id: authUser.user.id,
          activity_type: 'NURSE_REGISTRATION',
          description: `Nurse account created: ${full_name}`,
          created_at: new Date().toISOString()
        }]);
    } catch (logError) {
      console.error('⚠️ Activity log error (non-critical):', logError.message);
      // Don't fail the request if logging fails
    }

    console.log('✅ Nurse created successfully:', email);

    res.status(201).json({
      data: {
        id: authUser.user.id,
        full_name: full_name,
        email: email,
        phone_number: phone_number,
        gender: gender,
        account_status: 'active',
        role: 'nurse',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      message: 'Nurse created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating nurse:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all nurses with filtering and pagination
 * GET /api/nurses
 */
exports.getAllNurses = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, sort_by = 'created_at', sort_order = 'desc' } = req.query;

    // Get all users from auth.users
    const { data: allUsers, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('❌ Failed to fetch nurses:', usersError.message);
      return res.status(400).json({
        error: 'Failed to fetch nurses',
        details: usersError.message
      });
    }

    // Filter for nurses only
    let nurses = allUsers.users
      .filter(user => user.user_metadata?.role === 'nurse')
      .map(user => ({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
        phone_number: user.user_metadata?.phone_number || '',
        gender: user.user_metadata?.gender || '',
        account_status: user.user_metadata?.account_status || 'active',
        created_at: user.created_at,
        updated_at: user.updated_at
      }));

    // Apply status filter
    if (status) {
      nurses = nurses.filter(n => n.account_status === status);
    }

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      nurses = nurses.filter(n => 
        n.full_name.toLowerCase().includes(searchLower) ||
        n.email.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    nurses.sort((a, b) => {
      let aVal = a[sort_by];
      let bVal = b[sort_by];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sort_order === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedNurses = nurses.slice(offset, offset + parseInt(limit));

    res.json({
      data: {
        nurses: paginatedNurses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: nurses.length,
          pages: Math.ceil(nurses.length / parseInt(limit))
        }
      },
      message: 'Nurses retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Error fetching nurses:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get single nurse by ID
 * GET /api/nurses/:id
 */
exports.getNurseById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabase.auth.admin.getUserById(id);

    if (error || !user) {
      return res.status(404).json({
        error: 'Nurse not found'
      });
    }

    // Check if user is a nurse
    if (user.user_metadata?.role !== 'nurse') {
      return res.status(404).json({
        error: 'Nurse not found'
      });
    }

    res.json({
      data: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
        phone_number: user.user_metadata?.phone_number || '',
        gender: user.user_metadata?.gender || '',
        account_status: user.user_metadata?.account_status || 'active',
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      message: 'Nurse retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching nurse:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update nurse profile
 * PUT /api/nurses/:id
 */
exports.updateNurse = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone_number, gender } = req.body;

    // Get current user - use listUsers to ensure we get metadata
    const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError.message);
      return res.status(500).json({
        error: 'Failed to fetch user',
        details: listError.message
      });
    }

    const user = allUsers.users.find(u => u.id === id);

    if (!user) {
      console.error('❌ Nurse not found:', id);
      return res.status(404).json({
        error: 'Nurse not found'
      });
    }

    // Check if user is a nurse
    if (user.user_metadata?.role !== 'nurse') {
      console.error('❌ User is not a nurse');
      return res.status(404).json({
        error: 'Nurse not found'
      });
    }

    // Prepare metadata update - preserve existing metadata
    const currentMetadata = user.user_metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      full_name: full_name || currentMetadata.full_name,
      phone_number: phone_number || currentMetadata.phone_number,
      gender: gender || currentMetadata.gender
    };

    // Update user metadata
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(id, {
      user_metadata: updatedMetadata
    });

    if (updateError) {
      console.error('❌ Failed to update nurse:', updateError.message);
      return res.status(400).json({
        error: 'Failed to update nurse',
        details: updateError.message
      });
    }

    console.log('✅ Nurse profile updated successfully');

    res.json({
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        full_name: updatedUser.user_metadata?.full_name || '',
        phone_number: updatedUser.user_metadata?.phone_number || '',
        gender: updatedUser.user_metadata?.gender || '',
        account_status: updatedUser.user_metadata?.account_status || 'active',
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at
      },
      message: 'Nurse updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating nurse:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update nurse account status
 * PUT /api/nurses/:id/status
 */
exports.updateNurseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be active, inactive, or suspended'
      });
    }

    // Get current user - use listUsers to ensure we get metadata
    const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError.message);
      return res.status(500).json({
        error: 'Failed to fetch user',
        details: listError.message
      });
    }

    const user = allUsers.users.find(u => u.id === id);

    if (!user) {
      console.error('❌ Nurse not found:', id);
      return res.status(404).json({
        error: 'Nurse not found'
      });
    }

    // Check if user is a nurse
    if (user.user_metadata?.role !== 'nurse') {
      console.error('❌ User is not a nurse');
      return res.status(404).json({
        error: 'Nurse not found'
      });
    }

    // Prepare metadata update - preserve existing metadata
    const currentMetadata = user.user_metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      account_status: status
    };

    // Update user metadata with new status
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(id, {
      user_metadata: updatedMetadata
    });

    if (updateError) {
      console.error('❌ Failed to update nurse status:', updateError.message);
      return res.status(400).json({
        error: 'Failed to update nurse status',
        details: updateError.message
      });
    }

    console.log('✅ Nurse status updated to:', status);

    // Log activity
    try {
      await supabase
        .from('activity_logs')
        .insert([{
          user_id: id,
          activity_type: 'NURSE_STATUS_CHANGE',
          description: `Nurse account status changed to: ${status}`,
          created_at: new Date().toISOString()
        }]);
    } catch (logError) {
      console.error('⚠️ Activity log error (non-critical):', logError.message);
      // Don't fail the request if logging fails
    }

    res.json({
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        full_name: updatedUser.user_metadata?.full_name || '',
        phone_number: updatedUser.user_metadata?.phone_number || '',
        gender: updatedUser.user_metadata?.gender || '',
        account_status: updatedUser.user_metadata?.account_status || 'active',
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at
      },
      message: 'Nurse status updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating nurse status:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================================================
// NURSE-PATIENT ASSIGNMENT
// ============================================================================

/**
 * Create nurse-patient assignment
 * POST /api/nurse-patient-assignments
 */
exports.createAssignment = async (req, res) => {
  try {
    const { nurse_id, patient_id, assigned_by_doctor_id } = req.body;

    if (!nurse_id || !patient_id || !assigned_by_doctor_id) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'nurse_id, patient_id, and assigned_by_doctor_id are required'
      });
    }

    // Check if nurse exists and is active
    const { data: nurse, error: nurseError } = await supabase.auth.admin.getUserById(nurse_id);

    if (nurseError || !nurse || nurse.user_metadata?.role !== 'nurse' || nurse.user_metadata?.account_status !== 'active') {
      return res.status(404).json({
        error: 'Nurse not found or is not active'
      });
    }

    // Check if patient exists
    const { data: patient, error: patientError } = await supabase.auth.admin.getUserById(patient_id);

    if (patientError || !patient || patient.user_metadata?.role !== 'patient') {
      return res.status(404).json({
        error: 'Patient not found'
      });
    }

    // Check for existing active assignment
    const { data: existingAssignment } = await supabase
      .from('nurse_patient_assignments')
      .select('id')
      .eq('nurse_id', nurse_id)
      .eq('patient_id', patient_id)
      .eq('status', 'active')
      .single();

    if (existingAssignment) {
      return res.status(409).json({
        error: 'Patient is already assigned to this nurse'
      });
    }

    // Create assignment
    const { data: assignment, error } = await supabase
      .from('nurse_patient_assignments')
      .insert([{
        nurse_id,
        patient_id,
        assigned_by_doctor_id,
        assignment_date: new Date().toISOString(),
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Assignment creation error:', error);
      return res.status(400).json({
        error: 'Failed to create assignment',
        details: error.message
      });
    }

    res.status(201).json({
      data: assignment,
      message: 'Patient assigned to nurse successfully'
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get assignments with filtering
 * GET /api/nurse-patient-assignments
 */
exports.getAssignments = async (req, res) => {
  try {
    const { nurse_id, patient_id, status } = req.query;

    let query = supabase
      .from('nurse_patient_assignments')
      .select('*');

    if (nurse_id) {
      query = query.eq('nurse_id', nurse_id);
    }

    if (patient_id) {
      query = query.eq('patient_id', patient_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: assignments, error } = await query;

    if (error) {
      console.error('Query error:', error);
      return res.status(400).json({
        error: 'Failed to fetch assignments',
        details: error.message
      });
    }

    res.json({
      data: {
        assignments: assignments || []
      },
      message: 'Assignments retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update assignment status
 * PUT /api/nurse-patient-assignments/:id
 */
exports.updateAssignmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be active or inactive'
      });
    }

    const { data: assignment, error } = await supabase
      .from('nurse_patient_assignments')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !assignment) {
      return res.status(404).json({
        error: 'Assignment not found'
      });
    }

    res.json({
      data: assignment,
      message: 'Assignment status updated successfully'
    });
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get patients assigned to a nurse
 * GET /api/nurses/:nurseId/patients
 */
exports.getNursePatients = async (req, res) => {
  try {
    const { nurseId } = req.params;

    const { data: assignments, error: assignmentError } = await supabase
      .from('nurse_patient_assignments')
      .select('patient_id, assignment_date, status')
      .eq('nurse_id', nurseId)
      .eq('status', 'active');

    if (assignmentError) {
      console.error('Query error:', assignmentError);
      return res.status(400).json({
        error: 'Failed to fetch assignments',
        details: assignmentError.message
      });
    }

    if (!assignments || assignments.length === 0) {
      return res.json({
        data: [],
        message: 'No patients assigned to this nurse'
      });
    }

    const patientIds = assignments.map(a => a.patient_id);

    // Get patient details from auth.users
    const { data: allUsers } = await supabase.auth.admin.listUsers();
    const patients = allUsers.users
      .filter(u => patientIds.includes(u.id) && u.user_metadata?.role === 'patient')
      .map(u => ({
        id: u.id,
        full_name: u.user_metadata?.full_name || '',
        email: u.email,
        phone_number: u.user_metadata?.phone_number || '',
        account_status: u.user_metadata?.account_status || 'active',
        created_at: u.created_at
      }));

    // Merge assignment data with patient data
    const patientsWithAssignment = patients.map(patient => {
      const assignment = assignments.find(a => a.patient_id === patient.id);
      return {
        ...patient,
        assignment_date: assignment?.assignment_date,
        assignment_status: assignment?.status
      };
    });

    res.json({
      data: patientsWithAssignment,
      message: 'Patients retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching nurse patients:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get nurses assigned to a patient
 * GET /api/patients/:patientId/nurses
 */
exports.getPatientNurses = async (req, res) => {
  try {
    const { patientId } = req.params;

    const { data: assignments, error: assignmentError } = await supabase
      .from('nurse_patient_assignments')
      .select('nurse_id, status')
      .eq('patient_id', patientId)
      .eq('status', 'active');

    if (assignmentError) {
      console.error('Query error:', assignmentError);
      return res.status(400).json({
        error: 'Failed to fetch assignments',
        details: assignmentError.message
      });
    }

    if (!assignments || assignments.length === 0) {
      return res.json({
        data: [],
        message: 'No nurses assigned to this patient'
      });
    }

    const nurseIds = assignments.map(a => a.nurse_id);

    // Get nurse details from auth.users
    const { data: allUsers } = await supabase.auth.admin.listUsers();
    const nurses = allUsers.users
      .filter(u => nurseIds.includes(u.id) && u.user_metadata?.role === 'nurse')
      .map(u => ({
        id: u.id,
        full_name: u.user_metadata?.full_name || '',
        email: u.email,
        phone_number: u.user_metadata?.phone_number || '',
        gender: u.user_metadata?.gender || '',
        account_status: u.user_metadata?.account_status || 'active',
        created_at: u.created_at,
        updated_at: u.updated_at
      }));

    res.json({
      data: nurses,
      message: 'Nurses retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching patient nurses:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
