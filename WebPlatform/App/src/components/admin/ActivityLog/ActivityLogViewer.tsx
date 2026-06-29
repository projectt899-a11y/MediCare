import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import LoginHistoryTable from './LoginHistoryTable';
import AppointmentHistoryTable from './AppointmentHistoryTable';
import ProfileChangeHistoryTable from './ProfileChangeHistoryTable';

interface ActivityLogViewerProps {
  userId: string;
}

interface Activity {
  id: string;
  userId: string;
  activityType: 'login' | 'logout' | 'appointment_booked' | 'profile_changed' | 'bulk_action';
  description: string;
  metadata: Record<string, any>;
  createdAt: Date;
  createdBy?: string;
}

interface LoginSession {
  id: string;
  userId: string;
  loginTime: Date;
  logoutTime?: Date;
  duration?: number;
  ipAddress: string;
  userAgent?: string;
  isActive: boolean;
}

interface AppointmentRecord {
  id: string;
  userId: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: Date;
  appointmentTime: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: Date;
}

interface ProfileChange {
  id: string;
  userId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  isSensitive: boolean;
  changedBy: string;
  changedByName: string;
  changedAt: Date;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const ActivityLogViewer: React.FC<ActivityLogViewerProps> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'login' | 'appointment' | 'profile'>('all');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loginSessions, setLoginSessions] = useState<LoginSession[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [profileChanges, setProfileChanges] = useState<ProfileChange[]>([]);
  const [userType, setUserType] = useState<'doctor' | 'patient'>('patient');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    fetchActivityLogs();
  }, [userId, activeTab, pagination.page]);

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'all') {
        const response = await api.get(`/admin/users/${userId}/activity-log`, {
          params: {
            page: pagination.page,
            limit: pagination.limit
          }
        });
        const rawActivities = response.data.data.activities || [];
        const mappedActivities = rawActivities.map((activity: any) => ({
          id: activity.id,
          userId: activity.user_id,
          activityType: activity.activity_type,
          description: activity.description,
          metadata: activity.metadata,
          createdAt: activity.created_at,
          createdBy: activity.created_by
        }));
        setActivities(mappedActivities);
        setPagination(response.data.data.pagination || pagination);
      } else if (activeTab === 'login') {
        const response = await api.get(`/admin/users/${userId}/login-history`, {
          params: {
            page: pagination.page,
            limit: pagination.limit
          }
        });
        const rawSessions = response.data.data.sessions || [];
        const mappedSessions = rawSessions.map((session: any) => ({
          id: session.id,
          userId: session.user_id,
          loginTime: session.login_time,
          logoutTime: session.logout_time,
          ipAddress: session.ip_address,
          userAgent: session.user_agent,
          isActive: session.is_active
        }));
        setLoginSessions(mappedSessions);
        setPagination(response.data.data.pagination || pagination);
      } else if (activeTab === 'appointment') {
        const response = await api.get(`/admin/users/${userId}/appointments`, {
          params: {
            page: pagination.page,
            limit: pagination.limit
          }
        });
        const rawAppointments = response.data.data.appointments || [];
        const mappedAppointments = rawAppointments.map((apt: any) => ({
          id: apt.id,
          userId: apt.patient_id || apt.user_id,
          doctorId: apt.doctor_id,
          doctorName: apt.doctorName || apt.doctor_name || 'Unknown Doctor',
          appointmentDate: apt.appointment_date || apt.appointment_time,
          appointmentTime: apt.appointment_time,
          status: apt.status,
          createdAt: apt.created_at
        }));
        setAppointments(mappedAppointments);
        setUserType(response.data.data.userType || 'patient');
        setPagination(response.data.data.pagination || pagination);
      } else if (activeTab === 'profile') {
        const response = await api.get(`/admin/users/${userId}/profile-changes`, {
          params: {
            page: pagination.page,
            limit: pagination.limit
          }
        });
        const rawChanges = response.data.data.changes || [];
        const mappedChanges = rawChanges.map((change: any) => ({
          id: change.id,
          userId: change.user_id,
          fieldName: change.field_name,
          oldValue: change.old_value,
          newValue: change.new_value,
          isSensitive: change.is_sensitive,
          changedBy: change.changed_by,
          changedByName: change.changed_by_name,
          changedAt: change.changed_at
        }));
        setProfileChanges(mappedChanges);
        setPagination(response.data.data.pagination || pagination);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load activity logs');
      console.error('Error fetching activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination({ ...pagination, page: newPage });
  };

  return (
    <div className="activity-log-viewer">
      <div className="activity-log-header">
        <h3>Activity Log</h3>
      </div>

      <div className="activity-log-tabs">
        <button
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('all');
            setPagination({ ...pagination, page: 1 });
          }}
        >
          <i className="fa-solid fa-list"></i> All Activities
        </button>
        <button
          className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('login');
            setPagination({ ...pagination, page: 1 });
          }}
        >
          <i className="fa-solid fa-sign-in-alt"></i> Login History
        </button>
        <button
          className={`tab-btn ${activeTab === 'appointment' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('appointment');
            setPagination({ ...pagination, page: 1 });
          }}
        >
          <i className="fa-solid fa-calendar"></i> Appointments
        </button>
        <button
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('profile');
            setPagination({ ...pagination, page: 1 });
          }}
        >
          <i className="fa-solid fa-user-edit"></i> Profile Changes
        </button>
      </div>

      {error && <div className="activity-log-error">{error}</div>}

      {loading ? (
        <div className="activity-log-loading">Loading activity logs...</div>
      ) : (
        <>
          {activeTab === 'all' && (
            <div className="activity-log-content">
              {activities.length === 0 ? (
                <div className="activity-log-empty">No activities found</div>
              ) : (
                <div className="activity-list">
                  {activities.map((activity) => (
                    <div key={activity.id} className="activity-item">
                      <div className="activity-icon">
                        {activity.activityType === 'login' && <i className="fa-solid fa-sign-in-alt"></i>}
                        {activity.activityType === 'logout' && <i className="fa-solid fa-sign-out-alt"></i>}
                        {activity.activityType === 'appointment_booked' && <i className="fa-solid fa-calendar"></i>}
                        {activity.activityType === 'profile_changed' && <i className="fa-solid fa-user-edit"></i>}
                        {activity.activityType === 'bulk_action' && <i className="fa-solid fa-cogs"></i>}
                      </div>
                      <div className="activity-details">
                        <div className="activity-type">{(activity.activityType || '').replace(/_/g, ' ')}</div>
                        <div className="activity-description">{activity.description || 'No description'}</div>
                        <div className="activity-time">
                          {new Date(activity.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'login' && (
            <LoginHistoryTable sessions={loginSessions} />
          )}

          {activeTab === 'appointment' && (
            <AppointmentHistoryTable appointments={appointments} userType={userType} />
          )}

          {activeTab === 'profile' && (
            <ProfileChangeHistoryTable changes={profileChanges} />
          )}

          {pagination.pages > 1 && (
            <div className="activity-log-pagination">
              <button
                disabled={pagination.page === 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                ← Previous
              </button>

              <span className="page-info">
                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </span>

              <button
                disabled={pagination.page === pagination.pages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ActivityLogViewer;
