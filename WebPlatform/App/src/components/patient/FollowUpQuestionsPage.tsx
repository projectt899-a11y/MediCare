import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import type { FollowUpRequest, FollowUpQuestion, FollowUpAnswer } from '../../types/nurse';
import { nurseApi } from '../../services/nurseApi';
import type { Nurse } from '../../types/nurse';
import FollowUpAnswerForm from './FollowUpAnswerForm';
import '../../styles/patientFollowUpQuestions.css';

interface FollowUpWithDetails extends FollowUpRequest {
  nurse_name?: string;
  questions?: FollowUpQuestion[];
  answers?: FollowUpAnswer[];
}

const FollowUpQuestionsPage: React.FC = () => {
  const { user, accessToken } = useAuthStore();
  const [followUps, setFollowUps] = useState<FollowUpWithDetails[]>([]);
  const [assignedNurses, setAssignedNurses] = useState<Nurse[]>([]);
  const [loading, setLoading] = useState(true);
  const [nursesLoading, setNursesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nursesError, setNursesError] = useState<string | null>(null);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUpWithDetails | null>(null);
  const [showAnswerForm, setShowAnswerForm] = useState(false);

  useEffect(() => {
    if (!accessToken || !user?.id) {
      const errorMsg = 'Authentication information not found. Please log in again.';
      setError(errorMsg);
      setLoading(false);
      setNursesLoading(false);
    } else {
      // Fetch both in parallel
      fetchFollowUpRequests();
      fetchAssignedNurses();
    }
  }, [accessToken, user?.id]);

  useEffect(() => {
    // Check if we need to auto-select a follow-up from notification
    const selectedId = sessionStorage.getItem('selectedFollowUpId');
    if (selectedId && followUps.length > 0) {
      const followUp = followUps.find(f => f.id === selectedId);
      if (followUp) {
        setSelectedFollowUp(followUp);
        sessionStorage.removeItem('selectedFollowUpId');
      }
    }
  }, [followUps]);

  const fetchFollowUpRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        const authError = 'Authentication information not found. Please log in again.';
        setError(authError);
        return;
      }

      // Use nurseApi to fetch follow-up requests
      const requests = await nurseApi.getFollowUpRequests({ patient_id: user.id });

      // Fetch details for each request
      const enrichedRequests = await Promise.all(
        requests.map(async (req: FollowUpRequest) => {
          try {
            const details = await nurseApi.getFollowUpRequestDetails(req.id);
            return {
              ...req,
              questions: details.questions || [],
              answers: details.answers || [],
              nurse_name: details.request?.nurse_name || req.nurse_name || 'Unknown'
            };
          } catch (err) {
            return req;
          }
        })
      );

      setFollowUps(enrichedRequests);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load follow-up requests';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignedNurses = async () => {
    try {
      setNursesLoading(true);
      setNursesError(null);

      if (!accessToken || !user?.id) {
        const authError = 'Authentication information not found. Please log in again.';
        setNursesError(authError);
        return;
      }

      const nurses = await nurseApi.getPatientNurses(user.id);
      
      const sortedNurses = sortNursesByName(nurses);
      
      setAssignedNurses(sortedNurses);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load assigned nurses';
      setNursesError(errorMsg);
    } finally {
      setNursesLoading(false);
    }
  };

  const sortNursesByName = (nurses: Nurse[]): Nurse[] => {
    return [...nurses].sort((a, b) => {
      const nameA = (a.full_name || '').toLowerCase();
      const nameB = (b.full_name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  };

  const handleViewRequest = (followUp: FollowUpWithDetails) => {
    setSelectedFollowUp(followUp);
    setShowAnswerForm(false);
  };

  const handleAnswerClick = (followUp: FollowUpWithDetails) => {
    setSelectedFollowUp(followUp);
    setShowAnswerForm(true);
  };

  const handleAnswerSubmitted = () => {
    setShowAnswerForm(false);
    setSelectedFollowUp(null);
    fetchFollowUpRequests();
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

  const formatDate = (ts: string | undefined, full = false): string => {
    if (!ts) return '';
    const normalized = ts.trim().replace(' ', 'T');
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return ts;
    if (full) {
      return d.toLocaleString(undefined, { timeZone: 'UTC' });
    }
    return d.toLocaleDateString(undefined, { timeZone: 'UTC' });
  };

  const getProgressPercentage = (followUp: FollowUpWithDetails): number => {
    const totalQuestions = (followUp.questions || []).length;
    if (totalQuestions === 0) return 0;
    const answeredQuestions = (followUp.answers || []).length;
    return Math.round((answeredQuestions / totalQuestions) * 100);
  };

  if (loading) {
    return (
      <div className="follow-up-questions-page">
        <div className="loading-message">Loading follow-up requests...</div>
      </div>
    );
  }

  if (showAnswerForm && selectedFollowUp) {
    return (
      <FollowUpAnswerForm
        followUpRequest={selectedFollowUp}
        onSuccess={handleAnswerSubmitted}
        onCancel={() => {
          setShowAnswerForm(false);
          setSelectedFollowUp(null);
        }}
      />
    );
  }

  if (selectedFollowUp) {
    return (
      <div className="follow-up-questions-page">
        <div className="back-button">
          <button onClick={() => setSelectedFollowUp(null)}>← Back to List</button>
        </div>

        <div className="request-details">
          <div className="details-header">
            <h2>Follow-up Request Details</h2>
            <span className={`status-badge ${getStatusBadgeClass(selectedFollowUp.status)}`}>
              {selectedFollowUp.status}
            </span>
          </div>

          <div className="request-info">
            <div className="info-row">
              <span className="label">Nurse:</span>
              <span className="value">{selectedFollowUp.nurse_name || '—'}</span>
            </div>
            <div className="info-row">
              <span className="label">Created:</span>
              <span className="value">
                {formatDate(selectedFollowUp.created_at, true)}
              </span>
            </div>
            {selectedFollowUp.deadline && (
              <div className="info-row">
                <span className="label">Deadline:</span>
                <span className="value">{formatDate(selectedFollowUp.deadline, true)}</span>
              </div>
            )}
          </div>

          <div className="questions-section">
            <h3>Questions</h3>
            <div className="questions-list">
              {(selectedFollowUp.questions || []).map((question, index) => {
                const hasAnswer = (selectedFollowUp.answers || []).some(
                  a => (a.follow_up_question_id || a.question_id) === question.id
                );
                const answer = (selectedFollowUp.answers || []).find(
                  a => (a.follow_up_question_id || a.question_id) === question.id
                );

                return (
                  <div key={question.id} className="question-item">
                    <div className="question-header">
                      <span className="question-number">Q{question.question_order || index + 1}</span>
                      <span className={`answer-status ${hasAnswer ? 'answered' : 'pending'}`}>
                        {hasAnswer ? '✓ Answered' : '○ Pending'}
                      </span>
                    </div>
                    <p className="question-text">{question.question_text || question.question}</p>
                    {answer && (
                      <div className="answer-display">
                        <p className="answer-label">Your Answer:</p>
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

          {selectedFollowUp.status !== 'completed' && (
            <div className="action-buttons">
              {(() => {
                const questions = selectedFollowUp.questions || [];
                const answers = selectedFollowUp.answers || [];
                const allAnswered = questions.length > 0 && questions.every(
                  q => answers.some(a => (a.follow_up_question_id || a.question_id) === q.id)
                );
                return (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleAnswerClick(selectedFollowUp)}
                  >
                    {allAnswered ? 'Edit Answers' : 'Answer Questions'}
                  </button>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="follow-up-questions-page">
      <div className="page-header">
        <h1>Follow-Up Questions</h1>
        <p className="page-subtitle">View and respond to follow-up questions from your assigned nurses</p>
      </div>

      {/* Assigned Nurses Section */}
      <section className="assigned-nurses-section" aria-label="Assigned Nurses">
        <h2 className="assigned-nurses-header">Assigned Nurses</h2>
        
        {nursesLoading && (
          <div className="nurses-loading" role="status" aria-live="polite">
            <div className="spinner"></div>
            <p>Loading assigned nurses...</p>
          </div>
        )}

        {nursesError && !nursesLoading && (
          <div className="nurses-error" role="alert">
            <p>{nursesError}</p>
            <button 
              onClick={fetchAssignedNurses} 
              className="retry-btn"
              aria-label="Retry loading assigned nurses"
            >
              Retry
            </button>
          </div>
        )}

        {!nursesLoading && !nursesError && assignedNurses.length === 0 && (
          <div className="nurses-empty">
            <p>No assigned nurses at this time</p>
          </div>
        )}

        {!nursesLoading && !nursesError && assignedNurses.length > 0 && (
          <div className="nurses-grid">
            {assignedNurses.map(nurse => (
              <article key={nurse.id} className="nurse-card">
                <h3 className="nurse-card-header">{nurse.full_name}</h3>
                <div className="nurse-card-body">
                  <div className="nurse-info-item">
                    <span className="nurse-info-label">Phone</span>
                    <span className="nurse-info-value">
                      {nurse.phone_number || 'Not provided'}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Follow-Up Requests Section */}
      {error && (
        <div className="error-message-container">
          <div className="error-message">{error}</div>
          <button onClick={fetchFollowUpRequests} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {followUps.length === 0 ? (
        <div className="no-requests">
          <p>No follow-up requests at this time</p>
        </div>
      ) : (
        <div className="requests-grid">
          {followUps.map(followUp => {
            const progress = getProgressPercentage(followUp);
            return (
              <div key={followUp.id} className="request-card">
                <div className="card-header">
                  <h3>{followUp.nurse_name || 'Nurse'}</h3>
                  <span className={`status-badge ${getStatusBadgeClass(followUp.status)}`}>
                    {followUp.status}
                  </span>
                </div>

                <div className="card-body">
                  <div className="info-item">
                    <span className="label">Created:</span>
                    <span className="value">{formatDate(followUp.created_at)}</span>
                  </div>

                  <div className="info-item">
                    <span className="label">Questions:</span>
                    <span className="value">{(followUp.questions || []).length}</span>
                  </div>

                  <div className="progress-section">
                    <div className="progress-label">
                      <span>Progress</span>
                      <span className="progress-percent">{progress}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>

                  {followUp.deadline && (
                    <div className="deadline-info">
                      <span className="label">Deadline:</span>
                      <span className="value">{formatDate(followUp.deadline)}</span>
                    </div>
                  )}
                </div>

                <div className="card-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleViewRequest(followUp)}
                  >
                    View Details
                  </button>
                  {followUp.status !== 'completed' && (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleAnswerClick(followUp)}
                    >
                      {(followUp.questions || []).length > 0 &&
                       (followUp.questions || []).every(q =>
                         (followUp.answers || []).some(a => (a.follow_up_question_id || a.question_id) === q.id)
                       )
                        ? 'Edit'
                        : 'Answer'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FollowUpQuestionsPage;
