/**
 * Admin Dashboard Service
 * Handles dashboard statistics and monitoring
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get user statistics
 */
const getUserStatistics = async () => {
  try {
    // Count doctors
    const { count: doctorCount, error: docErr } = await supabase
      .from('doctors')
      .select('*', { count: 'exact', head: true });
    if (docErr) throw docErr;

    // Count approved doctors (active)
    const { count: approvedDoctorCount, error: approvedDocErr } = await supabase
      .from('doctors')
      .select('*', { count: 'exact', head: true })
      .eq('is_approved_by_admin', true);
    if (approvedDocErr) throw approvedDocErr;

    // Count patients
    const { count: patientCount, error: patErr } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });
    if (patErr) throw patErr;

    // Count active admins (excluding deleted)
    const { count: adminCount, error: adminErr } = await supabase
      .from('admin_users')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false)
      .eq('account_status', 'Active');
    if (adminErr) throw adminErr;

    // Count labs (excluding deleted)
    const { count: labCount, error: labErr } = await supabase
      .from('labs')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false);
    if (labErr) throw labErr;

    const totalUsers = (doctorCount || 0) + (patientCount || 0) + (labCount || 0);
    // Active = approved doctors + all patients + approved labs
    const activeUsers = (approvedDoctorCount || 0) + (patientCount || 0) + (labCount || 0);

    const byRole = {
      doctor: doctorCount || 0,
      patient: patientCount || 0,
      admin: adminCount || 0,
      lab: labCount || 0
    };

    const byStatus = {
      active: activeUsers
    };

    return {
      total: totalUsers,
      by_role: byRole,
      by_status: byStatus
    };
  } catch (error) {
    console.error('Error getting user statistics:', error);
    throw error;
  }
};

/**
 * Get medical cases statistics
 */
const getCaseStatistics = async () => {
  try {
    // Get total appointments
    const { count: totalCases } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true });

    // Get appointments by status
    const { data: casesByStatus } = await supabase
      .from('appointments')
      .select('status', { count: 'exact' });

    // Get appointments by specialization
    const { data: casesBySpec } = await supabase
      .from('appointments')
      .select('doctor_id')
      .then(async (result) => {
        if (result.error) throw result.error;
        
        // Get doctor specializations
        const doctorIds = result.data.map(a => a.doctor_id);
        const { data: specs } = await supabase
          .from('doctor_specializations')
          .select('doctor_id, medical_specializations(name)')
          .in('doctor_id', doctorIds);

        return specs;
      });

    // Group by status
    const byStatus = {};
    (casesByStatus || []).forEach(item => {
      if (item.status) {
        byStatus[item.status] = (byStatus[item.status] || 0) + 1;
      }
    });

    // Group by specialization
    const bySpecialization = {};
    casesBySpec?.forEach(item => {
      const specName = item.medical_specializations?.name || 'Unknown';
      bySpecialization[specName] = (bySpecialization[specName] || 0) + 1;
    });

    return {
      total: totalCases || 0,
      by_status: byStatus,
      by_specialization: bySpecialization
    };
  } catch (error) {
    console.error('Error getting case statistics:', error);
    throw error;
  }
};

/**
 * Get lab test statistics
 */
const getLabTestStatistics = async () => {
  try {
    // Get total lab tests (from lab_requests - all requests including pending, processing, completed, rejected)
    const { count: totalTests } = await supabase
      .from('lab_requests')
      .select('*', { count: 'exact' });

    // Get lab requests with their actual status from the database
    const { data: labRequests } = await supabase
      .from('lab_requests')
      .select('*');

    // Group by status
    const byStatus = {};
    (labRequests || []).forEach(request => {
      const status = request.status || 'Pending';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    // Get lab tests by lab (if lab_id field exists)
    const byLab = {};
    (labRequests || []).forEach(request => {
      if (request.lab_id) {
        byLab[request.lab_id] = (byLab[request.lab_id] || 0) + 1;
      }
    });

    return {
      total: totalTests || 0,
      by_status: byStatus,
      by_lab: byLab
    };
  } catch (error) {
    console.error('Error getting lab test statistics:', error);
    throw error;
  }
};

/**
 * Get extended KPI statistics
 */
const getKpiStatistics = async () => {
  try {
    // New patients this week
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: newPatientsWeek, error: npErr } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo);
    if (npErr) throw npErr;

    // Appointments today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const { count: appointmentsToday, error: atErr } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('appointment_time', todayStart.toISOString())
      .lte('appointment_time', todayEnd.toISOString());
    if (atErr) throw atErr;

    // Approved doctors
    const { count: approvedDoctors, error: adErr } = await supabase
      .from('doctors')
      .select('*', { count: 'exact', head: true })
      .eq('is_approved_by_admin', true);
    if (adErr) throw adErr;

    // Non-approved doctors
    const { count: pendingDoctors, error: pdErr } = await supabase
      .from('doctors')
      .select('*', { count: 'exact', head: true })
      .eq('is_approved_by_admin', false);
    if (pdErr) throw pdErr;

    // Approved labs
    const { count: approvedLabs, error: alErr } = await supabase
      .from('labs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Approved')
      .eq('is_deleted', false);
    if (alErr) throw alErr;

    // Pending labs
    const { count: pendingLabs, error: plErr } = await supabase
      .from('labs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Pending Approval')
      .eq('is_deleted', false);
    if (plErr) throw plErr;

    // User registrations over last 8 weeks (for line chart)
    const { data: patientRegs } = await supabase
      .from('patients')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString());

    const { data: doctorRegs } = await supabase
      .from('doctors')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString());

    // Build weekly buckets
    const weeklyMap = {};
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const key = `${d.getFullYear()}-W${String(getWeekNumber(d)).padStart(2, '0')}`;
      weeklyMap[key] = { week: key, patients: 0, doctors: 0 };
    }
    (patientRegs || []).forEach(r => {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-W${String(getWeekNumber(d)).padStart(2, '0')}`;
      if (weeklyMap[key]) weeklyMap[key].patients++;
    });
    (doctorRegs || []).forEach(r => {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-W${String(getWeekNumber(d)).padStart(2, '00')}`;
      if (weeklyMap[key]) weeklyMap[key].doctors++;
    });
    const registrationTrend = Object.values(weeklyMap);

    // Most in-demand specializations (by appointment count, using specialty from doctors table)
    const { data: specAppointments } = await supabase
      .from('appointments')
      .select('doctor_id');

    const doctorIds = [...new Set((specAppointments || []).map(a => a.doctor_id))];
    let specializationDemand = [];
    if (doctorIds.length > 0) {
      const { data: doctors } = await supabase
        .from('doctors')
        .select('user_id, specialty')
        .in('user_id', doctorIds);

      const specCount = {};
      (specAppointments || []).forEach(appt => {
        const doctor = (doctors || []).find(d => d.user_id === appt.doctor_id);
        const name = doctor?.specialty || null;
        if (name) specCount[name] = (specCount[name] || 0) + 1;
      });
      specializationDemand = Object.entries(specCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
    }

    return {
      new_patients_week: newPatientsWeek || 0,
      appointments_today: appointmentsToday || 0,
      approved_doctors: approvedDoctors || 0,
      pending_doctors: pendingDoctors || 0,
      approved_labs: approvedLabs || 0,
      pending_labs: pendingLabs || 0,
      registration_trend: registrationTrend,
      specialization_demand: specializationDemand
    };
  } catch (error) {
    console.error('Error getting KPI statistics:', error);
    throw error;
  }
};

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}


const getAllStatistics = async () => {
  try {
    const [userStats, caseStats, labStats, kpiStats] = await Promise.all([
      getUserStatistics(),
      getCaseStatistics(),
      getLabTestStatistics(),
      getKpiStatistics()
    ]);

    return {
      users: userStats,
      cases: caseStats,
      lab_tests: labStats,
      kpi: kpiStats,
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting all statistics:', error);
    throw error;
  }
};

/**
 * Get cached statistics (if available)
 */
const getCachedStatistics = async (cacheKey) => {
  try {
    const { data, error } = await supabase
      .from('dashboard_cache')
      .select('cache_value, expires_at')
      .eq('cache_key', cacheKey)
      .single();

    if (error || !data) return null;

    // Check if cache is expired
    if (new Date(data.expires_at) < new Date()) {
      // Delete expired cache
      await supabase
        .from('dashboard_cache')
        .delete()
        .eq('cache_key', cacheKey);
      return null;
    }

    return data.cache_value;
  } catch (error) {
    console.error('Error getting cached statistics:', error);
    return null;
  }
};

/**
 * Cache statistics
 */
const cacheStatistics = async (cacheKey, data, ttlMinutes = 5) => {
  try {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    // Delete old cache if exists
    await supabase
      .from('dashboard_cache')
      .delete()
      .eq('cache_key', cacheKey);

    // Insert new cache
    const { error } = await supabase
      .from('dashboard_cache')
      .insert({
        cache_key: cacheKey,
        cache_value: data,
        expires_at: expiresAt.toISOString()
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error caching statistics:', error);
    // Don't throw - caching failure shouldn't break the app
  }
};

module.exports = {
  getUserStatistics,
  getCaseStatistics,
  getLabTestStatistics,
  getKpiStatistics,
  getAllStatistics,
  getCachedStatistics,
  cacheStatistics
};
