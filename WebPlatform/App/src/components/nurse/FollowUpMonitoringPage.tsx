import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import ReportExportButton from './ReportExportButton';
import Icon from '../admin/Icon';
import type { FollowUpRequest, FollowUpQuestion, FollowUpAnswer } from '../../types/nurse';
import '../../styles/followUpMonitoring.css';

interface FollowUpWithDetails extends FollowUpRequest {
  patient_name?: string;
  questions?: FollowUpQuestion[];
  answers?: FollowUpAnswer[];
  response_count?: number;
  nurse_notes?: string;
}

interface Filters {
  search: string;
}

const FollowUpMonitoringPage: React.FC = () => {
  const user = useAuthStore(state => state.user);
  const accessToken = useAuthStore(state => state.accessToken);
  const [followUps, setFollowUps] = useState<FollowUpWithDetails[]>([]);
  const [filteredFollowUps, setFilteredFollowUps] = useState<FollowUpWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUpWithDetails | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: ''
  });
  const [editingNotes, setEditingNotes] = useState(false);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    // Add delay to ensure store is hydrated from localStorage
    const timer = setTimeout(() => {
      if (user?.id && accessToken) {
        fetchFollowUpRequests();
      } else if (!accessToken) {
        setError('Authentication information not found. Please log in again.');
        setLoading(false);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [user?.id, accessToken]);

  useEffect(() => {
    applyFilters();
  }, [followUps, filters]);

  const fetchFollowUpRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!accessToken || !user?.id) {
        setError('Authentication information not found. Please log in again.');
        return;
      }

      const response = await fetch(
        `http://localhost:5000/api/nurses/follow-up-requests`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.message || errorData.error || 'Failed to fetch follow-up requests';
          throw new Error(errorMessage);
        } catch (parseError) {
          // Handle non-JSON error responses
          if (response.status === 401) {
            throw new Error('Unauthorized. Please log in again.');
          } else if (response.status === 403) {
            throw new Error('You do not have permission to view follow-up requests');
          } else if (response.status === 500) {
            throw new Error('Server error. Please try again later.');
          } else {
            throw new Error('Failed to fetch follow-up requests. Please try again.');
          }
        }
      }

      const data = await response.json();
      const requests = data.data?.requests || [];

      // Fetch details for each request
      const enrichedRequests = await Promise.all(
        requests.map(async (req: FollowUpRequest) => {
          try {
            const detailsResponse = await fetch(
              `http://localhost:5000/api/nurses/follow-up-requests/${req.id}`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`
                }
              }
            );

            if (detailsResponse.ok) {
              const detailsData = await detailsResponse.json();
              const details = detailsData.data || detailsData;
              return {
                ...req,
                questions: details.questions || [],
                answers: details.answers || [],
                response_count: (details.answers || []).length
              };
            }
          } catch (err) {
            console.error('Error fetching request details:', err);
          }
          return req;
        })
      );

      setFollowUps(enrichedRequests);
    } catch (err: any) {
      // Handle network errors
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'Failed to load follow-up requests');
      }
      console.error('Error fetching follow-up requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...followUps];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(f =>
        (f.patient_name || '').toLowerCase().includes(searchLower)
      );
    }

    setFilteredFollowUps(result);
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleViewDetails = (followUp: FollowUpWithDetails) => {
    setSelectedFollowUp(followUp);
    setNoteText(followUp.nurse_notes || '');
    setEditingNotes(false);
    setShowDetails(true);
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'completed':
        return 'status-completed';
      case 'overdue':
        return 'status-overdue';
      default:
        return '';
    }
  };

  const getQuestionResponseStatus = (question: FollowUpQuestion, answers: FollowUpAnswer[]): string => {
    const hasAnswer = answers.some(a => (a.follow_up_question_id || a.question_id) === question.id);
    if (hasAnswer) return 'answered';
    return 'pending';
  };

  const handleSaveNotes = async () => {
    if (!selectedFollowUp || !accessToken) return;

    try {
      const response = await fetch(
        `http://localhost:5000/api/nurses/follow-up-requests/${selectedFollowUp.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nurse_notes: noteText || null
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save notes');
      }

      // Update the selected follow-up with new notes
      setSelectedFollowUp({
        ...selectedFollowUp,
        nurse_notes: noteText
      });

      // Update in the list
      setFollowUps(followUps.map(f =>
        f.id === selectedFollowUp.id
          ? { ...f, nurse_notes: noteText }
          : f
      ));

      setEditingNotes(false);
    } catch (err: any) {
      console.error('Error saving notes:', err);
      alert('Failed to save notes: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="follow-up-monitoring-page">
        <div className="loading-message">Loading follow-up requests...</div>
      </div>
    );
  }

  return (
    <div className="follow-up-monitoring-page">
      <div className="page-header">
        <h1>Follow-up Monitoring</h1>
        <p className="page-subtitle">Track and manage all follow-up requests</p>
      </div>

      {error && (
        <div className="error-message-container">
          <div className="error-message">{error}</div>
          <button onClick={fetchFollowUpRequests} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label htmlFor="search-input">Search:</label>
          <input
            id="search-input"
            type="text"
            placeholder="Search by patient name..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>

        <button onClick={fetchFollowUpRequests} className="refresh-btn">
          <Icon name="refresh-cw" className="icon-svg" />
          Refresh
        </button>
      </div>

      {/* Follow-up Requests Table */}
      <div className="table-container">
        <table className="follow-ups-table">
          <thead>
            <tr>
              <th>Patient Name</th>
              <th>Request Date</th>
              <th>Response Count</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredFollowUps.length === 0 ? (
              <tr>
                <td colSpan={4} className="no-data">
                  {followUps.length === 0 ? 'No follow-up requests yet' : 'No follow-up requests match your filters'}
                </td>
              </tr>
            ) : (
              filteredFollowUps.map(followUp => (
                <tr key={followUp.id}>
                  <td className="patient-name">{followUp.patient_name || 'Unknown'}</td>
                  <td>{new Date(followUp.created_at).toLocaleDateString()}</td>
                  <td className="response-count">
                    {followUp.response_count || 0} / {(followUp.questions || []).length}
                  </td>
                  <td>
                    <button
                      className="action-btn view-btn"
                      onClick={() => handleViewDetails(followUp)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {showDetails && selectedFollowUp && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Follow-up Request Details</h2>
              <button className="close-btn" onClick={() => setShowDetails(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="modal-actions">
                <ReportExportButton
                  followUpId={selectedFollowUp.id}
                  patientName={selectedFollowUp.patient_name || 'Patient'}
                />
              </div>

              <div className="detail-section">
                <h3>Request Information</h3>
                <div className="detail-row">
                  <span className="label">Patient:</span>
                  <span className="value">{selectedFollowUp.patient_name || 'Unknown'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Created:</span>
                  <span className="value">{new Date(selectedFollowUp.created_at).toLocaleString()}</span>
                </div>
                {selectedFollowUp.deadline && (
                  <div className="detail-row">
                    <span className="label">Deadline:</span>
                    <span className="value">{new Date(selectedFollowUp.deadline).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="detail-section">
                <h3>Questions & Responses</h3>
                <div className="questions-list">
                  {(selectedFollowUp.questions || []).map((question, index) => {
                    const responseStatus = getQuestionResponseStatus(
                      question,
                      selectedFollowUp.answers || []
                    );
                    const answer = (selectedFollowUp.answers || []).find(
                      a => (a.follow_up_question_id || a.question_id) === question.id
                    );

                    return (
                      <div key={question.id} className="question-detail">
                        <div className="question-header">
                          <span className="question-number">Q{index + 1}</span>
                          <span className={`response-status status-${responseStatus}`}>
                            {responseStatus}
                          </span>
                        </div>
                        <p className="question-text">{question.question_text || question.question}</p>
                        {answer && (
                          <div className="answer-section">
                            <p className="answer-label">Patient's Answer:</p>
                            <p className="answer-text">{answer.answer_text || answer.answer}</p>
                            <p className="answer-time">
                              Answered: {new Date(answer.created_at).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="detail-section">
                <div className="notes-header">
                  <h3>Nurse Notes</h3>
                  {!editingNotes && (
                    <button
                      className="edit-notes-btn"
                      onClick={() => setEditingNotes(true)}
                    >
                      Edit
                    </button>
                  )}
                </div>

                {editingNotes ? (
                  <div className="notes-edit-form">
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Add or edit notes about this follow-up..."
                      rows={4}
                    />
                    <div className="notes-buttons">
                      <button
                        className="cancel-btn"
                        onClick={() => {
                          setEditingNotes(false);
                          setNoteText(selectedFollowUp.nurse_notes || '');
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="save-btn"
                        onClick={handleSaveNotes}
                      >
                        Save Notes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="notes-display">
                    {selectedFollowUp.nurse_notes ? (
                      <p className="notes-text">{selectedFollowUp.nurse_notes}</p>
                    ) : (
                      <p className="notes-empty">No notes added yet</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FollowUpMonitoringPage;
