import { useState, useEffect } from 'react';
import api from '../../lib/api';
import XRayImageCard from './XRayImageCard';
import BulkDiagnosisForm from './BulkDiagnosisForm';
import '../../styles/xrayAnalysisSection.css';

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
  doctorDiagnosis?: {
    id: string;
    text: string;
    doctorName: string;
    createdAt: string;
    updatedAt: string;
  };
}

interface XRayAnalysisSectionProps {
  patientId: string;
  doctorId: string;
  onDiagnosisAdded?: () => void;
}

const XRayAnalysisSection = ({ patientId, doctorId, onDiagnosisAdded }: XRayAnalysisSectionProps) => {
  const [xrayImages, setXrayImages] = useState<XRayImage[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBulkForm, setShowBulkForm] = useState(false);

  useEffect(() => {
    fetchXrayImages();
  }, [patientId]);

  const fetchXrayImages = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/doctor/xray-images/${patientId}`);
      
      // Map API response to component interface
      const mappedImages = (response.data || []).map((img: any) => ({
        id: img.id,
        patientId: img.user_id,
        imageUrl: img.image_url,
        fileName: img.image_url.split('/').pop() || 'image.jpg',
        uploadedAt: img.created_at,
        aiDiagnosis: {
          text: img.diagnosis || 'No AI diagnosis available',
          confidence: 0.85, // Default confidence since column doesn't exist
          generatedAt: img.created_at
        },
        doctorDiagnoses: img.doctorDiagnoses || []
      }));
      
      // Sort images in reverse chronological order (newest first)
      const sortedImages = mappedImages.sort((a: XRayImage, b: XRayImage) => {
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      });
      
      setXrayImages(sortedImages);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load X-Ray images');
      console.error('Error fetching X-Ray images:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelection = (imageId: string, selected: boolean) => {
    const newSelection = new Set(selectedImageIds);
    if (selected) {
      newSelection.add(imageId);
    } else {
      newSelection.delete(imageId);
    }
    setSelectedImageIds(newSelection);
    
    // Hide bulk form if less than 2 images selected
    if (newSelection.size < 2) {
      setShowBulkForm(false);
    }
  };

  const handleBulkFormToggle = () => {
    if (selectedImageIds.size >= 2) {
      setShowBulkForm(!showBulkForm);
    }
  };

  const handleDiagnosisSubmitted = () => {
    // Refresh the image list after diagnosis submission
    fetchXrayImages();
    setSelectedImageIds(new Set());
    setShowBulkForm(false);
    // Notify parent component to refresh diagnoses
    if (onDiagnosisAdded) {
      onDiagnosisAdded();
    }
  };

  const hasExistingDiagnoses = Array.from(selectedImageIds).some(imageId => {
    const image = xrayImages.find(img => img.id === imageId);
    return image?.doctorDiagnoses && image.doctorDiagnoses.length > 0;
  });

  if (loading) {
    return (
      <div className="xray-analysis-section">
        <h2>X-Ray Analysis</h2>
        <div className="loading-state">Loading X-Ray images...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="xray-analysis-section">
        <h2>X-Ray Analysis</h2>
        <div className="error-state">Error: {error}</div>
      </div>
    );
  }

  if (xrayImages.length === 0) {
    return (
      <div className="xray-analysis-section">
        <h2>X-Ray Analysis</h2>
        <div className="empty-state">
          <p>No X-Ray images available for this patient</p>
        </div>
      </div>
    );
  }

  return (
    <div className="xray-analysis-section">
      <div className="section-header">
        <h2>X-Ray Analysis</h2>
        {selectedImageIds.size >= 2 && (
          <button 
            className="bulk-action-btn"
            onClick={handleBulkFormToggle}
          >
            {showBulkForm ? 'Hide' : 'Show'} Bulk Diagnosis ({selectedImageIds.size} selected)
          </button>
        )}
      </div>

      {showBulkForm && selectedImageIds.size >= 2 && (
        <div className="bulk-form-container">
          <BulkDiagnosisForm
            selectedImageIds={Array.from(selectedImageIds)}
            selectedImageCount={selectedImageIds.size}
            onSubmit={handleDiagnosisSubmitted}
            onCancel={() => setShowBulkForm(false)}
            hasExistingDiagnoses={hasExistingDiagnoses}
          />
        </div>
      )}

      <div className="xray-images-container">
        {xrayImages.map(image => (
          <XRayImageCard
            key={image.id}
            image={image}
            isSelected={selectedImageIds.has(image.id)}
            onSelectionChange={handleImageSelection}
            onDiagnosisSubmitted={handleDiagnosisSubmitted}
            doctorId={doctorId}
          />
        ))}
      </div>
    </div>
  );
};

export default XRayAnalysisSection;
