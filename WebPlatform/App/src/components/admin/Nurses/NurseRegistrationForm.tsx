import React, { useState } from 'react';
import type { NurseFormData } from '../../../types/nurse';
import { useAuthStore } from '../../../store/authStore';
import '../../../styles/nurseAdmin.css';

interface NurseRegistrationFormProps {
  onSuccess: (nurse: any) => void;
  onError?: (error: string) => void;
}

const NurseRegistrationForm: React.FC<NurseRegistrationFormProps> = ({ onSuccess, onError }) => {
  const { accessToken } = useAuthStore();
  const [formData, setFormData] = useState<NurseFormData>({
    full_name: '',
    phone_number: '',
    gender: 'male',
    email: '',
    password: '',
    confirm_password: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    // Minimum 8 characters, at least one uppercase, one lowercase, one number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  };

  const validateForm = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    // Validate full name
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    // Validate phone number
    if (!formData.phone_number.trim()) {
      newErrors.phone_number = 'Phone number is required';
    }

    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters with uppercase, lowercase, and numbers';
    }

    // Validate confirm password
    if (!formData.confirm_password) {
      newErrors.confirm_password = 'Confirm password is required';
    } else if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValid = await validateForm();
    if (!isValid) {
      return;
    }

    setLoading(true);
    setSuccessMessage('');

    try {
      if (!accessToken) {
        onError?.('Not authenticated. Please log in again.');
        return;
      }

      const response = await fetch('http://localhost:5000/api/nurses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          phone_number: formData.phone_number,
          gender: formData.gender,
          email: formData.email,
          password: formData.password
        })
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.message || errorData.error || 'Failed to register nurse';
          
          // Handle specific error cases
          if (errorMessage.includes('email') || errorMessage.includes('Email')) {
            setErrors(prev => ({
              ...prev,
              email: 'Email already exists in the system'
            }));
          } else if (errorMessage.includes('password') || errorMessage.includes('Password')) {
            setErrors(prev => ({
              ...prev,
              password: 'Password does not meet security requirements'
            }));
          } else {
            onError?.(errorMessage);
          }
        } catch {
          // Handle non-JSON error responses
          if (response.status === 401) {
            onError?.('Unauthorized. Please log in again.');
          } else if (response.status === 403) {
            onError?.('You do not have permission to perform this action');
          } else if (response.status === 500) {
            onError?.('Server error. Please try again later.');
          } else {
            onError?.('Failed to register nurse. Please try again.');
          }
        }
        return;
      }

      const data = await response.json();
      setSuccessMessage('Nurse registered successfully!');
      
      // Reset form
      setFormData({
        full_name: '',
        phone_number: '',
        gender: 'male',
        email: '',
        password: '',
        confirm_password: ''
      });
      setErrors({});

      // Call success callback
      onSuccess(data.data || data);
    } catch (error: any) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        onError?.('Network error. Please check your internet connection and try again.');
      } else {
        const errorMessage = error.message || 'An error occurred while registering nurse';
        onError?.(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nurse-registration-form">
      <h3>Register New Nurse</h3>
      
      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="full_name">Full Name *</label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            placeholder="Enter full name"
            disabled={loading}
          />
          {errors.full_name && <span className="error-text">{errors.full_name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="phone_number">Phone Number *</label>
          <input
            type="tel"
            id="phone_number"
            name="phone_number"
            value={formData.phone_number}
            onChange={handleChange}
            placeholder="Enter phone number"
            maxLength="11"
            disabled={loading}
          />
          {errors.phone_number && <span className="error-text">{errors.phone_number}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="gender">Gender *</label>
          <select
            id="gender"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            disabled={loading}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          {errors.gender && <span className="error-text">{errors.gender}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="email">Email Address *</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email address"
            disabled={loading}
          />
          {errors.email && <span className="error-text">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="password">Password *</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter password (min 8 chars, uppercase, lowercase, numbers)"
            disabled={loading}
          />
          {errors.password && <span className="error-text">{errors.password}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="confirm_password">Confirm Password *</label>
          <input
            type="password"
            id="confirm_password"
            name="confirm_password"
            value={formData.confirm_password}
            onChange={handleChange}
            placeholder="Confirm password"
            disabled={loading}
          />
          {errors.confirm_password && <span className="error-text">{errors.confirm_password}</span>}
        </div>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Registering...' : 'Register Nurse'}
        </button>
      </form>
    </div>
  );
};

export default NurseRegistrationForm;
