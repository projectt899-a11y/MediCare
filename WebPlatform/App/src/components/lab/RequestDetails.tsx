import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLabRequestsStore } from '../../store/labRequestsStore';
import { useAuthStore } from '../../store/authStore';
import './RequestDetails.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface RequestDetailsData {
  id: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Rejected';
  priority: 'Normal' | 'Urgent';
  doctorNotes: string | null;
  rejectionReason: string | null;
  createdAt: string;
  patient: {
    name: string;
    age: number | null;
    gender: string | null;
    phone: string | null;
  } | null;
  doctor: {
    name: string;
    specialty: string | null;
    phone: string | null;
  } | null;
  testType: {
    name: string;
    description: string | null;
  } | null;
  lab: {
    name: string;
  } | null;
}

const RequestDetails: React.FC = () => {
  const navigate = useNavigate();
  const { requestId } = useParams<{ requestId: string }>();
  const { acceptRequest } = useLabRequestsStore();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [requestDetails, setRequestDetails] = useState<RequestDetailsData | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!requestId) return;

    const fetchDetails = async () => {
      setIsFetching(true);
      setFetchError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/labs/requests/${requestId}`, {
          headers: {
            Authorization: `Bearer ${accessToken || ''}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load request: ${response.statusText}`);
        }

        const json = await response.json();
        setRequestDetails(json.data);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Failed to load request details');
      } finally {
        setIsFetching(false);
      }
    };

    fetchDetails();
  }, [requestId, accessToken]);

  const handleAccept = async () => {
    if (!requestDetails) return;
    setIsLoading(true);
    try {
      await acceptRequest(requestDetails.id);
      alert('Request accepted successfully');
      navigate('/lab/inbox');
    } catch (error) {
      console.error('Failed to accept request:', error);
      alert('Failed to accept request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    if (!requestDetails) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/labs/requests/${requestDetails.id}/reject`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rejectionReason, version: 1 }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject request');
      }

      alert('Request rejected successfully');
      navigate('/lab/inbox');
    } catch (error) {
      console.error('Failed to reject request:', error);
      alert('Failed to reject request');
    } finally {
      setIsLoading(false);
      setShowRejectModal(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Pending':    return 'lab-badge-warning';
      case 'Processing': return 'lab-badge-primary';
      case 'Completed':  return 'lab-badge-success';
      case 'Rejected':   return 'lab-badge-danger';
      default:           return 'lab-badge-primary';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPhone = (phone: string | null | undefined): string => {
    if (!phone) return '—';
    // Strip the +2 country-code prefix (Egypt) and return the local number
    return phone.startsWith('+2') ? phone.slice(2) : phone;
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isFetching) {
    return (
      <div className="lab-request-details">
        <div className="lab-details-header">
          <button className="lab-back-button" onClick={() => navigate('/lab/inbox')} aria-label="Go back to inbox">
            ← Back to Inbox
          </button>
          <h1>Request Details</h1>
        </div>
        <div className="lab-details-container">
          <div className="lab-empty-state">
            <p>Loading request details…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (fetchError || !requestDetails) {
    return (
      <div className="lab-request-details">
        <div className="lab-details-header">
          <button className="lab-back-button" onClick={() => navigate('/lab/inbox')} aria-label="Go back to inbox">
            ← Back to Inbox
          </button>
          <h1>Request Details</h1>
        </div>
        <div className="lab-details-container">
          <div className="lab-empty-state">
            <p>{fetchError || 'Request not found.'}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="lab-request-details">
      <div className="lab-details-header">
        <button
          className="lab-back-button"
          onClick={() => navigate('/lab/inbox')}
          aria-label="Go back to inbox"
        >
          ← Back to Inbox
        </button>
        <h1>Request Details</h1>
      </div>

      <div className="lab-details-container">

        {/* Status Section */}
        <div className="lab-details-section lab-status-section">
          <div className="lab-status-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h3 style={{ margin: 0 }}>Status</h3>
              <span className={`lab-badge ${getStatusBadgeClass(requestDetails.status)}`}>
                {requestDetails.status}
              </span>
              {requestDetails.priority === 'Urgent' && (
                <span className="lab-badge lab-badge-danger">Urgent</span>
              )}
            </div>
            <p className="lab-request-time" style={{ fontSize: '1rem', color: '#000', fontWeight: 500, marginTop: '8px' }}>
              Request Time: {formatDate(requestDetails.createdAt)}
            </p>
          </div>
        </div>

        {/* Patient Information */}
        <div className="lab-details-section">
          <h2>Patient Information</h2>
          <div className="lab-info-grid">
            <div className="lab-info-item">
              <label>Name</label>
              <p>{requestDetails.patient?.name || '—'}</p>
            </div>
            <div className="lab-info-item">
              <label>Age</label>
              <p>{requestDetails.patient?.age != null ? `${requestDetails.patient.age} years` : '—'}</p>
            </div>
            <div className="lab-info-item">
              <label>Gender</label>
              <p>{requestDetails.patient?.gender || '—'}</p>
            </div>
            <div className="lab-info-item">
              <label>Phone</label>
              <p>{formatPhone(requestDetails.patient?.phone)}</p>
            </div>
          </div>
        </div>

        {/* Doctor Information */}
        <div className="lab-details-section">
          <h2>Doctor Information</h2>
          <div className="lab-info-grid">
            <div className="lab-info-item">
              <label>Name</label>
              <p>{requestDetails.doctor?.name || '—'}</p>
            </div>
            <div className="lab-info-item">
              <label>Specialty</label>
              <p>{requestDetails.doctor?.specialty || '—'}</p>
            </div>
            <div className="lab-info-item">
              <label>Phone</label>
              <p>{formatPhone(requestDetails.doctor?.phone)}</p>
            </div>
            {requestDetails.lab && (
              <div className="lab-info-item">
                <label>Lab</label>
                <p>{requestDetails.lab.name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Test Information */}
        <div className="lab-details-section">
          <h2>Test Information</h2>
          <div className="lab-info-grid">
            <div className="lab-info-item">
              <label>Test Type</label>
              <p>{requestDetails.testType?.name || '—'}</p>
            </div>
            {requestDetails.testType?.description && (
              <div className="lab-info-item lab-full-width">
                <label>Description</label>
                <p>{requestDetails.testType.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Doctor Notes */}
        <div className="lab-details-section">
          <h2>Doctor Notes</h2>
          <div className="lab-notes-box">
            <p>{requestDetails.doctorNotes || 'No notes provided.'}</p>
          </div>
        </div>

        {/* Rejection Reason (only shown if rejected) */}
        {requestDetails.status === 'Rejected' && requestDetails.rejectionReason && (
          <div className="lab-details-section">
            <h2>Rejection Reason</h2>
            <div className="lab-notes-box">
              <p>{requestDetails.rejectionReason}</p>
            </div>
          </div>
        )}

        {/* Action Buttons — only for Pending requests */}
        {requestDetails.status === 'Pending' && (
          <div className="lab-details-actions">
            <button
              className="lab-btn lab-btn-primary"
              onClick={handleAccept}
              disabled={isLoading}
              aria-label="Accept request"
            >
              {isLoading ? 'Processing…' : 'Accept Request'}
            </button>
            <button
              className="lab-btn lab-btn-danger"
              onClick={() => setShowRejectModal(true)}
              disabled={isLoading}
              aria-label="Reject request"
            >
              Reject Request
            </button>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="lab-modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="lab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lab-modal-header">
              <h2>Reject Request</h2>
              <button
                className="lab-modal-close"
                onClick={() => setShowRejectModal(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="lab-modal-body">
              <p>Please provide a reason for rejecting this request:</p>
              <textarea
                className="lab-textarea"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={5}
                aria-label="Rejection reason"
              />
            </div>
            <div className="lab-modal-footer">
              <button
                className="lab-btn lab-btn-secondary"
                onClick={() => setShowRejectModal(false)}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className="lab-btn lab-btn-danger"
                onClick={handleReject}
                disabled={isLoading || !rejectionReason.trim()}
              >
                {isLoading ? 'Processing…' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestDetails;
