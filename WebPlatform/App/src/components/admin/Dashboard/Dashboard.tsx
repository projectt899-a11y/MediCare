import React, { useEffect, useState } from 'react';
import api from '../../../lib/api';
import StatisticsCard from './StatisticsCard';
import CaseStatsChart from './CaseStatsChart';
import '../../../styles/adminDashboard.css';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar
} from 'recharts';

interface DashboardStats {
  users: {
    total: number;
    by_role: Record<string, number>;
    by_status: Record<string, number>;
  };
  cases: {
    total: number;
    by_status: Record<string, number>;
    by_specialization: Record<string, number>;
  };
  lab_tests: {
    total: number;
    by_status: Record<string, number>;
    by_lab: Record<string, number>;
  };
  kpi: {
    new_patients_week: number;
    appointments_today: number;
    approved_doctors: number;
    pending_doctors: number;
    approved_labs: number;
    pending_labs: number;
    registration_trend: { week: string; patients: number; doctors: number }[];
    specialization_demand: { name: string; count: number }[];
  };
  last_updated: string;
}

interface PendingDoctor {
  user_id: string;
  full_name: string;
  specialty: string;
  phone_number: string;
  created_at: string;
  license_file_path: string | null;
}

interface PendingLab {
  id: string;
  name: string;
  lab_type: string | null;
  phone_number: string;
  email: string;
  license_number: string;
  license_file_path: string | null;
  created_at: string;
}

const PIE_COLORS = ['#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6'];

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDoctors, setPendingDoctors] = useState<PendingDoctor[]>([]);
  const [pendingLabs, setPendingLabs] = useState<PendingLab[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchStatistics();
    fetchPendingDoctors();
    fetchPendingLabs();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/dashboard/statistics');
      setStats(response.data.data || response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingDoctors = async () => {
    try {
      const response = await api.get('/admin/users?role=doctor&status=pending');
      const data = response.data?.data || response.data;
      const users = data?.users || [];
      setPendingDoctors(
        users.map((u: any) => ({
          user_id: u.id || u.user_id,
          full_name: u.full_name || '—',
          specialty: u.specialty || '—',
          phone_number: u.phone_number || '—',
          created_at: u.created_at || '',
          license_file_path: u.license_file_path || null,
        }))
      );
    } catch { /* silently fail */ }
  };

  const fetchPendingLabs = async () => {
    try {
      const response = await api.get('/admin/labs/pending');
      setPendingLabs(response.data?.data || []);
    } catch { /* silently fail */ }
  };

  const handleApproveLab = async (labId: string) => {
    setActionLoading(labId);
    try {
      await api.post(`/admin/labs/${labId}/approve`);
      setPendingLabs(prev => prev.filter(l => l.id !== labId));
      fetchStatistics();
    } catch (err: any) {
      setActionMsg(err.response?.data?.message || 'Lab approval failed.');
      setTimeout(() => setActionMsg(null), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectLab = async (labId: string) => {
    if (!window.confirm('Are you sure you want to reject this lab?')) return;
    setActionLoading(labId);
    try {
      await api.post(`/admin/labs/${labId}/reject`, { reason: 'Rejected from dashboard' });
      setPendingLabs(prev => prev.filter(l => l.id !== labId));
    } catch (err: any) {
      setActionMsg(err.response?.data?.message || 'Lab rejection failed.');
      setTimeout(() => setActionMsg(null), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (doctorId: string) => {
    setActionLoading(doctorId);
    try {
      await api.post(`/admin/users/${doctorId}/approve`);
      setPendingDoctors(prev => prev.filter(d => d.user_id !== doctorId));
      fetchStatistics();
    } catch (err: any) {
      setActionMsg(err.response?.data?.message || 'Approval failed.');
      setTimeout(() => setActionMsg(null), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (doctorId: string) => {
    if (!window.confirm('Are you sure you want to reject this doctor?')) return;
    setActionLoading(doctorId);
    try {
      await api.post(`/admin/users/${doctorId}/reject`, { reason: 'Rejected from dashboard' });
      setPendingDoctors(prev => prev.filter(d => d.user_id !== doctorId));
    } catch (err: any) {
      setActionMsg(err.response?.data?.message || 'Rejection failed.');
      setTimeout(() => setActionMsg(null), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="dashboard-loading">Loading statistics...</div>;
  if (error) return <div className="dashboard-error">Error: {error}</div>;
  if (!stats) return <div className="dashboard-error">No data available</div>;

  // Pie chart data from by_role
  const pieData = Object.entries(stats.users.by_role || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h2>Dashboard Overview</h2>
        <button className="refresh-btn" onClick={fetchStatistics}><i className="fa-solid fa-arrows-rotate fa-rotate-270" style={{ color: "rgb(14, 78, 129)" }}></i> Refresh</button>
      </div>

      {/* Main Stats Cards */}
      <div className="statistics-grid">
        <StatisticsCard title="Total Users" value={stats.users.total || 0} icon="fa-solid fa-users" color="blue" />
        <StatisticsCard title="Total Cases" value={stats.cases.total || 0} icon="fa-solid fa-suitcase-medical" color="green" />
        <StatisticsCard title="Lab Tests" value={stats.lab_tests.total || 0} icon="fa-solid fa-flask" color="purple" />
        <StatisticsCard title="Active Users" value={stats.users.by_status?.['active'] || 0} icon="fa-solid fa-eye" color="yellow"/>
      </div>

      {/* KPI Cards */}
      <div className="statistics-grid">
        <StatisticsCard title="New Patients This Week" value={stats.kpi?.new_patients_week ?? 0} icon="fa-solid fa-user-plus" color="teal" />
        <StatisticsCard title="Appointments Today"     value={stats.kpi?.appointments_today ?? 0} icon="fa-solid fa-calendar-day" color="blue" />
        <StatisticsCard title="Approved Doctors"       value={stats.kpi?.approved_doctors ?? 0}   icon="fa-solid fa-user-doctor" color="green" />
        <StatisticsCard title="Pending Doctors"        value={stats.kpi?.pending_doctors ?? 0}    icon="fa-solid fa-clock" color="orange" />
      </div>

      {/* Labs Stats Cards */}
      <div className="statistics-grid">
        <StatisticsCard title="Approved Labs"          value={stats.kpi?.approved_labs ?? 0}      icon="fa-solid fa-flask-vial" color="green" />
        <StatisticsCard title="Pending Labs"           value={stats.kpi?.pending_labs ?? 0}       icon="fa-solid fa-hourglass-end" color="orange" />
      </div>

      {/* Charts Row 1: Line + Pie */}
      <div className="charts-grid">
        <div className="chart-container">
          <h3>User Registration Growth</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={stats.kpi?.registration_trend || []} margin={{ top: 5, right: 20, left: 0, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="patients" stroke="#2ecc71" strokeWidth={2} dot={{ r: 3 }} name="Patients" />
              <Line type="monotone" dataKey="doctors" stroke="#3498db" strokeWidth={2} dot={{ r: 3 }} name="Doctors" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Users by Role</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart margin={{ bottom: 50 }}>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="pending-empty">No user data available.</p>
          )}
        </div>
      </div>

      {/* Charts Row 2: Cases by Status + Specialization Demand */}
      <div className="charts-grid">
        <div className="chart-container">
          <h3>Cases by Status</h3>
          <CaseStatsChart data={stats.cases.by_status || {}} />
        </div>

        <div className="chart-container">
          <h3>Most In-Demand Specializations</h3>
          {(stats.kpi?.specialization_demand || []).length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={stats.kpi.specialization_demand}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip />
                <Bar dataKey="count" fill="#3498db" radius={[0, 4, 4, 0]} name="Appointments" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="pending-empty">No specialization data available.</p>
          )}
        </div>
      </div>

      {/* Pending Approvals */}
      <div className="pending-section">
        <div className="pending-header">
          <h3>Pending Approvals</h3>
          {(pendingDoctors.length + pendingLabs.length) > 0 && (
            <span className="pending-badge">{pendingDoctors.length + pendingLabs.length}</span>
          )}
        </div>

        {actionMsg && <div className="pending-action-msg">{actionMsg}</div>}

        {/* Pending Doctors */}
        {pendingDoctors.length > 0 && (
          <>
            <h4 style={{ margin: '1rem 0 0.5rem', color: '#555', fontSize: '0.95rem', fontWeight: 600 }}>Pending Doctors</h4>
            <div className="pending-table-wrapper">
              <table className="pending-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Specialty</th>
                    <th>Phone</th>
                    <th>Registered</th>
                    <th>License</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingDoctors.map(doctor => (
                    <tr key={doctor.user_id}>
                      <td>{doctor.full_name}</td>
                      <td>{doctor.specialty}</td>
                      <td>{doctor.phone_number}</td>
                      <td>{doctor.created_at ? new Date(doctor.created_at).toLocaleDateString() : '—'}</td>
                      <td>
                        {doctor.license_file_path ? (
                          <a href={doctor.license_file_path} target="_blank" rel="noreferrer" className="license-eye-btn" title="View License">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                          </a>
                        ) : '—'}
                      </td>
                      <td className="pending-actions">
                        <button className="btn-approve" disabled={actionLoading === doctor.user_id} onClick={() => handleApprove(doctor.user_id)}>
                          {actionLoading === doctor.user_id ? '...' : 'Approve'}
                        </button>
                        <button className="btn-reject" disabled={actionLoading === doctor.user_id} onClick={() => handleReject(doctor.user_id)}>
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pending Labs */}
        {pendingLabs.length > 0 && (
          <>
            <h4 style={{ margin: '1rem 0 0.5rem', color: '#555', fontSize: '0.95rem', fontWeight: 600 }}>Pending Laboratories</h4>
            <div className="pending-table-wrapper">
              <table className="pending-table">
                <thead>
                  <tr>
                    <th>Lab Name</th>
                    <th>Type</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>License No.</th>
                    <th>Registered</th>
                    <th>License</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingLabs.map(lab => (
                    <tr key={lab.id}>
                      <td>{lab.name}</td>
                      <td>{lab.lab_type || '—'}</td>
                      <td>{lab.phone_number}</td>
                      <td>{lab.email}</td>
                      <td>{lab.license_number}</td>
                      <td>{lab.created_at ? new Date(lab.created_at).toLocaleDateString() : '—'}</td>
                      <td>
                        {lab.license_file_path ? (
                          <a href={lab.license_file_path} target="_blank" rel="noreferrer" className="license-eye-btn" title="View License">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                          </a>
                        ) : '—'}
                      </td>
                      <td className="pending-actions">
                        <button className="btn-approve" disabled={actionLoading === lab.id} onClick={() => handleApproveLab(lab.id)}>
                          {actionLoading === lab.id ? '...' : 'Approve'}
                        </button>
                        <button className="btn-reject" disabled={actionLoading === lab.id} onClick={() => handleRejectLab(lab.id)}>
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {pendingDoctors.length === 0 && pendingLabs.length === 0 && (
          <p className="pending-empty">No pending approvals.</p>
        )}
      </div>

      <div className="dashboard-footer">
        <p>Last updated: {stats.last_updated ? new Date(stats.last_updated).toLocaleString() : 'N/A'}</p>
      </div>
    </div>
  );
};

export default Dashboard;
