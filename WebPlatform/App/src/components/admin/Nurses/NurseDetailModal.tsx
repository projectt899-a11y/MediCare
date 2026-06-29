import React, { useState } from 'react';
import type { Nurse } from '../../../types/nurse';
import { useAuthStore } from '../../../store/authStore';
import '../../../styles/nurseAdmin.css';

interface NurseDetailModalProps {
  nurse: Nurse;
  onClose: () => void;
  onUpdate: () => void;
}

const NurseDetailModal: React.FC<NurseDetailModalProps> = ({ nurse, onClose, onUpdate }) => {
  const { accessToken } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    full_name: nurse.full_name,
    phone_number: nurse.phone_number,
    gender: nurse.gender,
    account_status: nurse.account_status
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveEdit = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage('');

    try {
      if (!accessToken) {
        throw new Error('Not authenticated. Please log in again.');
      }

      console.log('Saving nurse edit:', { id: nurse.id, editData });

      // Update profile info
      const profileResponse = await fetch(`http://localhost:5000/api/nurses/${nurse.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          full_name: editData.full_name,
          phone_number: editData.phone_number,
          gender: editData.gender
        })
      });

      if (!profileResponse.ok) {
        try {
          const errorData = await profileResponse.json();
          const errorMessage = errorData.message || errorData.error || 'Failed to update nurse';
          throw new Error(errorMessage);
        } catch (parseError) {
          if (profileResponse.status === 401) {
            throw new Error('Unauthorized. Please log in again.');
          } else if (profileResponse.status === 403) {
            throw new Error('You do not have permission to perform this action');
          } else if (profileResponse.status === 404) {
            throw new Error('Nurse not found');
          } else if (profileResponse.status === 500) {
            throw new Error('Server error. Please try again later.');
          } else {
            throw new Error('Failed to update nurse. Please try again.');
          }
        }
      }

      // Update status if it changed
      if (editData.account_status !== nurse.account_status) {
        console.log('Updating status:', { id: nurse.id, newStatus: editData.account_status });
        
        const statusResponse = await fetch(`http://localhost:5000/api/nurses/${nurse.id}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ status: editData.account_status })
        });

        if (!statusResponse.ok) {
          try {
            const errorData = await statusResponse.json();
            const errorMessage = errorData.message || errorData.error || 'Failed to update status';
            throw new Error(errorMessage);
          } catch (parseError) {
            if (statusResponse.status === 401) {
              throw new Error('Unauthorized. Please log in again.');
            } else if (statusResponse.status === 403) {
              throw new Error('You do not have permission to perform this action');
            } else if (statusResponse.status === 404) {
              throw new Error('Nurse not found');
            } else if (statusResponse.status === 500) {
              throw new Error('Server error. Please try again later.');
            } else {
              throw new Error('Failed to update status. Please try again.');
            }
          }
        }
      }

      setSuccessMessage('Nurse updated successfully!');
      setIsEditing(false);
      setTimeout(() => {
        onUpdate();
      }, 1000);
    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'An error occurred while updating nurse');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: 'active' | 'inactive') => {
    setLoading(true);
    setError(null);
    setSuccessMessage('');

    try {
      if (!accessToken) {
        throw new Error('Not authenticated. Please log in again.');
      }

      const response = await fetch(`http://localhost:5000/api/nurses/${nurse.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.message || errorData.error || 'Failed to update nurse status';
          throw new Error(errorMessage);
        } catch (parseError) {
          // Handle non-JSON error responses
          if (response.status === 401) {
            throw new Error('Unauthorized. Please log in again.');
          } else if (response.status === 403) {
            throw new Error('You do not have permission to perform this action');
          } else if (response.status === 404) {
            throw new Error('Nurse not found');
          } else if (response.status === 500) {
            throw new Error('Server error. Please try again later.');
          } else {
            throw new Error('Failed to update nurse status. Please try again.');
          }
        }
      }

      setSuccessMessage(`Nurse ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
      setTimeout(() => {
        onUpdate();
      }, 1000);
    } catch (err: any) {
      // Handle network errors
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'An error occurred while updating nurse status');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content nurse-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nurse Details</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}

          {isEditing ? (
            // Edit Mode
            <div className="edit-form">
              <div className="form-group">
                <label htmlFor="full_name">Full Name</label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={editData.full_name}
                  onChange={handleEditChange}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone_number">Phone Number</label>
                <input
                  type="tel"
                  id="phone_number"
                  name="phone_number"
                  value={editData.phone_number}
                  onChange={handleEditChange}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="gender">Gender</label>
                <select
                  id="gender"
                  name="gender"
                  value={editData.gender}
                  onChange={handleEditChange}
                  disabled={loading}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="account_status">Account Status</label>
                <select
                  id="account_status"
                  name="account_status"
                  value={editData.account_status}
                  onChange={handleEditChange}
                  disabled={loading}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div className="button-group">
                <button
                  className="btn btn-primary"
                  onClick={handleSaveEdit}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            // View Mode
            <div className="view-details">
              <div className="detail-row">
                <span className="label">Full Name:</span>
                <span className="value">{nurse.full_name}</span>
              </div>

              <div className="detail-row">
                <span className="label">Email:</span>
                <span className="value">{nurse.email}</span>
              </div>

              <div className="detail-row">
                <span className="label">Phone Number:</span>
                <span className="value">{nurse.phone_number}</span>
              </div>

              <div className="detail-row">
                <span className="label">Gender:</span>
                <span className="value capitalize">{nurse.gender}</span>
              </div>

              <div className="detail-row">
                <span className="label">Account Status:</span>
                <span className={`status-badge status-${nurse.account_status}`}>
                  {nurse.account_status}
                </span>
              </div>

              <div className="detail-row">
                <span className="label">Registration Date:</span>
                <span className="value">{new Date(nurse.created_at).toLocaleDateString()}</span>
              </div>

              <div className="button-group">
                <button
                  className="btn btn-primary"
                  onClick={() => setIsEditing(true)}
                  disabled={loading}
                >
                  Edit Profile
                </button>

                {nurse.account_status === 'active' ? (
                  <button
                    className="btn btn-danger"
                    onClick={() => handleStatusChange('inactive')}
                    disabled={loading}
                  >
                    {loading ? 'Deactivating...' : 'Deactivate Account'}
                  </button>
                ) : (
                  <button
                    className="btn btn-success"
                    onClick={() => handleStatusChange('active')}
                    disabled={loading}
                  >
                    {loading ? 'Activating...' : 'Activate Account'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NurseDetailModal;
