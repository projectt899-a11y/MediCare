import { useState } from 'react';
import api from '../../lib/api';
import '../../styles/diagnosisForm.css';

interface DiagnosisFormProps {
  imageId: string;
  existingDiagnosis?: string;
  existingDiagnosisId?: string;
  onSubmit: () => void;
  onCancel: () => void;
}

const DiagnosisForm = ({
  imageId,
  existingDiagnosis,
  existingDiagnosisId,
  onSubmit,
  onCancel,
}: DiagnosisFormProps) => {
  const [diagnosis, setDiagnosis] = useState(existingDiagnosis || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MIN_LENGTH = 10;
  const MAX_LENGTH = 5000;

  const validateDiagnosis = (): string | null => {
    const trimmed = diagnosis.trim();

    if (!trimmed) {
      return 'Diagnosis cannot be empty';
    }

    if (trimmed.length < MIN_LENGTH) {
      return `Diagnosis must be at least ${MIN_LENGTH} characters`;
    }

    if (trimmed.length > MAX_LENGTH) {
      return `Diagnosis cannot exceed ${MAX_LENGTH} characters`;
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateDiagnosis();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (existingDiagnosisId) {
        // Update existing diagnosis
        await api.put(`/doctor/xray-diagnosis/${existingDiagnosisId}`, {
          diagnosis_text: diagnosis.trim(),
        });
      } else {
        // Create new diagnosis
        await api.post('/doctor/xray-diagnosis', {
          xray_image_id: imageId,
          diagnosis_text: diagnosis.trim(),
        });
      }

      onSubmit();
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error || 'Failed to save diagnosis. Please try again.';
      setError(errorMessage);
      console.error('Error saving diagnosis:', err);
    } finally {
      setLoading(false);
    }
  };

  const charCount = diagnosis.length;
  const isNearLimit = charCount > MAX_LENGTH * 0.9;

  return (
    <form className="diagnosis-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="diagnosis-textarea">Enter Diagnosis</label>
        <textarea
          id="diagnosis-textarea"
          className="diagnosis-textarea"
          value={diagnosis}
          onChange={(e) => {
            setDiagnosis(e.target.value);
            setError(null);
          }}
          placeholder="Enter your diagnosis here..."
          disabled={loading}
          rows={6}
        />
        <div className={`char-count ${isNearLimit ? 'near-limit' : ''}`}>
          {charCount} / {MAX_LENGTH} characters
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="form-actions">
        <button
          type="submit"
          className="submit-btn"
          disabled={loading}
          aria-label="Submit diagnosis"
        >
          {loading ? 'Saving...' : existingDiagnosisId ? 'Update Diagnosis' : 'Add Diagnosis'}
        </button>
        <button
          type="button"
          className="cancel-btn"
          onClick={onCancel}
          disabled={loading}
          aria-label="Cancel"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default DiagnosisForm;
