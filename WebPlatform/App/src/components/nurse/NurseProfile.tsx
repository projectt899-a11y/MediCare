import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import '../../styles/nurseProfile.css';

const NurseProfile = () => {
  const { user } = useAuthStore();
  const [activeSection, setActiveSection] = useState<'personal' | 'security'>('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [personalInfo, setPersonalInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    profilePicture: null as string | null,
  });

  const [professionalInfo, setProfessionalInfo] = useState({
    licenseNumber: '',
    yearsOfExperience: '',
    biography: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get('/nurses/profile');
        const data = res.data;

        setPersonalInfo({
          fullName: data.full_name || user?.fullName || '',
          email: data.email || user?.email || '',
          phone: data.phone_number || '',
          profilePicture: data.profile_picture || null,
        });

        setProfessionalInfo({
          licenseNumber: data.license_number || '',
          yearsOfExperience: data.years_of_experience || '',
          biography: data.biography || '',
        });
      } catch (err: any) {
        // If profile not found, that's okay - just use default values from auth user
        if (err.response?.status === 404) {
          setPersonalInfo({
            fullName: user?.fullName || '',
            email: user?.email || '',
            phone: '',
            profilePicture: null,
          });
        } else if (err.response?.status === 401) {
          setError('Unauthorized - please log in again');
        } else {
          setError(err.response?.data?.error || 'Failed to load profile');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handlePersonalInfoChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setPersonalInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('fullName', personalInfo.fullName);
      formData.append('phone', personalInfo.phone);
      formData.append('licenseNumber', professionalInfo.licenseNumber);
      formData.append('yearsOfExperience', professionalInfo.yearsOfExperience);
      formData.append('biography', professionalInfo.biography);

      const fileInput = document.getElementById('profile-pic-upload') as HTMLInputElement;

      if (fileInput && fileInput.files && fileInput.files[0]) {
        formData.append('profilePicture', fileInput.files[0]);
      }

      const response = await api.put('/nurses/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.status === 200 || response.status === 204) {
        setSuccessMessage('Profile updated successfully!');
        setIsEditing(false);
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to save profile';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setProfilePicPreview(null);
  };

  const handleChangePassword = async () => {
    setPasswordErrors({ newPassword: '', confirmPassword: '' });
    let hasError = false;

    if (!newPassword) {
      setPasswordErrors((prev) => ({ ...prev, newPassword: 'New password is required' }));
      hasError = true;
    } else if (newPassword.length < 8) {
      setPasswordErrors((prev) => ({ ...prev, newPassword: 'Password must be at least 8 characters' }));
      hasError = true;
    }

    if (!confirmPassword) {
      setPasswordErrors((prev) => ({ ...prev, confirmPassword: 'Please confirm new password' }));
      hasError = true;
    } else if (newPassword !== confirmPassword) {
      setPasswordErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      hasError = true;
    }

    if (hasError) return;

    try {
      setLoading(true);
      await api.post('/nurses/change-password', {
        newPassword,
        confirmPassword,
      });

      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({ newPassword: '', confirmPassword: '' });
      setSuccessMessage('Password changed successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to change password';
      setPasswordErrors((prev) => ({ ...prev, confirmPassword: errorMsg }));
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePicPreview(URL.createObjectURL(file));
    }
  };

  if (loading) return <div className="loading">Loading profile...</div>;

  return (
    <div className="nurse-profile">
      <div className="nurse-profile-header">
        <h1>Profile</h1>
        <div className="header-actions">
          {isEditing ? (
            <>
              <button className="cancel-button" onClick={handleCancel}>
                Cancel
              </button>
              <button className="save-button" onClick={handleSave} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button className="edit-button" onClick={() => setIsEditing(true)} disabled={loading}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <div className="profile-container">
        <div className="profile-sidebar">
          <div className="profile-picture">
            {profilePicPreview || personalInfo.profilePicture ? (
              <img
                src={profilePicPreview || personalInfo.profilePicture || ''}
                alt="Profile"
                className="avatar-img"
                style={{
                  width: '200px',
                  height: '200px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div className="avatar">
                {personalInfo.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
            )}
          </div>

          <nav className="profile-nav">
            <button
              className={`nav-item ${activeSection === 'personal' ? 'active' : ''}`}
              onClick={() => setActiveSection('personal')}
            >
              Personal Information
            </button>
            <button
              className={`nav-item ${activeSection === 'security' ? 'active' : ''}`}
              onClick={() => setActiveSection('security')}
            >
              Security Settings
            </button>
          </nav>
        </div>

        <div className="profile-content">
          {activeSection === 'personal' && (
            <div className="profile-section">
              <h2>Personal Information</h2>
              <div className="info-grid">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={personalInfo.fullName}
                    onChange={handlePersonalInfoChange}
                    disabled={true}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={personalInfo.email}
                    onChange={handlePersonalInfoChange}
                    disabled={true}
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={personalInfo.phone || ''}
                    onChange={handlePersonalInfoChange}
                    disabled={true}
                    maxLength={11}
                    minLength={11}
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="profile-section">
              <h2>Change Password</h2>
              <div className="password-form">
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className={passwordErrors.newPassword ? 'input-error' : ''}
                  />
                  {passwordErrors.newPassword && (
                    <span className="error-text">{passwordErrors.newPassword}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className={passwordErrors.confirmPassword ? 'input-error' : ''}
                  />
                  {passwordErrors.confirmPassword && (
                    <span className="error-text">{passwordErrors.confirmPassword}</span>
                  )}
                </div>

                <button className="change-password-button" onClick={handleChangePassword} disabled={loading}>
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NurseProfile;
