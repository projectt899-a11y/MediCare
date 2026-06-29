import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useUsers from '../../../hooks/useUsers';
import AvailabilityManagement, { type AvailabilityManagementHandle } from './AvailabilityManagement.tsx';
import type { User } from '../../../types/admin';
import "../../../styles/adminUserEdit.css";

const UserEditForm: React.FC = () => {
  const { userId, role } = useParams<{ userId: string; role?: string }>();
  const navigate = useNavigate();
  const { getUserById, updateUserStatus, loading: hookLoading, error: hookError } = useUsers();
  const availabilityRef = useRef<AvailabilityManagementHandle>(null);

  const [formData, setFormData] = useState<Partial<User>>({
    email: '',
    status: 'active',
  });
  const [userRole, setUserRole] = useState<string>('patient');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) {
        setError('User ID not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const user = await getUserById(userId);
        
        if (!user) {
          setError('User not found');
          setLoading(false);
          return;
        }

        setFormData({
          id: user.id,
          email: user.email,
          status: user.status,
        });
        
        // Set role from URL parameter (passed from table)
        if (role) {
          setUserRole(role);
        }
        
        setLoading(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch user';
        setError(message);
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, role, getUserById]);

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Invalid email format';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      if (!userId) {
        setError('User ID not found');
        setSaving(false);
        return;
      }

      // Update user status if it changed
      if (formData.status && formData.status !== 'pending') {
        await updateUserStatus(userId, formData.status as 'active' | 'inactive');
      }

      // Save availability if doctor
      if (userRole === 'doctor' && availabilityRef.current) {
        const availabilityData = availabilityRef.current.getAvailabilityData();
        if (availabilityData.create.length > 0 || availabilityData.update.length > 0 || availabilityData.delete.length > 0) {
          try {
            const adminApi = (await import('../../../services/adminApi')).default;
            await adminApi.saveDoctorAvailability(userId, availabilityData);
          } catch (availErr: any) {
            // If availability endpoint doesn't exist (404), continue anyway
            // The availability feature will be implemented on the backend later
            if (availErr.response?.status !== 404) {
              throw availErr;
            }
          }
        }
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/admin/users');
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save user';
      setError(message);
      setSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigate('/admin/users');
  };

  // Handle retry
  const handleRetry = () => {
    setError(null);
    setLoading(true);
    const fetchUser = async () => {
      if (!userId) {
        setError('User ID not found');
        setLoading(false);
        return;
      }

      try {
        const user = await getUserById(userId);
        if (!user) {
          setError('User not found');
          setLoading(false);
          return;
        }

        setFormData({
          id: user.id,
          email: user.email,
          status: user.status,
        });
        
        // Set role from URL parameter
        if (role) {
          setUserRole(role);
        }
        
        setLoading(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch user';
        setError(message);
        setLoading(false);
      }
    };

    fetchUser();
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="status-card status-card--loading">
          <div className="spinner"></div>
          <p>Loading user data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="status-card status-card--error">
          <div className="status-card__icon">⚠️</div>
          <h3 className="status-card__title">Error Loading Data</h3>
          <p className="status-card__message">{error}</p>
          <div className="status-card__actions">
            <button onClick={handleRetry} className="btn btn-primary">
              Retry
            </button>
            <button onClick={handleCancel} className="btn btn-secondary">
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="form-card">
        <div className="form-card__header">
          <h2 className="form-card__title">Edit User</h2>
          <p className="form-card__subtitle">Update the information for this user</p>
        </div>

        {success && (
          <div className="alert alert--success">
            <span className="alert__icon">✅</span>
            User updated successfully! Redirecting...
          </div>
        )}

        <form className="user-edit-form" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email Address *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                disabled={saving}
                className={`form-input ${validationErrors.email ? 'form-input--error' : ''}`}
                required
              />
              {validationErrors.email && (
                <span className="form-error-text">{validationErrors.email}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="status" className="form-label">Account Status</label>
              <select
                id="status"
                name="status"
                value={formData.status || 'active'}
                onChange={handleInputChange}
                disabled={saving}
                className="form-select"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          {userRole === 'doctor' && (
            <AvailabilityManagement 
              ref={availabilityRef}
              doctorId={formData.id || ''}
            />
          )}

          <div className="form-card__actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="btn-spinner"></div>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );

};

export default UserEditForm;
