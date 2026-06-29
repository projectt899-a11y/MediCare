import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLabRequestsStore } from '../../store/labRequestsStore';
import { useAuthStore } from '../../store/authStore';
import '../../styles/labResponsive.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ProcessingList: React.FC = () => {
  const navigate = useNavigate();
  const { requests, isLoading, fetchRequests, setLabId } = useLabRequestsStore();
  const accessToken = useAuthStore((s) => s.accessToken);

  // Track which request IDs already have a submitted result
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const labId = localStorage.getItem('labId');
    if (labId) setLabId(labId);
    fetchRequests();
  }, [fetchRequests, setLabId]);

  const processingRequests = requests.filter((r) => r.status === 'Processing');

  // After requests load, check which ones already have a result
  useEffect(() => {
    if (processingRequests.length === 0) return;

    const checkResults = async () => {
      const results = await Promise.all(
        processingRequests.map(async (r) => {
          try {
            const res = await fetch(`${API_BASE_URL}/labs/results/request/${r.id}`, {
              headers: { Authorization: `Bearer ${accessToken || ''}` },
            });
            // 200 = result exists, 404 = no result yet
            return { id: r.id, hasResult: res.ok };
          } catch {
            return { id: r.id, hasResult: false };
          }
        })
      );
      const ids = new Set(results.filter((r) => r.hasResult).map((r) => r.id));
      setSubmittedIds(ids);
    };

    checkResults();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, accessToken]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="lab-requests-inbox">
      <div className="lab-inbox-header">
        <h1>Processing</h1>
      </div>

      <div className="lab-results-info">
        <p>
          <strong>{processingRequests.length}</strong> request
          {processingRequests.length !== 1 ? 's' : ''} in progress
        </p>
      </div>

      <div className="lab-card">
        <div className="lab-table-container">
          {isLoading ? (
            <div className="lab-empty-state">
              <p>Loading…</p>
            </div>
          ) : processingRequests.length > 0 ? (
            <table className="lab-table lab-requests-table">
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Doctor Name</th>
                  <th>Test Type</th>
                  <th>Priority</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {processingRequests.map((request) => {
                  const hasResult = submittedIds.has(request.id);
                  return (
                    <tr key={request.id}>
                      <td>{request.patient_name}</td>
                      <td>{request.doctor_name}</td>
                      <td>{request.test_type}</td>
                      <td>
                        <span
                          className={`lab-badge ${
                            request.priority === 'Urgent'
                              ? 'lab-badge-danger'
                              : 'lab-badge-primary'
                          }`}
                        >
                          {request.priority}
                        </span>
                      </td>
                      <td>{formatDate(request.created_at)}</td>
                      <td>
                        <button
                          className={`lab-btn lab-btn-sm ${hasResult ? '' : 'lab-btn-primary'}`}
                          style={hasResult ? { backgroundColor: '#f97316', color: '#fff', border: 'none' } : {}}
                          onClick={() => navigate(`/lab/processing/${request.id}`)}
                          aria-label={
                            hasResult
                              ? `Edit result for ${request.patient_name}`
                              : `Submit result for ${request.patient_name}`
                          }
                        >
                          {hasResult ? 'Edit Result' : 'Submit Result'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="lab-empty-state">
              <p>No requests currently in processing</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProcessingList;
