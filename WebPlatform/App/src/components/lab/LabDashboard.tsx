import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLabDashboardStore } from '../../store/labDashboardStore';
import '../../styles/labResponsive.css';
import './LabDashboard.css';

const LabHome: React.FC = () => {
  const navigate = useNavigate();
  const {
    stats,
    recentRequests,
    isLoading,
    setLabId,
    fetchDashboardData,
    refreshDashboard,
  } = useLabDashboardStore();

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const labId = localStorage.getItem('labId');
    if (labId) {
      setLabId(labId);
      fetchDashboardData();
    }
  }, [setLabId, fetchDashboardData]);

  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      refreshDashboard();
    }, 30000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [refreshDashboard]);

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'Pending':   return 'lab-badge-warning';
      case 'Processing': return 'lab-badge-primary';
      case 'Completed': return 'lab-badge-success';
      case 'Rejected':  return 'lab-badge-danger';
      default:          return 'lab-badge-primary';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="lab-home">
      <div className="lab-home-header">
        <h1>Lab Home</h1>
        <div className="lab-home-controls">
          <button
            className="lab-btn lab-btn-secondary"
            onClick={refreshDashboard}
            disabled={isLoading}
            aria-label="Refresh dashboard"
          >
            {isLoading ? (
              <><span className="lab-spinner"></span>Refreshing...</>
            ) : (
              <><span className="lab-icon">↻</span>Refresh</>
            )}
          </button>
          {isLoading && <span className="lab-loading-indicator">Updating...</span>}
        </div>
      </div>

      {/* Summary Statistics Cards */}
      <section className="lab-home-section">
        <h2 className="lab-home-section-title">Summary Statistics</h2>
        <div className="lab-home-grid-4">

          <div className="lab-home-card lab-home-stat-card">
            <div className="lab-home-stat-icon lab-home-stat-icon-primary">
              <span>📋</span>
            </div>
            <div className="lab-home-card-body">
              <h3 className="lab-home-card-title">Total Requests</h3>
              <p className="lab-home-stat-value">{stats.total_requests}</p>
            </div>
          </div>

          <div className="lab-home-card lab-home-stat-card">
            <div className="lab-home-stat-icon lab-home-stat-icon-warning">
              <span>⏳</span>
            </div>
            <div className="lab-home-card-body">
              <h3 className="lab-home-card-title">Pending</h3>
              <p className="lab-home-stat-value lab-home-stat-value-warning">
                {stats.pending_requests}
              </p>
            </div>
          </div>

          <div className="lab-home-card lab-home-stat-card">
            <div className="lab-home-stat-icon lab-home-stat-icon-info">
              <span>⚙️</span>
            </div>
            <div className="lab-home-card-body">
              <h3 className="lab-home-card-title">Processing</h3>
              <p className="lab-home-stat-value lab-home-stat-value-info">
                {stats.processing_requests}
              </p>
            </div>
          </div>

          <div className="lab-home-card lab-home-stat-card">
            <div className="lab-home-stat-icon lab-home-stat-icon-success">
              <span>✓</span>
            </div>
            <div className="lab-home-card-body">
              <h3 className="lab-home-card-title">Completed Today</h3>
              <p className="lab-home-stat-value lab-home-stat-value-success">
                {stats.completed_today}
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Recent Requests Table */}
      <section className="lab-home-section">
        <h2 className="lab-home-section-title">Recent Requests</h2>
        <div className="lab-home-card">
          <div className="lab-table-container">
            {recentRequests.length > 0 ? (
              <table className="lab-table">
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Test Type</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.map((request) => (
                    <tr key={request.id}>
                      <td>{request.patient_name}</td>
                      <td>{request.test_type}</td>
                      <td>
                        <span className={`lab-badge ${getStatusBadgeClass(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td>{formatDate(request.created_at)}</td>
                      <td>
                        <button
                          className="lab-btn lab-btn-sm"
                          onClick={() => navigate(`/lab/request/${request.id}`)}
                          aria-label={`View request for ${request.patient_name}`}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="lab-home-empty-state">
                <p>No recent requests</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LabHome;
