import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import '../../styles/followUpForm.css';

interface Question {
  id: string;
  text: string;
  order: number;
}

interface FollowUpRequestFormProps {
  patientId: string;
  patientName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const FollowUpRequestForm: React.FC<FollowUpRequestFormProps> = ({
  patientId,
  patientName,
  onSuccess,
  onCancel
}) => {
  const user = useAuthStore(state => state.user);
  const [questions, setQuestions] = useState<Question[]>([
    { id: '1', text: '', order: 1 }
  ]);
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      text: '',
      order: questions.length + 1
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length > 1) {
      const updated = questions.filter(q => q.id !== id);
      // Reorder
      updated.forEach((q, index) => {
        q.order = index + 1;
      });
      setQuestions(updated);
    }
  };

  const updateQuestion = (id: string, text: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, text } : q));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Check if at least one question has text
    const hasValidQuestion = questions.some(q => q.text.trim());
    if (!hasValidQuestion) {
      newErrors.questions = 'At least one question is required';
    }

    // Validate each question
    questions.forEach((q, index) => {
      if (q.text.trim() && q.text.trim().length < 5) {
        newErrors[`question_${q.id}`] = 'Question must be at least 5 characters';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token || !user?.id) {
        setError('Authentication information not found. Please log in again.');
        return;
      }

      // Filter out empty questions
      const validQuestions = questions
        .filter(q => q.text.trim())
        .map((q, index) => ({
          question_text: q.text.trim(),
          question_order: index + 1
        }));

      const response = await fetch('http://localhost:5000/api/follow-up-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nurse_id: user.id,
          patient_id: patientId,
          deadline: deadline || undefined,
          questions: validQuestions
        })
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.message || errorData.error || 'Failed to create follow-up request';
          throw new Error(errorMessage);
        } catch (parseError) {
          // Handle non-JSON error responses
          if (response.status === 401) {
            throw new Error('Unauthorized. Please log in again.');
          } else if (response.status === 403) {
            throw new Error('You do not have permission to create follow-up requests');
          } else if (response.status === 404) {
            throw new Error('Patient not found');
          } else if (response.status === 500) {
            throw new Error('Server error. Please try again later.');
          } else {
            throw new Error('Failed to create follow-up request. Please try again.');
          }
        }
      }

      onSuccess();
    } catch (err: any) {
      // Handle network errors
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'An error occurred while creating follow-up request');
      }
      console.error('Error creating follow-up request:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="follow-up-form-container">
      <div className="form-header">
        <h2>Create Follow-up Request</h2>
        <p>Patient: <strong>{patientName}</strong></p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Deadline */}
        <div className="form-section">
          <label htmlFor="deadline">Response Deadline (Optional)</label>
          <input
            type="datetime-local"
            id="deadline"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            disabled={loading}
          />
          <small>Set a deadline for patient responses</small>
        </div>

        {/* Questions */}
        <div className="form-section">
          <div className="questions-header">
            <h3>Questions</h3>
            {errors.questions && <span className="error-text">{errors.questions}</span>}
          </div>

          <div className="questions-list">
            {questions.map((question, index) => (
              <div key={question.id} className="question-item">
                <div className="question-number">Q{question.order}</div>
                <div className="question-input-group">
                  <textarea
                    value={question.text}
                    onChange={(e) => updateQuestion(question.id, e.target.value)}
                    placeholder={`Enter question ${question.order}...`}
                    disabled={loading}
                    rows={3}
                  />
                  {errors[`question_${question.id}`] && (
                    <span className="error-text">{errors[`question_${question.id}`]}</span>
                  )}
                </div>
                {questions.length > 1 && (
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeQuestion(question.id)}
                    disabled={loading}
                    title="Remove question"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            className="add-question-btn"
            onClick={addQuestion}
            disabled={loading}
          >
            + Add Question
          </button>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Creating...' : 'Create Follow-up Request'}
          </button>
          <button type="button" onClick={onCancel} disabled={loading} className="cancel-btn">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default FollowUpRequestForm;
