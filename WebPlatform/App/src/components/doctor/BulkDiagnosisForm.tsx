import { useState } from 'react';
import api from '../../lib/api';
import '../../styles/bulkDiagnosisForm.css';

interface BulkDiagnosisFormProps {
  selectedImageIds: string[];
  selectedImageCount: number;
  onSubmit: () => void;
  onCancel: () => void;
  hasExistingDiagnoses: boolean;
}

const BulkDiagnosisForm = ({
  selectedImageIds,
  selectedImageCount,
  onSubmit,
  onCancel,
  hasExistingDiagnoses,
}: BulkDiagnosisFormProps) => {
  const [diagnosis, setDiagnosis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

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

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateDiagnosis();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (hasExistingDiagnoses && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    handleConfirmedSubmit();
  };

  const handleConfirmedSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      await api.post('/doctor/xray-diagnosis/bulk', {
        xray_image_ids: selectedImageIds,
        diagnosis_text: diagnosis.trim(),
      });

      onSubmit();
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error || 'Failed to save diagnoses. Please try again.';
      setError(errorMessage);
      console.error('Error saving bulk diagnoses:', err);
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };

  const charCount = diagnosis.length;
  const isNearLimit = charCount > MAX_LENGTH * 0.9;

  return (
    <form className="bulk-diagnosis-form" onSubmit={handleSubmitClick}>
      <div className="form-header">
        <h3>Bulk Diagnosis</h3>
        <p className="selected-count">
          Applying diagnosis to {selectedImageCount} image{selectedImageCount !== 1 ? 's' : ''}
        </p>
      </div>

      {hasExistingDiagnoses && !showConfirmation && (
        <div className="warning-message">
          <p>
            ⚠️ {selectedImageCount} image{selectedImageCount !== 1 ? 's' : ''} already{' '}
            {selectedImageCount !== 1 ? 'have' : 'has'} diagnoses. They will be overwritten.
          </p>
        </div>
      )}

      {showConfirmation && (
        <div className="confirmation-dialog">
          <p>
            Are you sure you want to apply this diagnosis to {selectedImageCount} image
            {selectedImageCount !== 1 ? 's' : ''}? Existing diagnoses will be overwritten.
          </p>
          <div className="confirmation-actions">
            <button
              type="button"
              className="confirm-btn"
              onClick={handleConfirmedSubmit}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Overwrite'}
            </button>
            <button
              type="button"
              className="cancel-confirmation-btn"
              onClick={() => setShowConfirmation(false)}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showConfirmation && (
        <>
          <div className="form-group">
            <label htmlFor="bulk-diagnosis-textarea">Enter Diagnosis</label>
            <textarea
              id="bulk-diagnosis-textarea"
              className="diagnosis-textarea"
              value={diagnosis}
              onChange={(e) => {
                setDiagnosis(e.target.value);
                setError(null);
              }}
              placeholder="Enter diagnosis to apply to all selected images..."
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
              aria-label="Submit bulk diagnosis"
            >
              {loading ? 'Saving...' : 'Apply Diagnosis'}
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
        </>
      )}
    </form>
  );
};

export default BulkDiagnosisForm;
