import { useState } from 'react';
import DiagnosisForm from './DiagnosisForm';
import '../../styles/xrayImageCard.css';

interface XRayImage {
  id: string;
  patientId: string;
  imageUrl: string;
  fileName: string;
  uploadedAt: string;
  aiDiagnosis: {
    text: string;
    confidence: number;
    generatedAt: string;
  };
  doctorDiagnoses?: Array<{
    id: string;
    diagnosis: string;
    created_at: string;
  }>;
}

interface XRayImageCardProps {
  image: XRayImage;
  isSelected: boolean;
  onSelectionChange: (imageId: string, selected: boolean) => void;
  onDiagnosisSubmitted: () => void;
  doctorId: string;
}

const XRayImageCard = ({
  image,
  isSelected,
  onSelectionChange,
  onDiagnosisSubmitted,
  doctorId,
}: XRayImageCardProps) => {
  const [showDiagnosisForm, setShowDiagnosisForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleEditClick = () => {
    setIsEditing(true);
    setShowDiagnosisForm(true);
  };

  const handleFormClose = () => {
    setShowDiagnosisForm(false);
    setIsEditing(false);
  };

  const handleDiagnosisSuccess = () => {
    handleFormClose();
    onDiagnosisSubmitted();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const hasAiDiagnosis = image.aiDiagnosis && image.aiDiagnosis.text;
  const doctorDiagnosis = image.doctorDiagnoses && image.doctorDiagnoses.length > 0 ? image.doctorDiagnoses[0] : undefined;
  const hasDoctorDiagnosis = doctorDiagnosis && doctorDiagnosis.diagnosis;

  return (
    <div className="xray-image-card">
      {/* Selection Checkbox */}
      <div className="card-header">
        <input
          type="checkbox"
          className="selection-checkbox"
          checked={isSelected}
          onChange={(e) => onSelectionChange(image.id, e.target.checked)}
          aria-label={`Select ${image.fileName}`}
        />
        <div className="image-metadata">
          <p className="file-name">{image.fileName}</p>
          <p className="upload-time">Uploaded: {formatDate(image.uploadedAt)}</p>
        </div>
      </div>

      {/* X-Ray Image Display */}
      <div className="image-container">
        <img src={image.imageUrl} alt={image.fileName} className="xray-image" />
      </div>

      {/* AI Diagnosis Section */}
      <div className="diagnosis-section ai-diagnosis">
        <h4>AI Analysis</h4>
        {hasAiDiagnosis ? (
          <div className="diagnosis-content">
            <p className="diagnosis-text">{image.aiDiagnosis.text}</p>
            <div className="diagnosis-metadata">
              <span className="confidence">
                Confidence: {image.aiDiagnosis.confidence}%
              </span>
              <span className="timestamp">
                Generated: {formatDate(image.aiDiagnosis.generatedAt)}
              </span>
            </div>
          </div>
        ) : (
          <div className="pending-analysis">
            <p>AI analysis in progress...</p>
          </div>
        )}
      </div>

      {/* Doctor Diagnosis Section */}
      <div className="diagnosis-section doctor-diagnosis">
        <h4>Doctor Diagnosis</h4>
        {hasDoctorDiagnosis && doctorDiagnosis ? (
          <div className="diagnosis-content">
            <p className="diagnosis-text">{doctorDiagnosis.diagnosis}</p>
            <div className="diagnosis-metadata">
              <span className="timestamp">
                Created: {formatDate(doctorDiagnosis.created_at)}
              </span>
            </div>
            <button
              className="edit-diagnosis-btn"
              onClick={handleEditClick}
              aria-label="Edit diagnosis"
            >
              Edit Diagnosis
            </button>
          </div>
        ) : (
          <p className="no-diagnosis">No diagnosis added yet</p>
        )}
      </div>

      {/* Diagnosis Form */}
      {showDiagnosisForm && (
        <div className="diagnosis-form-container">
          <DiagnosisForm
            imageId={image.id}
            existingDiagnosis={
              isEditing && hasDoctorDiagnosis && doctorDiagnosis ? doctorDiagnosis.diagnosis : undefined
            }
            existingDiagnosisId={
              isEditing && hasDoctorDiagnosis && doctorDiagnosis ? doctorDiagnosis.id : undefined
            }
            onSubmit={handleDiagnosisSuccess}
            onCancel={handleFormClose}
          />
        </div>
      )}

      {/* Add Diagnosis Button (if no form is shown and no diagnosis exists) */}
      {!showDiagnosisForm && !hasDoctorDiagnosis && (
        <button
          className="add-diagnosis-btn"
          onClick={() => setShowDiagnosisForm(true)}
          aria-label="Add diagnosis"
        >
          Add Diagnosis
        </button>
      )}
    </div>
  );
};

export default XRayImageCard;
