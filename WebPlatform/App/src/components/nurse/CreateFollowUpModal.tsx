import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import Icon from '../admin/Icon';
import '../../styles/createFollowUpModal.css';

interface Question {
  id: string;
  question_text: string;
}

interface CreateFollowUpModalProps {
  patientId: string;
  patientName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateFollowUpModal: React.FC<CreateFollowUpModalProps> = ({
  patientId,
  patientName,
  isOpen,
  onClose,
  onSuccess
}) => {
  const user = useAuthStore(state => state.user);
  const accessToken = useAuthStore(state => state.accessToken);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([
    { id: '1', question_text: '' }
  ]);
  const [nurseNotes, setNurseNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { id: Date.now().toString(), question_text: '' }
    ]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  const updateQuestion = (id: string, text: string) => {
    setQuestions(questions.map(q =>
      q.id === id ? { ...q, question_text: text } : q
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (questions.some(q => !q.question_text.trim())) {
      setError('All questions are required');
      return;
    }

    if (!user?.id || !accessToken) {
      setError('Authentication information not available');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `http://localhost:5000/api/nurses/follow-up-requests`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            patient_id: patientId,
            title: title.trim(),
            questions: questions.map(q => ({
              question_text: q.question_text
            })),
            nurse_notes: nurseNotes || null
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create follow-up request');
      }

      // Reset form
      setTitle('');
      setQuestions([{ id: '1', question_text: '' }]);
      setNurseNotes('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the follow-up request');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Follow-up Request</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Patient Info */}
          <div className="form-section">
            <h3>Patient Information</h3>
            <div className="patient-info">
              <p><strong>Name:</strong> {patientName}</p>
            </div>
          </div>

          {/* Title */}
          <div className="form-section">
            <h3>Follow-up Title</h3>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter follow-up title..."
              disabled={loading}
              required
            />
          </div>

          {/* Questions */}
          <div className="form-section">
            <h3>Questions</h3>
            <div className="questions-container">
              {questions.map((question, index) => (
                <div key={question.id} className="question-input-group">
                  <label>Question {index + 1}</label>
                  <div className="question-input-wrapper">
                    <textarea
                      value={question.question_text}
                      onChange={(e) => updateQuestion(question.id, e.target.value)}
                      placeholder="Enter your question here..."
                      rows={3}
                      disabled={loading}
                    />
                    {questions.length > 1 && (
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => removeQuestion(question.id)}
                        disabled={loading}
                      >
                        Remove
                      </button>
                    )}
                  </div>
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

          {/* Notes */}
          <div className="form-section">
            <h3>Nurse Notes (Optional)</h3>
            <textarea
              value={nurseNotes}
              onChange={(e) => setNurseNotes(e.target.value)}
              placeholder="Add notes about this follow-up request..."
              rows={4}
              disabled={loading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="modal-footer">
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Follow-up Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFollowUpModal;
