import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import Icon from '../admin/Icon';
import '../../styles/nurseDashboard.css';

interface DashboardStats {
  total_patients: number;
  completed_follow_ups: number;
}

interface RecentActivity {
  id: string;
  type: 'patient_assigned' | 'follow_up_created' | 'answer_received';
  description: string;
  timestamp: string;
}

const NurseDashboard: React.FC = () => {
  const user = useAuthStore(state => state.user);
  const accessToken = useAuthStore(state => state.accessToken);
  const [stats, setStats] = useState<DashboardStats>({
    total_patients: 0,
    completed_follow_ups: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Add delay to ensure store is hydrated from localStorage
    const timer = setTimeout(() => {
      if (user?.id && accessToken) {
        fetchDashboardData();
      } else if (!accessToken) {
        setError('Authentication token not found. Please log in again.');
        setLoading(false);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [user?.id, accessToken]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!accessToken || !user?.id) {
        setError('Authentication information not found. Please log in again.');
        return;
      }

      // Fetch dashboard statistics
      const statsResponse = await fetch(
        `http://localhost:5000/api/nurses/${user.id}/dashboard/stats`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!statsResponse.ok) {
        try {
          const errorData = await statsResponse.json();
          const errorMessage = errorData.message || errorData.error || 'Failed to fetch dashboard statistics';
          throw new Error(errorMessage);
        } catch (parseError) {
          // Handle non-JSON error responses
          if (statsResponse.status === 401) {
            throw new Error('Unauthorized. Please log in again.');
          } else if (statsResponse.status === 403) {
            throw new Error('You do not have permission to view dashboard');
          } else if (statsResponse.status === 500) {
            throw new Error('Server error. Please try again later.');
          } else {
            throw new Error('Failed to fetch dashboard statistics. Please try again.');
          }
        }
      }

      const statsData = await statsResponse.json();
      setStats(statsData.data || statsData);

      // Fetch recent activities
      const activitiesResponse = await fetch(
        `http://localhost:5000/api/nurses/${user.id}/recent-activities`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        setRecentActivities(activitiesData.data || []);
      }
    } catch (err: any) {
      // Handle network errors
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'Failed to load dashboard data');
      }
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string): string => {
    switch (type) {
      case 'patient_assigned':
        return 'users';
      case 'follow_up_created':
        return 'clipboard';
      case 'answer_received':
        return 'check-circle';
      default:
        return 'activity';
    }
  };

  if (loading) {
    return (
      <div className="nurse-dashboard">
        <div className="loading-message">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="nurse-dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {user?.fullName || 'Nurse'}!</h1>
        <p className="dashboard-subtitle">Here's your workload overview</p>
      </div>

      {error && (
        <div className="error-message-container">
          <div className="error-message">{error}</div>
          <button onClick={fetchDashboardData} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon patients">
            <Icon name="users" className="icon-svg" />
          </div>
          <div className="stat-content">
            <h3>Total Patients</h3>
            <p className="stat-value">{stats.total_patients}</p>
            <span className="stat-label">Assigned to you</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon completed">
            <Icon name="check-circle" className="icon-svg" />
          </div>
          <div className="stat-content">
            <h3>Completed Follow-ups</h3>
            <p className="stat-value">{stats.completed_follow_ups}</p>
            <span className="stat-label">All questions answered</span>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="recent-activities-section">
        <div className="section-header">
          <h2>Recent Activities</h2>
          <button className="refresh-btn" onClick={fetchDashboardData}>
            <Icon name="refresh-cw" className="icon-svg" />
            Refresh
          </button>
        </div>

        {recentActivities.length === 0 ? (
          <div className="no-activities">
            <p>No recent activities</p>
          </div>
        ) : (
          <div className="activities-list">
            {recentActivities.map(activity => (
              <div key={activity.id} className="activity-item">
                <span className="activity-icon">
                  <Icon name={getActivityIcon(activity.type)} className="icon-svg" />
                </span>
                <div className="activity-content">
                  <p className="activity-description">{activity.description}</p>
                  <span className="activity-time">
                    {new Date(activity.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NurseDashboard;
