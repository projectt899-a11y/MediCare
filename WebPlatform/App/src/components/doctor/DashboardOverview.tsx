import { useState, useEffect } from 'react';
import api from '../../lib/api';
import '../../styles/dashboardOverview.css';

interface DashboardData {
  totalPatients: number;
  todayAppointments: { total: number; completed: number; upcoming: number };
  activeCases: number;
  recentActivities: { id: string; patient: string; lastUpdate: string; status: string }[];
}

const DashboardOverview = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingLabRequests, setPendingLabRequests] = useState<number | null>(null);

  useEffect(() => {
    api.get('/doctor/dashboard')
      .then(res => setData(res.data))
      .catch(err => console.error('Dashboard fetch error:', err))
      .finally(() => setLoading(false));

    // Fetch pending lab requests count
    api.get('/labs/doctor/requests')
      .then(res => {
        const raw = res.data?.data || [];
        const pending = raw.filter((r: any) => r.status === 'Pending').length;
        setPendingLabRequests(pending);
      })
      .catch(() => setPendingLabRequests(0));
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;

  const { totalPatients, todayAppointments, activeCases, recentActivities } = data || {
    totalPatients: 0,
    todayAppointments: { total: 0, completed: 0, upcoming: 0 },
    activeCases: 0,
    recentActivities: []
  };

  return (
    <div className="dashboard-overview">
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div className="card-content">
            <h3>Total Patients</h3>
            <p className="card-value">{totalPatients}</p>
            <span className="card-change">All registered patients</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div className="card-content">
            <h3>Today's Appointments</h3>
            <p className="card-value">{todayAppointments.total}</p>
            <span className="card-change">{todayAppointments.completed} completed, {todayAppointments.upcoming} upcoming</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 2v6"></path><path d="M15 2v6"></path><path d="M12 2v6"></path>
              <path d="M5 9h14l-1 12H6L5 9z"></path>
              <path d="M8 9V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4"></path>
            </svg>
          </div>
          <div className="card-content">
            <h3>Pending Lab Results</h3>
            <p className="card-value">{pendingLabRequests ?? '—'}</p>
            <span className="card-change">
              {pendingLabRequests === null ? 'Loading...' : pendingLabRequests === 0 ? 'No pending requests' : 'Pending & processing'}
            </span>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div className="card-content">
            <h3>Active Cases</h3>
            <p className="card-value">{activeCases}</p>
            <span className="card-change">Confirmed & pending appointments</span>
          </div>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="recent-activities">
          <h2>Recent Activities</h2>
          <div className="activities-table">
            <table>
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentActivities.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No recent activity</td></tr>
                ) : (
                  recentActivities.map(activity => (
                    <tr key={activity.id}>
                      <td>{activity.patient}</td>
                      <td>{activity.lastUpdate}</td>
                      <td>
                        <span className={`status-badge ${activity.status?.toLowerCase()}`}>
                          {activity.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
