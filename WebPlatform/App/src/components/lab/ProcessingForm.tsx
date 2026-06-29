import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import './ProcessingForm.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface RequestInfo {
  patientName: string;
  doctorName: string;
  testType: string;
  doctorNotes: string | null;
  priority: string;
}

const ProcessingForm: React.FC = () => {
  const navigate = useNavigate();
  const { requestId } = useParams<{ requestId: string }>();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [requestInfo, setRequestInfo] = useState<RequestInfo | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [submissionType, setSubmissionType] = useState<'file' | 'manual'>('file');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [doctorVisibleNotes, setDoctorVisibleNotes] = useState('');
  const [internalLabNotes, setInternalLabNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch real request details
  useEffect(() => {
    if (!requestId) return;
    const fetchDetails = async () => {
      setIsFetching(true);
      setFetchError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/labs/requests/${requestId}`, {
          headers: { Authorization: `Bearer ${accessToken || ''}` },
        });
        if (!res.ok) throw new Error(`Failed to load request: ${res.statusText}`);
        const json = await res.json();
        const d = json.data;
        setRequestInfo({
          patientName: d.patient?.name || '—',
          doctorName: d.doctor?.name || '—',
          testType: d.testType?.name || '—',
          doctorNotes: d.doctorNotes || null,
          priority: d.priority || 'Normal',
        });
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Failed to load request');
      } finally {
        setIsFetching(false);
      }
    };
    fetchDetails();
  }, [requestId, accessToken]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Invalid file type. Please upload PDF, JPG, or PNG.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File is too large. Maximum size is 10MB.');
      return;
    }
    setUploadError('');
    setUploadedFile(file);
    simulateUploadProgress();
  };

  const simulateUploadProgress = () => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) { progress = 100; clearInterval(interval); }
      setUploadProgress(progress);
    }, 200);
  };

  const validateForm = (): boolean => {
    if (submissionType === 'file' && !uploadedFile) {
      setUploadError('Please upload a file');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('requestId', requestId || '');
      formData.append('resultType', submissionType === 'file' ? 'File Upload' : 'Manual Entry');
      if (submissionType === 'file' && uploadedFile) {
        formData.append('file', uploadedFile);
      }
      if (doctorVisibleNotes) formData.append('doctorVisibleNotes', doctorVisibleNotes);
      if (internalLabNotes) formData.append('internalLabNotes', internalLabNotes);
      // isDraft is always false — draft functionality removed

      const res = await fetch(`${API_BASE_URL}/labs/results`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken || ''}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to submit result');
      }

      alert('Result submitted successfully');
      navigate('/lab/processing');
    } catch (error) {
      console.error('Failed to submit result:', error);
      alert(error instanceof Error ? error.message : 'Failed to submit result');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading / error states ─────────────────────────────────────────────────
  if (isFetching) {
    return (
      <div className="lab-processing-form">
        <div className="lab-form-header">
          <button className="lab-back-button" onClick={() => navigate('/lab/processing')}>
            ← Back
          </button>
          <h1>Process Result</h1>
        </div>
        <div className="lab-form-container">
          <div className="lab-empty-state"><p>Loading request details…</p></div>
        </div>
      </div>
    );
  }

  if (fetchError || !requestInfo) {
    return (
      <div className="lab-processing-form">
        <div className="lab-form-header">
          <button className="lab-back-button" onClick={() => navigate('/lab/processing')}>
            ← Back
          </button>
          <h1>Process Result</h1>
        </div>
        <div className="lab-form-container">
          <div className="lab-empty-state"><p>{fetchError || 'Request not found.'}</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="lab-processing-form">
      <div className="lab-form-header">
        <button
          className="lab-back-button"
          onClick={() => navigate('/lab/processing')}
          aria-label="Go back to processing list"
        >
          ← Back
        </button>
        <h1>Process Result</h1>
      </div>

      <div className="lab-form-container">

        {/* Request Details (Read-only) */}
        <div className="lab-form-section">
          <h2>Request Details</h2>
          <div className="lab-request-info">
            <div className="lab-info-row">
              <span className="lab-info-label">Patient:</span>
              <span className="lab-info-value">{requestInfo.patientName}</span>
            </div>
            <div className="lab-info-row">
              <span className="lab-info-label">Doctor:</span>
              <span className="lab-info-value">{requestInfo.doctorName}</span>
            </div>
            <div className="lab-info-row">
              <span className="lab-info-label">Test Type:</span>
              <span className="lab-info-value">{requestInfo.testType}</span>
            </div>
            <div className="lab-info-row">
              <span className="lab-info-label">Priority:</span>
              <span className="lab-info-value">{requestInfo.priority}</span>
            </div>
            {requestInfo.doctorNotes && (
              <div className="lab-info-row">
                <span className="lab-info-label">Doctor Notes:</span>
                <span className="lab-info-value">{requestInfo.doctorNotes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Submission Type Selection */}
        <div className="lab-form-section">
          <h2>Result Submission</h2>
          <div className="lab-submission-options">
            <label className="lab-option-label">
              <input
                type="radio"
                name="submissionType"
                value="file"
                checked={submissionType === 'file'}
                onChange={() => setSubmissionType('file')}
              />
              <span>Upload Result File (PDF, JPG, PNG)</span>
            </label>
            <label className="lab-option-label">
              <input
                type="radio"
                name="submissionType"
                value="manual"
                checked={submissionType === 'manual'}
                onChange={() => setSubmissionType('manual')}
              />
              <span>Enter Notes Manually</span>
            </label>
          </div>
        </div>

        {/* File Upload Section */}
        {submissionType === 'file' && (
          <div className="lab-form-section">
            <h3>Upload Result File</h3>
            <div className="lab-file-upload">
              <input
                type="file"
                id="resultFile"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="lab-file-input"
                aria-label="Upload result file"
              />
              <label htmlFor="resultFile" className="lab-file-label">
                <span className="lab-file-icon">📎</span>
                <span className="lab-file-text">
                  {uploadedFile ? uploadedFile.name : 'Click to upload or drag and drop'}
                </span>
                <span className="lab-file-hint">PDF, JPG, PNG (max 10MB)</span>
              </label>
              {uploadError && <div className="lab-error-message">{uploadError}</div>}
              {uploadedFile && uploadProgress < 100 && (
                <div className="lab-progress-bar">
                  <div className="lab-progress-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
              {uploadedFile && uploadProgress === 100 && (
                <div className="lab-success-message">✓ File ready</div>
              )}
            </div>
          </div>
        )}

        {/* Notes Sections */}
        <div className="lab-form-section">
          <h3>Doctor-Visible Notes</h3>
          <p className="lab-notes-hint">These notes will be visible to the doctor and patient</p>
          <textarea
            className="lab-textarea"
            value={doctorVisibleNotes}
            onChange={(e) => setDoctorVisibleNotes(e.target.value)}
            placeholder="Enter notes visible to doctor and patient..."
            rows={4}
            aria-label="Doctor-visible notes"
          />
          <div className="lab-char-count">{doctorVisibleNotes.length} / 1000 characters</div>
        </div>

        <div className="lab-form-section">
          <h3>Internal Lab Notes</h3>
          <p className="lab-notes-hint">These notes are visible only to lab staff</p>
          <textarea
            className="lab-textarea"
            value={internalLabNotes}
            onChange={(e) => setInternalLabNotes(e.target.value)}
            placeholder="Enter internal notes for lab staff only..."
            rows={4}
            aria-label="Internal lab notes"
          />
          <div className="lab-char-count">{internalLabNotes.length} / 1000 characters</div>
        </div>

        {/* Action Buttons */}
        <div className="lab-form-actions">
          <button
            className="lab-btn lab-btn-secondary"
            onClick={() => navigate('/lab/processing')}
            disabled={isSubmitting}
            aria-label="Cancel and go back"
          >
            Cancel
          </button>
          <button
            className="lab-btn lab-btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            aria-label="Submit result"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Result'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProcessingForm;
