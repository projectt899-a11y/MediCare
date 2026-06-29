import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { nurseApi } from '../../services/nurseApi';
import type { FollowUpRequest, FollowUpQuestion, FollowUpAnswer } from '../../types/nurse';
import '../../styles/followUpAnswerForm.css';

interface FollowUpAnswerFormProps {
  followUpRequest: FollowUpRequest & {
    questions?: FollowUpQuestion[];
    answers?: FollowUpAnswer[];
  };
  onSuccess: () => void;
  onCancel: () => void;
}

const FollowUpAnswerForm: React.FC<FollowUpAnswerFormProps> = ({
  followUpRequest,
  onSuccess,
  onCancel
}) => {
  const { user, accessToken } = useAuthStore();

  // Pre-populate with existing answers so patient sees their previous responses when editing
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const existing: Record<string, string> = {};
    const existingAnswers = followUpRequest.answers || [];
    (followUpRequest.questions || []).forEach(question => {
      const found = existingAnswers.find(
        a => (a.follow_up_question_id || a.question_id) === question.id
      );
      if (found) {
        existing[question.id] = found.answer_text || found.answer || '';
      }
    });
    return existing;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const questions = followUpRequest.questions || [];

    questions.forEach(question => {
      if (!answers[question.id]?.trim()) {
        newErrors[question.id] = 'This question is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
    // Clear error for this question
    if (errors[questionId]) {
      setErrors(prev => ({
        ...prev,
        [questionId]: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage('');

    try {
      if (!user?.id) {
        setError('Authentication information not found. Please log in again.');
        return;
      }

      const questions = followUpRequest.questions || [];

      // Submit each answer
      for (const question of questions) {
        const answerText = answers[question.id];
        if (answerText?.trim()) {
          await nurseApi.submitFollowUpAnswer({
            follow_up_question_id: question.follow_up_question_id || question.id,
            patient_id: user.id,
            answer_text: answerText.trim()
          });
        }
      }

      setSuccessMessage('All answers submitted successfully!');
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      // Handle network errors
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'An error occurred while submitting answers');
      }
      console.error('Error submitting answers:', err);
    } finally {
      setLoading(false);
    }
  };

  const questions = followUpRequest.questions || [];
  const isEditMode = questions.length > 0 && questions.every(q =>
    (followUpRequest.answers || []).some(a => (a.follow_up_question_id || a.question_id) === q.id)
  );

  return (
    <div className="follow-up-answer-form">
      <div className="form-header">
        <h2>{isEditMode ? 'Edit Answers' : 'Answer Follow-up Questions'}</h2>
        <button className="close-btn" onClick={onCancel} aria-label="Close">×</button>
      </div>

      <div className="form-alerts">
        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-body">
          <div className="questions-container">
            {questions.map((question, index) => (
              <div key={question.id} className="question-form-item">
                <div className="question-header">
                  <span className="question-badge">Q{question.question_order || index + 1}</span>
                  <span className="required-mark" aria-hidden="true">*</span>
                </div>

                <p className="question-text">{question.question_text || question.question}</p>

                <textarea
                  className={`answer-textarea${errors[question.id] ? ' textarea-error' : ''}`}
                  value={answers[question.id] || ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  placeholder="Enter your answer here..."
                  disabled={loading}
                  rows={4}
                  aria-label={`Answer for question ${question.question_order || index + 1}`}
                />

                {errors[question.id] && (
                  <span className="field-error" role="alert">{errors[question.id]}</span>
                )}
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} disabled={loading} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Submit Answers'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default FollowUpAnswerForm;
