import React, { useEffect, useState } from 'react';
import type { Nurse } from '../../types/nurse';
import { useAuthStore } from '../../store/authStore';
import '../../styles/patientAssignmentModal.css';

interface PatientAssignmentModalProps {
  patientId: string;
  patientName: string;
  onAssign: (nurseIds: string[]) => Promise<void>;
  onClose: () => void;
}

const PatientAssignmentModal: React.FC<PatientAssignmentModalProps> = ({
  patientId,
  patientName,
  onAssign,
  onClose
}) => {
  const { accessToken } = useAuthStore();
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [selectedNurseIds, setSelectedNurseIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchAvailableNurses();
  }, []);

  const fetchAvailableNurses = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!accessToken) {
        setError('Authentication token not found. Please log in again.');
        return;
      }

      const response = await fetch('http://localhost:5000/api/doctor/nurses', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.message || errorData.error || 'Failed to fetch available nurses';
          throw new Error(errorMessage);
        } catch (parseError) {
          // Handle non-JSON error responses
          if (response.status === 401) {
            throw new Error('Unauthorized. Please log in again.');
          } else if (response.status === 403) {
            throw new Error('You do not have permission to view nurses');
          } else if (response.status === 500) {
            throw new Error('Server error. Please try again later.');
          } else {
            throw new Error('Failed to fetch available nurses. Please try again.');
          }
        }
      }

      const data = await response.json();
      const nursesList = data.data?.nurses || [];
      setNurses(nursesList);
    } catch (err: any) {
      // Handle network errors
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'Failed to load available nurses');
      }
      console.error('Error fetching nurses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNurseToggle = (nurseId: string) => {
    const newSelected = new Set(selectedNurseIds);
    if (newSelected.has(nurseId)) {
      newSelected.delete(nurseId);
    } else {
      newSelected.add(nurseId);
    }
    setSelectedNurseIds(newSelected);
  };

  const handleAssign = async () => {
    if (selectedNurseIds.size === 0) {
      setError('Please select at least one nurse');
      return;
    }

    setAssigning(true);
    setError(null);
    setSuccessMessage('');

    try {
      await onAssign(Array.from(selectedNurseIds));
      setSuccessMessage(`Patient assigned to ${selectedNurseIds.size} nurse(s) successfully!`);
      
      // Close modal after success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      // Handle network errors
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'Failed to assign patient to nurses');
      }
      console.error('Error assigning patient:', err);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content assignment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Assign Patient to Nurses</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="patient-info">
            <p><strong>Patient:</strong> {patientName}</p>
            <p><strong>Patient ID:</strong> {patientId.substring(0, 8)}...</p>
          </div>

          {error && <div className="error-message">{error}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}

          {loading ? (
            <div className="loading-message">Loading available nurses...</div>
          ) : nurses.length === 0 ? (
            <div className="no-nurses-message">
              No active nurses available for assignment
            </div>
          ) : (
            <div className="nurses-selection">
              <label>Select Nurses (you can select multiple):</label>
              <div className="nurses-list">
                {nurses.map(nurse => (
                  <div key={nurse.id} className="nurse-checkbox-item">
                    <input
                      type="checkbox"
                      id={`nurse-${nurse.id}`}
                      checked={selectedNurseIds.has(nurse.id)}
                      onChange={() => handleNurseToggle(nurse.id)}
                      disabled={assigning}
                    />
                    <label htmlFor={`nurse-${nurse.id}`} className="nurse-label">
                      <div className="nurse-name">{nurse.full_name}</div>
                      <div className="nurse-phone">{nurse.phone_number}</div>
                    </label>
                  </div>
                ))}
              </div>

              {selectedNurseIds.size > 0 && (
                <div className="selected-nurses-summary">
                  <p><strong>Selected:</strong> {selectedNurseIds.size} nurse(s)</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={assigning}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleAssign}
            disabled={assigning || selectedNurseIds.size === 0 || loading}
          >
            {assigning ? 'Assigning...' : `Assign ${selectedNurseIds.size > 0 ? `(${selectedNurseIds.size})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientAssignmentModal;
