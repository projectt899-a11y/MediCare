/**
 * Admin User Service
 * Handles all user management operations for admin
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get all users with filtering and pagination
 */
const getAllUsers = async (filters = {}, pagination = {}) => {
  try {
    const {
      role = null,
      status = null,
      search = null,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = filters;

    const { page = 1, limit = 20 } = pagination;

    // Normalize filters to lowercase
    const normalizedRole = role ? role.toLowerCase() : null;
    const normalizedStatus = status ? status.toLowerCase().replace(' ', '_') : null;
    // pending approval → pending, active → active, inactive → inactive

    let users = [];
    let total = 0;

    const shouldIncludeDoctors = !normalizedRole || normalizedRole === 'doctor';
    const shouldIncludePatients = !normalizedRole || normalizedRole === 'patient';
    const shouldIncludeLabs = !normalizedRole || normalizedRole === 'lab';

    if (shouldIncludeDoctors) {
      let q = supabase
        .from('doctors')
        .select('user_id, full_name, phone_number, specialty, is_approved_by_admin, created_at, license_file_path', { count: 'exact' });

      if (normalizedStatus === 'pending' || normalizedStatus === 'pending_approval') q = q.eq('is_approved_by_admin', false);
      if (normalizedStatus === 'active')   q = q.eq('is_approved_by_admin', true);
      if (search) q = q.ilike('full_name', `%${search}%`);

      q = q.order('created_at', { ascending: sortOrder === 'asc' });

      const { data: doctors, error: docErr, count: docCount } = await q;
      if (docErr) throw docErr;

      total += docCount || 0;
      users = users.concat(
        (doctors || []).map(d => ({
          id: d.user_id,
          user_id: d.user_id,
          full_name: d.full_name,
          email: null, // fetched below
          phone_number: d.phone_number,
          specialty: d.specialty,
          role: 'doctor',
          account_status: d.is_approved_by_admin ? 'active' : 'pending',
          created_at: d.created_at,
          registration_date: d.created_at,
          license_file_path: d.license_file_path || null,
        }))
      );
    }

    if (shouldIncludePatients && normalizedStatus !== 'pending' && normalizedStatus !== 'pending_approval') {
      let q = supabase
        .from('patients')
        .select('user_id, full_name, phone_number, email, created_at', { count: 'exact' });

      if (search) q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      q = q.order('created_at', { ascending: sortOrder === 'asc' });

      const { data: patients, error: patErr, count: patCount } = await q;
      if (patErr) throw patErr;

      total += patCount || 0;
      users = users.concat(
        (patients || []).map(p => ({
          id: p.user_id,
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email || null,
          phone_number: p.phone_number,
          role: 'patient',
          account_status: 'active',
          created_at: p.created_at,
          registration_date: p.created_at,
        }))
      );
    }

    if (shouldIncludeLabs && normalizedStatus !== 'pending' && normalizedStatus !== 'pending_approval') {
      let q = supabase
        .from('labs')
        .select('user_id, name, phone_number, email, is_approved, created_at', { count: 'exact' });

      if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      q = q.order('created_at', { ascending: sortOrder === 'asc' });

      const { data: labs, error: labErr, count: labCount } = await q;
      if (labErr) throw labErr;

      total += labCount || 0;
      users = users.concat(
        (labs || []).map(l => ({
          id: l.user_id,
          user_id: l.user_id,
          full_name: l.name,
          email: l.email || null,
          phone_number: l.phone_number,
          role: 'lab',
          account_status: l.is_approved ? 'active' : 'pending',
          created_at: l.created_at,
          registration_date: l.created_at,
        }))
      );
    }

    // Fetch emails from auth.users for doctors (using admin API)
    const doctorUsers = users.filter(u => u.role === 'doctor' && !u.email);
    if (doctorUsers.length > 0) {
      try {
        const { data: authList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const authMap = {};
        (authList?.users || []).forEach(u => { authMap[u.id] = u.email; });
        users = users.map(u => ({
          ...u,
          email: u.email || authMap[u.id] || null,
          registration_date: u.registration_date || authMap[u.id] ? u.registration_date : null
        }));
      } catch {
        // silently fail — emails stay null
      }
    }

    // Apply email/name search filter for doctors (post-fetch since email comes from auth)
    if (search && shouldIncludeDoctors) {
      const s = search.toLowerCase();
      users = users.filter(u =>
        u.role !== 'doctor' ||
        u.full_name?.toLowerCase().includes(s) ||
        u.email?.toLowerCase().includes(s)
      );
      total = users.length;
    }

    // Sort merged results by created_at
    users.sort((a, b) => {
      const da = new Date(a.created_at || 0).getTime();
      const db = new Date(b.created_at || 0).getTime();
      return sortOrder === 'asc' ? da - db : db - da;
    });

    // Apply pagination
    const offset = (page - 1) * limit;
    const paginated = users.slice(offset, offset + limit);

    return {
      users: paginated,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1
      }
    };
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
};

/**
 * Get user by ID with all details
 */
const getUserById = async (userId) => {
  try {
    // Try to get user from doctors table first
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!doctorError && doctor) {
      // User is a doctor
      let additionalInfo = {
        full_name: doctor.full_name,
        phone_number: doctor.phone_number,
        specialty: doctor.specialty,
        is_approved: doctor.is_approved,
        is_approved_by_admin: doctor.is_approved_by_admin
      };

      // Get email from auth.users
      let email = null;
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(userId);
        email = authUser?.user?.email;
      } catch (err) {
        console.error('Error fetching email from auth:', err);
      }

      // Get specialization
      const { data: specs, error: specError } = await supabase
        .from('doctor_specializations')
        .select('specialization_id, medical_specializations(id, name)')
        .eq('doctor_id', userId);

      if (!specError && specs && specs.length > 0) {
        additionalInfo.specialization = specs[0].medical_specializations;
      }

      // Get schedule
      const { data: schedule, error: scheduleError } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('doctor_id', userId);

      if (!scheduleError && schedule) {
        additionalInfo.schedule = schedule;
      }

      const result = {
        id: doctor.user_id,
        email: email,
        role: 'Doctor',
        account_status: 'active',
        registration_date: doctor.created_at,
        ...additionalInfo
      };

      console.log('getUserById returning doctor:', result);
      return result;
    }

    // Try to get user from patients table
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!patientError && patient) {
      // User is a patient
      // Get email from auth.users
      let email = null;
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(userId);
        email = authUser?.user?.email;
      } catch (err) {
        console.error('Error fetching email from auth:', err);
      }

      return {
        id: patient.user_id,
        email: email,
        role: 'Patient',
        account_status: 'active',
        registration_date: patient.created_at,
        full_name: patient.full_name,
        phone_number: patient.phone_number,
        age: patient.age,
        blood_type: patient.blood_type
      };
    }

    // User not found in either table
    throw new Error(`User with ID ${userId} not found`);
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw error;
  }
};

/**
 * Update user account status (activate/deactivate)
 */
const updateUserStatus = async (userId, newStatus, adminId) => {
  try {
    // Validate status
    const validStatuses = ['Active', 'Inactive', 'Pending Approval'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error('Invalid account status');
    }

    // Update user status
    const { data, error } = await supabase
      .from('user_roles')
      .update({ account_status: newStatus })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    // Log audit action
    await supabase
      .from('audit_logs')
      .insert({
        admin_id: adminId,
        action_type: newStatus === 'Active' ? 'ACTIVATE' : 'DEACTIVATE',
        resource_type: 'Account',
        resource_id: userId,
        changes: { account_status: { from: data.account_status, to: newStatus } },
        status: 'Success'
      });

    return data;
  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
};

/**
 * Approve doctor registration
 */
const approveDoctorRegistration = async (doctorId, specializationId, adminId) => {
  try {
    // Update doctor approval status
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .update({
        is_approved_by_admin: true,
        is_approved: true,
        admin_approval_date: new Date().toISOString(),
        approved_by: adminId || null
      })
      .eq('user_id', doctorId)
      .select()
      .single();

    if (doctorError) throw doctorError;

    // Assign specialization only if provided
    if (specializationId) {
      await supabase
        .from('doctor_specializations')
        .insert({
          doctor_id: doctorId,
          specialization_id: specializationId,
          assigned_by: adminId
        });
    }

    // Log audit action
    await supabase
      .from('audit_logs')
      .insert({
        admin_id: adminId,
        action_type: 'APPROVE',
        resource_type: 'Doctor',
        resource_id: doctorId,
        changes: { is_approved_by_admin: true },
        status: 'Success'
      });

    return doctor;
  } catch (error) {
    console.error('Error approving doctor:', error);
    throw error;
  }
};

/**
 * Reject doctor registration
 */
const rejectDoctorRegistration = async (doctorId, reason, adminId) => {
  try {
    // Soft delete the user
    const { error: deleteError } = await supabase
      .from('user_roles')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('user_id', doctorId);

    if (deleteError) throw deleteError;

    // Log audit action
    await supabase
      .from('audit_logs')
      .insert({
        admin_id: adminId,
        action_type: 'REJECT',
        resource_type: 'Doctor',
        resource_id: doctorId,
        changes: { reason },
        status: 'Success'
      });

    return { success: true };
  } catch (error) {
    console.error('Error rejecting doctor:', error);
    throw error;
  }
};

/**
 * Assign specialization to doctor
 */
const assignSpecializationToDoctor = async (doctorId, specializationId, adminId) => {
  try {
    // Check if specialization exists
    const { data: spec, error: specError } = await supabase
      .from('medical_specializations')
      .select('id, name')
      .eq('id', specializationId)
      .single();

    if (specError || !spec) {
      throw new Error('Specialization not found');
    }

    // Check if doctor already has this specialization
    const { data: existing } = await supabase
      .from('doctor_specializations')
      .select('id')
      .eq('doctor_id', doctorId)
      .eq('specialization_id', specializationId)
      .single();

    if (existing) {
      throw new Error('Doctor already has this specialization');
    }

    // Assign specialization
    const { data, error } = await supabase
      .from('doctor_specializations')
      .insert({
        doctor_id: doctorId,
        specialization_id: specializationId,
        assigned_by: adminId
      })
      .select()
      .single();

    if (error) throw error;

    // Log audit action
    await supabase
      .from('audit_logs')
      .insert({
        admin_id: adminId,
        action_type: 'UPDATE',
        resource_type: 'Doctor',
        resource_id: doctorId,
        changes: { specialization_id: specializationId },
        status: 'Success'
      });

    return {
      doctor_id: doctorId,
      specialization: spec
    };
  } catch (error) {
    console.error('Error assigning specialization:', error);
    throw error;
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserStatus,
  approveDoctorRegistration,
  rejectDoctorRegistration,
  assignSpecializationToDoctor
};
